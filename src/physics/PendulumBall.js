/**
 * ============================================================================
 * كلاس كرة النواس ثلاثية الأبعاد (PendulumBall)
 * ============================================================================
 * يمثل هذا الملف النموذج الرياضي والفيزياي لكرات النواس في الفضاء ثلاثي الأبعاد.
 * يصف هذا الكلاس الخصائص الحركية للكرة (الموقع والسرعة والتسارع) ويطبق معادلات 
 * الحركة المقيدة، بالإضافة إلى قوى السحب المغناطيسي/المرن (Spring Joint).
 * 
 * ----------------------------------------------------------------------------
 * 1. القوانين الفيزيائية المطبقة (Physical Laws Implemented):
 * ----------------------------------------------------------------------------
 *  أ. قانون نيوتن الثاني للحركة (Newton's Second Law of Motion):
 *     F_total = m * a  =>  a = F_total / m
 *     حيث يتم تجميع القوى المؤثرة (الجاذبية، مقاومة الهواء، وسحب الماوس) ثم حساب التسارع.
 * 
 *  ب. تسارع الجاذبية (Gravitational Acceleration):
 *     a_gravity = [0, -g, 0] (قوة سحب الجاذبية للأسفل على المحور Y).
 * 
 *  ج. تخامد مقاومة الهواء (Air Resistance Damping):
 *     F_drag = -b * v
 *     حيث يتم حساب التسارع التخميدي بقسمة القوة على الكتلة: a_drag = -(damping / mass) * v.
 * 
 *  د. قوة سحب الماوس المرنة (Hooke's Spring Joint Law):
 *     عند إمساك الكرة باليد وسحبها، لا يتم تعيين موقعها قسرياً، بل يتم ربطها بـ "زنبرك وهمي" 
 *     يسحبها نحو مؤشر الماوس (targetPos) طبقاً لقانون هوك المعدل مع مخمد اهتزاز:
 *     F_spring = -k * dx - c * v
 *     حيث:
 *     - k: معامل صلابة الزنبرك (Stiffness) ويعبر عن مدى سرعة وقوة استجابة الكرة للماوس.
 *     - c: معامل تخميد الاهتزاز (Damping) لمنع تذبذب الكرة بشكل عشوائي حول مؤشر الماوس.
 *     - dx: ناقل الإزاحة بين الموقع الحالي وموقع الماوس (pos - targetPos).
 * 
 *  هـ. تكامل أولر شبه الضمني (Semi-implicit Euler Integrator):
 *     طريقة تكامل عددية مستقرة طاقياً (Symplectic) لتحديث السرعة والموقع:
 *     v(t + dt) = v(t) + a(t) * dt
 *     x(t + dt) = x(t) + v(t + dt) * dt
 * 
 *  و. مبدأ دالمبير وقيود الخيط الصارمة (D'Alembert's Constraint & Spherical Projection):
 *     بما أن الكرة معلقة بخيط غير قابل للتمدد طوله L، يجب ألا تتغير المسافة بين الكرة ونقطة تعليقها.
 *     لذلك نقوم بـ:
 *     1. إسقاط الموقع (Position Projection):
 *        u = (pos - pivot) / ||pos - pivot|| (متجه وحدة اتجاه الخيط)
 *        pos_constrained = pivot + L * u
 *     2. إسقاط السرعة (Velocity Projection):
 *        للتخلص من أي سرعة تسحب الكرة خارج مسارها الدائري (تمدد الخيط)، نطرح مركبة السرعة الموازية للخيط:
 *        v_constrained = v - (v . u) * u
 * 
 *  ز. صمامات الأمان الرياضية (Mathematical Clamping):
 *     لحماية النواس من الدوران الكامل اللانهائي المسبب للأخطاء الرياضية، يتم حساب زاوية التأرجح:
 *     theta = acos(-y / L)
 *     وإذا تجاوزت 80 درجة (1.4 راديان)، يتم قص الإزاحة وتصفير السرعة.
 * ============================================================================
 */
