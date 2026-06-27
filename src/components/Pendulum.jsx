import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";

const Pendulum = ({ theta, length, radius, pivotX, pivotY, onPointerDown }) => {
  const groupRef = useRef();

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.z = theta;
    }
  });

  // حسابات الخيوط المزدوجة (V-Shape)
  const frameDepth = 5;
  const zOffset = frameDepth / 2;
  const stringLength = Math.sqrt(length * length + zOffset * zOffset);
  const angleX = Math.atan2(zOffset, length); // زاوية الميلان

  return (
    <group position={[pivotX, pivotY, 0]} ref={groupRef}>
      {/* الخيط الأمامي */}
      <mesh position={[0, -length / 2, zOffset / 2]} rotation={[angleX, 0, 0]}>
        <cylinderGeometry args={[0.015, 0.015, stringLength, 8]} />
        <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* الخيط الخلفي */}
      <mesh
        position={[0, -length / 2, -zOffset / 2]}
        rotation={[-angleX, 0, 0]}>
        <cylinderGeometry args={[0.015, 0.015, stringLength, 8]} />
        <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* الكرة */}
      <mesh
        position={[0, -length, 0]}
        onPointerDown={e => {
          e.stopPropagation();
          onPointerDown();
        }}
        onPointerOver={() => (document.body.style.cursor = "grab")}
        onPointerOut={() => (document.body.style.cursor = "auto")}>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial color="#eee" metalness={1.0} roughness={0.1} />
      </mesh>
    </group>
  );
};

export default Pendulum;
