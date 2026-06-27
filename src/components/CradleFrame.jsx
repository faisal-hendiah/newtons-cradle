import React from "react";

const CradleFrame = ({ ballCount, ballRadius, length }) => {
  const width = (ballCount + 1) * ballRadius * 2;

  // 🛠️ التعديل الرياضي الدقيق: ربط الارتفاع بطول الخيط ليقفل أسفل القاعدة عند مستوى الأرضية تماماً
  const height = length + 1.0;

  // العمق متوافق تماماً مع حبال البندول (depth = 3)
  const depth = 5;
  const thickness = 0.15;

  return (
    <group position={[0, length, 0]}>
      {/* Top Bars (Horizontal) */}
      <mesh position={[0, 0, depth / 2]}>
        <boxGeometry args={[width + thickness, thickness, thickness]} />
        <meshStandardMaterial color="#666" metalness={1.0} roughness={0.1} />
      </mesh>
      <mesh position={[0, 0, -depth / 2]}>
        <boxGeometry args={[width + thickness, thickness, thickness]} />
        <meshStandardMaterial color="#666" metalness={1.0} roughness={0.1} />
      </mesh>

      {/* 4 Pillars (Vertical) */}
      <mesh position={[width / 2, -height / 2, depth / 2]}>
        <boxGeometry args={[thickness, height, thickness]} />
        <meshStandardMaterial color="#666" metalness={1.0} roughness={0.1} />
      </mesh>
      <mesh position={[-width / 2, -height / 2, depth / 2]}>
        <boxGeometry args={[thickness, height, thickness]} />
        <meshStandardMaterial color="#666" metalness={1.0} roughness={0.1} />
      </mesh>
      <mesh position={[width / 2, -height / 2, -depth / 2]}>
        <boxGeometry args={[thickness, height, thickness]} />
        <meshStandardMaterial color="#666" metalness={1.0} roughness={0.1} />
      </mesh>
      <mesh position={[-width / 2, -height / 2, -depth / 2]}>
        <boxGeometry args={[thickness, height, thickness]} />
        <meshStandardMaterial color="#666" metalness={1.0} roughness={0.1} />
      </mesh>

      {/* Base Platform */}
      <mesh position={[0, -height, 0]}>
        <boxGeometry args={[width + 1, 0.2, depth + 1]} />
        <meshStandardMaterial color="#111" metalness={0.5} roughness={0.8} />
      </mesh>
    </group>
  );
};

export default CradleFrame;