export class PendulumBall {
  /**
   * تهيئة خصائص الكرة الحركية والفيزيائية
   * @param {number} index - مؤشر الكرة (من 0 إلى ballCount-1)
   * @param {number} ballCount - العدد الإجمالي للكرات لتوسيط النظام
   * @param {number} length - طول خيط التعليق (L) بالامتار
   * @param {number} mass - كتلة الكرة (m) بالكيلوغرام
   * @param {number} radius - نصف قطر الكرة (R) بالامتار
   */
  constructor(index, ballCount, length, mass, radius) {
    this.index = index;
    this.length = length; 
    this.mass = mass; 
    this.radius = radius; 

    // حساب نقطة التعليق الأفقية (Pivot X)
    // الكرات توزع بشكل متوازٍ بحيث تتلامس تماماً عند السكون، الفارق بين كل نقطتين هو القطر (2R)
    this.pivotX = (index - (ballCount - 1) / 2) * (radius * 2);

    // ناقلات الحالة الحركية (3D vectors): الموقع والسرعة
    this.pos = [this.pivotX, -this.length, 0];
    this.vel = [0, 0, 0];
  }

  /**
   * Getter: تحويل موقع الكرة ثلاثي الأبعاد إلى زاوية ثنائية الأبعاد theta (في مستوى XY)
   * @returns {number} الزاوية بالراديان
   */
  get theta() {
    const dx = this.pos[0] - this.pivotX;
    const dy = this.pos[1]; 
    return Math.atan2(dx, -dy);
  }

  /**
   * Setter: تهيئة موقع الكرة في مستوى 2D بناءً على زاوية مدخلة وتصفير سرعتها
   * @param {number} val - الزاوية المطلوبة بالراديان
   */
  set theta(val) {
    const x = this.pivotX + this.length * Math.sin(val);
    const y = -this.length * Math.cos(val);
    this.pos = [x, y, 0];
    this.vel = [0, 0, 0];
  }

  /**
   * Getter: حساب السرعة الزاوية omega التقديرية بناءً على ناقل السرعة ثلاثي الأبعاد
   * @returns {number} السرعة الزاوية براديان/ثانية
   */
  get omega() {
    const dx = this.pos[0] - this.pivotX;
    const dy = this.pos[1];
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return 0;
    
    // متجه المماس للدائرة المتشكلة في المستوى XY
    const tx = -dy / dist;
    const ty = dx / dist;
    const vTangent = this.vel[0] * tx + this.vel[1] * ty;
    return vTangent / this.length;
  }

