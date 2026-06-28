import { useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  PerspectiveCamera,
  Environment,
  ContactShadows
} from "@react-three/drei";
import { useSelector } from "react-redux";
import * as THREE from "three";
import { NewtonEngine } from "../physics/Engine";
import Pendulum from "./Pendulum";
import CradleFrame from "./CradleFrame";

// --- إعداد مدير الصوت المتقدم ---
class AudioManager {
  constructor() {
    this.audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    this.audioBuffer = null;
    this.isLoaded = false;
    this.loadSound("/clack.mp3");
  }

  async loadSound(url) {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.isLoaded = true;
    } catch (e) {
      console.error("Error loading sound:", e);
    }
  }

  play(volume) {
    if (!this.isLoaded || !this.audioBuffer) return;
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }
    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();
    source.buffer = this.audioBuffer;
    gainNode.gain.value = volume;
    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    source.start(0);
  }
}

const audioManager = new AudioManager();

const Simulation = ({ onGrabChange }) => {
  const config = useSelector(state => state.simulation);
  const engineRef = null || useRef(null);
  const [ballPositions, setBallPositions] = useState([]);

  const grabbedBallRef = useRef(null);
  const clickOffsetRef = useRef(new THREE.Vector3());
  const targetPosRef = useRef(null); // المؤشر الهدف لزنبرك سحب الماوس
  
  const isDraggingRef = useRef(false); // حالة السحب الفعلية (فقط إذا تحرك الماوس)
  const initialMouseRef = useRef(new THREE.Vector2()); // موضع الماوس الثنائي الأبعاد عند الضغط

  const { mouse } = useThree();

  useEffect(() => {
    const handlePointerUp = () => {
      grabbedBallRef.current = null;
      targetPosRef.current = null;
      isDraggingRef.current = false;
      onGrabChange(false);
      document.body.style.cursor = "auto";

      if (audioManager.audioContext.state === "suspended") {
        audioManager.audioContext.resume();
      }
    };

    const unlockAudio = () => {
      if (audioManager.audioContext.state === "suspended") {
        audioManager.audioContext.resume();
      }
    };

    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointerdown", unlockAudio);
    return () => {
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointerdown", unlockAudio);
    };
  }, [onGrabChange]);

  useEffect(() => {
    if (!engineRef.current) {
      engineRef.current = new NewtonEngine(config);
    } else {
      engineRef.current.reinitialize(config);
    }
    setBallPositions(engineRef.current.balls.map(b => [...b.pos]));
  }, [config.ballCount, config.lengths, config.resetVersion]);

  useEffect(() => {
    if (engineRef.current && config.stopVersion > 0) {
      engineRef.current.balls.forEach(b => {
        b.pos = [b.pivotX, -b.length, 0];
        b.vel = [0, 0, 0];
      });
      setBallPositions(engineRef.current.balls.map(b => [...b.pos]));
      grabbedBallRef.current = null;
      targetPosRef.current = null;
      isDraggingRef.current = false;
      onGrabChange(false);
    }
  }, [config.stopVersion, onGrabChange]);

  const handlePointerDown = (index, event) => {
    grabbedBallRef.current = index;
    onGrabChange(true);
    isDraggingRef.current = false; // إعادة ضبط حالة السحب
    initialMouseRef.current.set(mouse.x, mouse.y); // حفظ الموقع الثنائي للمشهد

    const ball = engineRef.current.balls[index];
    const clickPoint = event.point; // نقطة التقاطع ثلاثية الأبعاد
    
    // حساب فارق المسافة بين موقع الكرة الفعلي ونقطة اللمس لتفادي القفز المفاجئ
    clickOffsetRef.current.set(
      ball.pos[0] - clickPoint.x,
      ball.pos[1] - clickPoint.y,
      ball.pos[2] - clickPoint.z
    );
  };

  useFrame((state, delta) => {
    if (!engineRef.current) return;

    // 1. معالجة سحب الكرة بالماوس في الفضاء ثلاثي الأبعاد
    if (grabbedBallRef.current !== null) {
      // تفحص ما إذا كان الماوس قد تحرك كفاية لاعتبار العملية سحباً فعلياً
      if (!isDraggingRef.current) {
        const dist = initialMouseRef.current.distanceTo(state.mouse);
        if (dist > 0.02) { // 2% حركة من مساحة الشاشة لتفادي التحرك بمجرد النقر
          isDraggingRef.current = true;
        }
      }

      if (isDraggingRef.current) {
        document.body.style.cursor = "grabbing";
        const index = grabbedBallRef.current;
        const ball = engineRef.current.balls[index];

        // إسقاط شعاع الماوس على مستوى أفقي يمر بمستوى تعليق الكرة
        const raycaster = state.raycaster;
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), ball.length);
        const target = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, target);

        // تطبيق الفارق المجموع
        const targetX = target.x + clickOffsetRef.current.x;
        const targetY = target.y + clickOffsetRef.current.y;
        const targetZ = target.z + clickOffsetRef.current.z;

        // تعيين الإحداثيات الهدف للزنبرك بدلاً من تغيير الموقع بشكل فوري صلب
        targetPosRef.current = [targetX, targetY, targetZ];
      }
    }

    // 2. المحرك الفيزيائي مع خطوة زمنية ثابتة
    const fixedSubDt = 0.004;
    const renderDelta = delta * config.timeScale;

    const contextTime = Math.min(renderDelta, 0.1);
    const numberOfSteps = Math.floor(contextTime / fixedSubDt);

    let totalCollisions = [];

    for (let i = 0; i < numberOfSteps; i++) {
      // نمرر المؤشر الهدف للزنبرك كمعامل رابع لتطبيق التحديث
      const stepCollisions = engineRef.current.update(
        fixedSubDt, 
        config, 
        grabbedBallRef.current, 
        targetPosRef.current
      );
      totalCollisions = [...totalCollisions, ...stepCollisions];
    }

    // 3. تشغيل الصوت
    // نفصل الصوت المترتب على التصادمات الممسوخة يدويًا
    if (totalCollisions.length > 0) {
      const maxIntensity = Math.max(...totalCollisions);
      const volume = Math.min(maxIntensity / 3, 1.0);

      if (volume > 0.05) {
        audioManager.play(volume);
      }
    }

    // 4. تحديث المصفوفة لإعادة رسم واجهة React
    setBallPositions(engineRef.current.balls.map(b => [...b.pos]));
  });

  useEffect(() => {
    if (
      engineRef.current &&
      engineRef.current.balls.length >= config.liftedBalls
    ) {
      for (let i = 0; i < config.liftedBalls; i++) {
        engineRef.current.setBallTheta(i, -Math.PI / 4);
      }
    }
  }, [config.resetVersion, config.ballCount, config.liftedBalls]);

  return (
    <group>
      <CradleFrame
        ballCount={config.ballCount}
        ballRadius={config.ballRadius}
        length={Math.max(...config.lengths)}
      />
      {config.lengths.slice(0, config.ballCount).map((length, i) => {
        const pivotX =
          (i - (config.ballCount - 1) / 2) * (config.ballRadius * 2);

        return (
          <Pendulum
            key={i}
            pos={ballPositions[i] || [pivotX, -length, 0]}
            length={length}
            radius={config.ballRadius}
            pivotX={pivotX}
            pivotY={Math.max(...config.lengths)}
            onPointerDown={(e) => handlePointerDown(i, e)}
          />
        );
      })}
    </group>
  );
};

const Scene = () => {
  const [grabbed, setGrabbed] = useState(false);

  return (
    <Canvas shadows>
      <PerspectiveCamera makeDefault position={[0, 5, 12]} fov={50} />
      <OrbitControls
        makeDefault
        minDistance={5}
        maxDistance={25}
        enabled={!grabbed}
      />

      <ambientLight intensity={0.5} />
      <spotLight position={[10, 15, 10]} angle={0.3} penumbra={1} castShadow />
      <Environment preset="city" />

      <Simulation onGrabChange={setGrabbed} />

      <ContactShadows
        position={[0, -1, 0]}
        opacity={0.4}
        scale={20}
        blur={2}
        far={4.5}
      />

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.1, 0]}
        receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#111" roughness={1} />
      </mesh>
    </Canvas>
  );
};

export default Scene;
