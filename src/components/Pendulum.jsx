import { useMemo } from "react";
import * as THREE from "three";

const Pendulum = ({
  pos,
  radius,
  pivotX,
  pivotY,
  is3DMode,
  onPointerDown
}) => {
  const [absX, y, z] = pos;
  const x = absX - pivotX; // التحويل من الإحداثيات العالمية إلى المحلية بالنسبة لـ pivotX

  const frameDepth = 6;
  const zOffset = frameDepth / 2;

  // حساب مواقع واتجاهات الخيوط المزدوجة في الفضاء ثلاثي الأبعاد
  const stringData = useMemo(() => {
    // 1. حسابات الخيط الأمامي (2D)
    const vFront = new THREE.Vector3(x, y, z - zOffset);
    const lenFront = vFront.length();
    const qFront = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      vFront.clone().normalize()
    );
    const pFront = [x / 2, y / 2, (zOffset + z) / 2];

    // 2. حسابات الخيط الخلفي (2D)
    const vBack = new THREE.Vector3(x, y, z + zOffset);
    const lenBack = vBack.length();
    const qBack = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      vBack.clone().normalize()
    );
    const pBack = [x / 2, y / 2, (-zOffset + z) / 2];

    // 3. 🌟 حسابات الخيط المفرد الجديد للـ 3D 🌟
    const vSingle = new THREE.Vector3(x, y, z);
    const lenSingle = vSingle.length();
    const qSingle = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      vSingle.clone().normalize()
    );
    const pSingle = [x / 2, y / 2, z / 2];

    return {
      lenFront,
      qFront,
      pFront,
      lenBack,
      qBack,
      pBack,
      lenSingle,
      qSingle,
      pSingle
    };
  }, [x, y, z, zOffset]);

  return (
    <group position={[pivotX, pivotY, 0]}>
      {is3DMode ? (
        /* 🧵 رسم خيط واحد فقط للـ 3D باستخدام معلومات single */
        <mesh position={stringData.pSingle} quaternion={stringData.qSingle}>
          <cylinderGeometry args={[0.015, 0.015, stringData.lenSingle, 8]} />
          <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
        </mesh>
      ) : (
        /* 📐 رسم الخيطين المزدوجين للـ 2D */
        <>
          <mesh position={stringData.pFront} quaternion={stringData.qFront}>
            <cylinderGeometry args={[0.015, 0.015, stringData.lenFront, 8]} />
            <meshStandardMaterial
              color="#888"
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>
          <mesh position={stringData.pBack} quaternion={stringData.qBack}>
            <cylinderGeometry args={[0.015, 0.015, stringData.lenBack, 8]} />
            <meshStandardMaterial
              color="#888"
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>
        </>
      )}

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
