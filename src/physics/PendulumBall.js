/**
 * ============================================================================
 * PendulumBall Class
 * ============================================================================
 * يمثل هذا الكلاس كياناً مستقلاً لكرة واحدة (نواس ثقلي بسيط).
 * مسؤوليته:
 * 1. الاحتفاظ ببيانات الحالة الحركية للكرة (الزاوية، السرعة، التسارع).
 * 2. تطبيق معادلة الحركة التفاضلية للنواس.
 * 3. تنفيذ خوارزمية التكامل العددي (Semi-implicit Euler) لتحديث الموقع.
 * 4. تطبيق قيود الأمان (Safety Constraints) لمنع الانهيار الرياضي.
 * ============================================================================
 */
export class PendulumBall {
  constructor(index, ballCount, length, mass, radius) {
    this.theta = 0; // المطال الزاوي الابتدائي (الزاوية بالراديان)
    this.omega = 0; // السرعة الزاوية الابتدائية (راديان/ثانية)
    this.alpha = 0; // التسارع الزاوي الابتدائي (راديان/ثانية^2)
    this.length = length; // طول خيط التعليق (L)
    this.mass = mass; // كتلة الكرة (m)
    this.radius = radius; // نصف قطر الكرة المعدنية (R)

    // حساب الموضع الأفقي لنقطة تعليق هذه الكرة (Pivot X)
    // القانون: يتوزع التعليق بانتظام بحيث تكون المسافة بين كل خيطين تساوي قطر الكرة (2R)
    // "معادلة التوسيط"
    this.pivotX = (index - (ballCount - 1) / 2) * (radius * 2);
  }

  /**
   * حساب وتحديث الحركة (Integration Step)
   * يتم استدعاؤها في كل جزء صغير من الثانية (dt)
   */
  integrate(dt, gravity, damping, isDampingEnabled) {
    // 1. حساب قوة الإخماد (مقاومة الهواء)
    // القانون: F_drag = -b * v. هنا نحولها لتسارع تخميدي مقسوم على الكتلة.
    const airResistance = isDampingEnabled
      ? (damping / this.mass) * this.omega
      : 0;

    // 2. المعادلة التفاضلية الأساسية للنواس الثقلي البسيط
    // القانون الفيزيائي: Σ Γ = I * α  =>  -m*g*L*sin(θ) = m*L^2 * α
    // بتبسيط المعادلة وعزل التسارع: α = -(g/L) * sin(θ)
    this.alpha =
      -(gravity / this.length) * Math.sin(this.theta) - airResistance;

    // 3. التكامل العددي: أولر شبه الضمني (Semi-implicit Euler)
    // الخطوة الأولى: تحديث السرعة بناءً على التسارع الجديد
    this.omega += this.alpha * dt;

    // الخطوة الثانية: تحديث الزاوية بناءً على السرعة المحدثة (وليس القديمة)
    // هذا الترتيب هو ما يعطي الخوارزمية استقرارها ويحفظ الطاقة (Symplectic behavior)
    this.theta += this.omega * dt;

    // 4. تطبيق صمامات الأمان بعد التحديث
    this.applySafetyConstraints();
  }

  /**
   * صمامات الأمان الرياضية (Mathematical Clamping & Sleeping)
   */
  applySafetyConstraints() {
    // الحد الأقصى المسموح للزاوية (حوالي 80 درجة) لمنع انتقال الدالة الجيبية لمناطق غير مستقرة
    const MAX_THETA = 1.4;

    if (this.theta > MAX_THETA) {
      this.theta = MAX_THETA; // قص الزاوية جبرياً
      this.omega = 0; // إفراغ السرعة لمنع تراكم الطاقة
    } else if (this.theta < -MAX_THETA) {
      this.theta = -MAX_THETA;
      this.omega = 0;
    }

    // خوارزمية السكون (Sleeping Threshold)
    // إذا تضاءلت الطاقة الحركية والكامنة لأرقام مجهرية لا ترى بالعين، نوقف الكرة تماماً
    // هذا يخفف العبء الحسابي ويمنع التأرجح اللانهائي الوهمي.
    if (Math.abs(this.omega) < 0.001 && Math.abs(this.theta) < 0.001) {
      this.omega = 0;
      this.theta = 0;
      this.alpha = 0;
    }
  }
}