  /**
   * Setter: تعيين السرعة الزاوية omega وتحويلها إلى متجهات سرعة خطية في مستوى XY
   * @param {number} val - السرعة الزاوية المطلوبة
   */
  set omega(val) {
    const dx = this.pos[0] - this.pivotX;
    const dy = this.pos[1];
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      const tx = -dy / dist;
      const ty = dx / dist;
      const vTangent = val * this.length;
      this.vel[0] = vTangent * tx;
      this.vel[1] = vTangent * ty;
      this.vel[2] = 0;
    }
  }

  /**
   * تحديث الحالة الحركية عبر الزمن خطوة بخطوة (Numerical Integration)
   * @param {number} dt - الخطوة الزمنية (delta time) بالثواني
   * @param {number} gravity - عجلة الجاذبية (g) بمتر/ثانية^2
   * @param {number} damping - معامل تخميد الهواء
   * @param {boolean} isDampingEnabled - ما إذا كان تخميد الهواء مفعلاً
   * @param {Array<number>|null} targetPos - إحداثيات موقع مؤشر الماوس لسحب الكرة مرناً [x, y, z]
   */
  integrate(dt, gravity, damping, isDampingEnabled, targetPos = null) {
    // 1. حساب قوى مقاومة الهواء والتخامد
    const dragCoeff = isDampingEnabled ? damping / this.mass : 0;
    
    let ax = -dragCoeff * this.vel[0];
    let ay = -gravity - dragCoeff * this.vel[1]; // الجاذبية تؤثر للأسفل على المحور Y
    let az = -dragCoeff * this.vel[2];

    // 2. تطبيق قوة الزنبرك لسحب الماوس (Spring Pull Force)
    if (targetPos) {
      const k = 250.0; // معامل صلابة الزنبرك (Spring Stiffness coefficient)
      const c = 15.0;  // معامل تخميد الزنبرك لمنع التذبذب العشوائي

      // حساب قوة السحب طبقاً للمسافة والسرعة: F = -k*x - c*v
      const springFx = -k * (this.pos[0] - targetPos[0]) - c * this.vel[0];
      const springFy = -k * (this.pos[1] - targetPos[1]) - c * this.vel[1];
      const springFz = -k * (this.pos[2] - targetPos[2]) - c * this.vel[2];
      
      // تحويل القوة لتسارع: a_spring = F_spring / m
      ax += springFx / this.mass;
      ay += springFy / this.mass;
      az += springFz / this.mass;
    }

    // 3. تحديث السرعة (Semi-implicit Euler)
    this.vel[0] += ax * dt;
    this.vel[1] += ay * dt;
    this.vel[2] += az * dt;

    // 4. تحديث الموقع
    this.pos[0] += this.vel[0] * dt;
    this.pos[1] += this.vel[1] * dt;
    this.pos[2] += this.vel[2] * dt;

    // 5. تطبيق قيود طول الخيط (3D Spherical Projection Constraint)
    const px = this.pivotX;
    const py = 0;
    const pz = 0;

    const dx = this.pos[0] - px;
    const dy = this.pos[1] - py;
    const dz = this.pos[2] - pz;
    const currentDist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (currentDist > 0) {
      const ux = dx / currentDist;
      const uy = dy / currentDist;
      const uz = dz / currentDist;

      // أ. إسقاط الموقع على سطح الكرة للتأكد من ثبات طول الخيط
      this.pos[0] = px + ux * this.length;
      this.pos[1] = py + uy * this.length;
      this.pos[2] = pz + uz * this.length;

      // ب. إسقاط السرعة لحذف مركبة التمدد الطولية والحفاظ على الحركة المماسية فقط
      const vDotU = this.vel[0] * ux + this.vel[1] * uy + this.vel[2] * uz;
      this.vel[0] -= vDotU * ux;
      this.vel[1] -= vDotU * uy;
      this.vel[2] -= vDotU * uz;
    }

    // 6. تطبيق صمامات الأمان
    this.applySafetyConstraints();
  }

  /**
   * صمامات الأمان الرياضية لمنع الكرة من الارتفاع التام وتجاوز زوايا الحركة الخطرة
   * تقوم بقص زاوية الحركة عند 80 درجة لمنع الانهيار الرقمي
   */
  applySafetyConstraints() {
    const cosAngle = -this.pos[1] / this.length;
    const angle = Math.acos(Math.max(-1.0, Math.min(1.0, cosAngle)));
    const MAX_THETA = 1.4; // حوالي 80 درجة

    if (angle > MAX_THETA) {
      const px = this.pivotX;
      const dx = this.pos[0] - px;
      const dy = this.pos[1];
      const dz = this.pos[2];

      const horizontalDist = Math.sqrt(dx * dx + dz * dz);
      if (horizontalDist > 0) {
        const clampedHorizontalDist = this.length * Math.sin(MAX_THETA);
        const clampedY = -this.length * Math.cos(MAX_THETA);

        this.pos[0] = px + (dx / horizontalDist) * clampedHorizontalDist;
        this.pos[1] = clampedY;
        this.pos[2] = (dz / horizontalDist) * clampedHorizontalDist;

        // تصفير السرعة لمنع تراكم طاقة وهمية خارج الحدود
        this.vel = [0, 0, 0];
      }
    }
  }
}
