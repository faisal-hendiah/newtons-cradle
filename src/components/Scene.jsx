import { useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  PerspectiveCamera,
  Environment,
  ContactShadows
} from "@react-three/drei";
import { useSelector } from "react-redux";
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
  const engineRef = useRef(null);
  const [ballThetas, setBallThetas] = useState([]);

  const grabbedBallRef = useRef(null);
  const thetaOffsetRef = useRef(0);

  const { mouse, viewport, camera } = useThree();

  useEffect(() => {
    const handlePointerUp = () => {
      grabbedBallRef.current = null;
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
    setBallThetas(engineRef.current.balls.map(b => b.theta));
  }, [config.ballCount, config.lengths, config.resetVersion]);

  useEffect(() => {
    if (engineRef.current && config.stopVersion > 0) {
      engineRef.current.balls.forEach(b => {
        b.theta = 0;
        b.omega = 0;
        b.alpha = 0;
      });
      setBallThetas(engineRef.current.balls.map(b => b.theta));
      grabbedBallRef.current = null;
      onGrabChange(false);
    }
  }, [config.stopVersion, onGrabChange]);

  const handlePointerDown = index => {
    grabbedBallRef.current = index;
    onGrabChange(true);

    const ball = engineRef.current.balls[index];
    const zDepth = camera.position.z;
    const mouseX = (mouse.x * viewport.width * (zDepth / 12)) / 2;
    const dx = mouseX - ball.pivotX;

    // حفظ فارق الزاوية لمنع قفزة الكرة عند اللمس
    const mouseTheta = Math.asin(
      Math.max(-0.99, Math.min(0.99, dx / ball.length))
    );
    thetaOffsetRef.current = ball.theta - mouseTheta;
  };

  // 🛠️ تم إعادة دالة useFrame ودمج التحديث الزمني الثابت بداخلها
  useFrame((state, delta) => {
    if (!engineRef.current) return;

    // 1. معالجة سحب الكرة بالماوس
    if (grabbedBallRef.current !== null) {
      document.body.style.cursor = "grabbing";
      const index = grabbedBallRef.current;
      const ball = engineRef.current.balls[index];

      const zDepth = camera.position.z;
      const mouseX = (mouse.x * viewport.width * (zDepth / 12)) / 2;
      const dx = mouseX - ball.pivotX;

      const rawMouseTheta = Math.asin(
        Math.max(-0.99, Math.min(0.99, dx / ball.length))
      );
      let targetTheta = rawMouseTheta + thetaOffsetRef.current;

      const maxAngle = Math.PI / 3; // تقييد الحركة بـ 60 درجة كحد أقصى
      targetTheta = Math.max(-maxAngle, Math.min(maxAngle, targetTheta));

      engineRef.current.setBallTheta(index, targetTheta);
    }

    // 2. المحرك الفيزيائي مع خطوة زمنية ثابتة (Fixed Time Step)
    const fixedSubDt = 0.004; // دقة فيزيائية ثابتة (4 ميلي ثانية)
    const renderDelta = delta * config.timeScale;

    // حماية ضد تأخر المتصفح (Lag Spike Protection)
    const contextTime = Math.min(renderDelta, 0.1);
    const numberOfSteps = Math.floor(contextTime / fixedSubDt);

    let totalCollisions = [];

    // تحديث الفيزياء بخطوات متتالية وصارمة
    for (let i = 0; i < numberOfSteps; i++) {
      const stepCollisions = engineRef.current.update(fixedSubDt, config);
      totalCollisions = [...totalCollisions, ...stepCollisions];
    }

    // 3. تشغيل الصوت
    if (totalCollisions.length > 0 && grabbedBallRef.current === null) {
      const maxIntensity = Math.max(...totalCollisions);
      const volume = Math.min(maxIntensity / 3, 1.0);

      if (volume > 0.02) {
        audioManager.play(volume);
      }
    }

    // 4. تحديث المصفوفة لإعادة رسم واجهة React
    setBallThetas(engineRef.current.balls.map(b => b.theta));
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
        // حساب موقع التعليق لكل كرة بنفس طريقة المحرك
        const pivotX =
          (i - (config.ballCount - 1) / 2) * (config.ballRadius * 2);

        return (
          <Pendulum
            key={i}
            theta={ballThetas[i] || 0}
            length={length}
            radius={config.ballRadius}
            pivotX={pivotX}
            pivotY={Math.max(...config.lengths)}
            onPointerDown={() => handlePointerDown(i)}
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
