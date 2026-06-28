
const CradleFrame = ({ ballCount, ballRadius, length, is3DMode }) => {
  // العرض الأساسي الذي تشغله الكرات وهي متراصة
  const coreWidth = (ballCount + 1) * ballRadius * 2;
  
  // 🌟 التعديل 1: توسيع الإطار بشكل كبير من الجوانب لضمان مساحة حرة للكرات
  const frameWidth = coreWidth + (ballRadius * 6); 

  const height = length + 1.0;
  const depth = 6; // زيادة العمق لضمان قاعدة ارتكاز واسعة جداً
  const thickness = 0.15;

  // 🌟 التعديل 2: حسابات المثلثات لشكل حرف A (طول الوتر وزاوية الميلان)
  const pillarLength = Math.sqrt(height * height + (depth / 2) * (depth / 2));
  const angleX = Math.atan2(depth / 2, height);

  return (
    <group position={[0, length, 0]}>
      
      {is3DMode ? (
        /* 🌟 الهيكل الخاص بوضع 3D (شكل حرف A المائل لتوازن ميكانيكي مثالي) 🌟 */
        <group>
          {/* الشريط العلوي الأوسط */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[frameWidth + thickness, thickness, thickness]} />
            <meshStandardMaterial color="#666" metalness={1.0} roughness={0.1} />
          </mesh>
          
          {/* عمودان يمين (أمامي وخلفي) يميلان ليلتقيا في الأعلى */}
          <mesh position={[frameWidth / 2, -height / 2, depth / 4]} rotation={[-angleX, 0, 0]}>
            <boxGeometry args={[thickness, pillarLength, thickness]} />
            <meshStandardMaterial color="#666" metalness={1.0} roughness={0.1} />
          </mesh>
          <mesh position={[frameWidth / 2, -height / 2, -depth / 4]} rotation={[angleX, 0, 0]}>
            <boxGeometry args={[thickness, pillarLength, thickness]} />
            <meshStandardMaterial color="#666" metalness={1.0} roughness={0.1} />
          </mesh>

          {/* عمودان يسار (أمامي وخلفي) يميلان ليلتقيا في الأعلى */}
          <mesh position={[-frameWidth / 2, -height / 2, depth / 4]} rotation={[-angleX, 0, 0]}>
            <boxGeometry args={[thickness, pillarLength, thickness]} />
            <meshStandardMaterial color="#666" metalness={1.0} roughness={0.1} />
          </mesh>
          <mesh position={[-frameWidth / 2, -height / 2, -depth / 4]} rotation={[angleX, 0, 0]}>
            <boxGeometry args={[thickness, pillarLength, thickness]} />
            <meshStandardMaterial color="#666" metalness={1.0} roughness={0.1} />
          </mesh>
        </group>
      ) : (
        /* 📐 الهيكل الخاص بوضع 2D (شريطين و 4 أعمدة مستقيمة) 📐 */
        <group>
          <mesh position={[0, 0, depth / 2]}>
            <boxGeometry args={[frameWidth + thickness, thickness, thickness]} />
            <meshStandardMaterial color="#666" metalness={1.0} roughness={0.1} />
          </mesh>
          <mesh position={[0, 0, -depth / 2]}>
            <boxGeometry args={[frameWidth + thickness, thickness, thickness]} />
            <meshStandardMaterial color="#666" metalness={1.0} roughness={0.1} />
          </mesh>

          <mesh position={[frameWidth / 2, -height / 2, depth / 2]}>
            <boxGeometry args={[thickness, height, thickness]} />
            <meshStandardMaterial color="#666" metalness={1.0} roughness={0.1} />
          </mesh>
          <mesh position={[-frameWidth / 2, -height / 2, depth / 2]}>
            <boxGeometry args={[thickness, height, thickness]} />
            <meshStandardMaterial color="#666" metalness={1.0} roughness={0.1} />
          </mesh>
          <mesh position={[frameWidth / 2, -height / 2, -depth / 2]}>
            <boxGeometry args={[thickness, height, thickness]} />
            <meshStandardMaterial color="#666" metalness={1.0} roughness={0.1} />
          </mesh>
          <mesh position={[-frameWidth / 2, -height / 2, -depth / 2]}>
            <boxGeometry args={[thickness, height, thickness]} />
            <meshStandardMaterial color="#666" metalness={1.0} roughness={0.1} />
          </mesh>
        </group>
      )}

      {/* القاعدة السفلية */}
      <mesh position={[0, -height, 0]}>
        <boxGeometry args={[frameWidth + 2, 0.2, depth + 2]} />
        <meshStandardMaterial color="#111" metalness={0.5} roughness={0.8} />
      </mesh>
      
    </group>
  );
};

export default CradleFrame;