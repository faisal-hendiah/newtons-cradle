import React, { useMemo } from "react";
import * as THREE from "three";

const Pendulum = ({ pos, length, radius, pivotX, pivotY, onPointerDown }) => {
  const [absX, y, z] = pos;
  const x = absX - pivotX; // التحويل من الإحداثيات العالمية إلى المحلية بالنسبة لـ pivotX

  const frameDepth = 5;
  const zOffset = frameDepth / 2;

  // حساب مواقع واتجاهات الخيوط المزدوجة في الفضاء ثلاثي الأبعاد
  const stringData = useMemo(() => {
    // 1. الخيط الأمامي (من التعليق الأمامي إلى الكرة)
    const vFront = new THREE.Vector3(x, y, z - zOffset);
    const lenFront = vFront.length();
    const qFront = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      vFront.clone().normalize()
    );
    const pFront = [x / 2, y / 2, (zOffset + z) / 2];

    // 2. الخيط الخلفي (من التعليق الخلفي إلى الكرة)
    const vBack = new THREE.Vector3(x, y, z + zOffset);
    const lenBack = vBack.length();
    const qBack = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      vBack.clone().normalize()
    );
    const pBack = [x / 2, y / 2, (-zOffset + z) / 2];

    return { lenFront, qFront, pFront, lenBack, qBack, pBack };
  }, [x, y, z, zOffset]);

  return (
    <group position={[pivotX, pivotY, 0]}>
      {/* الخيط الأمامي */}
      <mesh position={stringData.pFront} quaternion={stringData.qFront}>
        <cylinderGeometry args={[0.015, 0.015, stringData.lenFront, 8]} />
        <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* الخيط الخلفي */}
      <mesh position={stringData.pBack} quaternion={stringData.qBack}>
        <cylinderGeometry args={[0.015, 0.015, stringData.lenBack, 8]} />
        <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* الكرة */}
      <mesh
        position={[x, y, z]}
        onPointerDown={e => {
          e.stopPropagation();
          onPointerDown(e);
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
