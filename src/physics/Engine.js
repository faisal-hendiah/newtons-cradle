import { PendulumBall } from "./PendulumBall.js";
import { PhysicsMath } from "./PhysicsMath.js";

/**
 * ============================================================================
 * NewtonEngine Class
 * ============================================================================
 * المحرك الفيزيائي المركزي (The Core Orchestrator).
 * مسؤوليته:
 * 1. تهيئة النظام وإنشاء قائمة الكرات.
 * 2. دفع عجلة الزمن للأمام (Tick) عبر استدعاء دوال التكامل لكل كرة.
 * 3. اكتشاف التصادمات (Collision Detection) في كل إطار زمني.
 * 4. إدارة دورة الإصلاح التكراري (Iterative Resolution) لانتقال النبضات.
 * ============================================================================
 */
export class NewtonEngine {
  constructor(config) {
    this.reinitialize(config);
  }

  /**
   * دالة إعادة ضبط المصنع (تهيئة الكرات بناءً على الإعدادات)
   */
  reinitialize(config) {
    const { ballCount, length, mass, ballRadius } = config;

    this.balls = []; // 1. نجهز مصفوفة فارغة

    // 2. نفتح حلقة تبدأ من الصفر وتنتهي عند عدد الكرات
    for (let i = 0; i < ballCount; i++) {
      // 3. في كل لفة، ننشئ كرة جديدة
      let newBall = new PendulumBall(i, ballCount, length, mass, ballRadius);

      // 4. نضع الكرة داخل المصفوفة
      this.balls.push(newBall);
    }
  }

  /**
   * الحلقة الرئيسية للمحرك (Main Physics Loop)
   */
  update(dt, params) {
    const { gravity, restitution, isDampingEnabled, damping } = params;
    const collisions = []; // مصفوفة لتخزين شدة الصدمات (لتشغيل الصوت)

    // المرحلة 1: خطوة التكامل المستقلة (Integration Step)
    // كل كرة تحسب موقعها الجديد بشكل مستقل بناءً على الجاذبية وسرعتها
    for (const ball of this.balls) {
      ball.integrate(dt, gravity, damping, isDampingEnabled);
    }

    // المرحلة 2: اكتشاف وحل التصادمات (Iterative Collision Resolution)
    // التكرار (iterations = 10) ضروري جداً! لأنه يسمح بمرور "موجة كمية الحركة"
    // عبر الكرات الوسطى في نفس الإطار الزمني لتنطلق الكرة الأخيرة فوراً.
    const iterations = 10;
    for (let iter = 0; iter < iterations; iter++) {
      // فحص كل زوج متجاور من الكرات
      for (let i = 0; i < this.balls.length - 1; i++) {
        const b1 = this.balls[i];
        const b2 = this.balls[i + 1];

        // 1. حساب الموقع الأفقي (X) الحالي لكل كرة باستخدام الهندسة المثلثية
        const x1 = b1.pivotX + b1.length * Math.sin(b1.theta);
        const x2 = b2.pivotX + b2.length * Math.sin(b2.theta);

        // 2. المسافة الحالية بين مركزي الكرتين
        const distance = x2 - x1;

        // 3. المسافة الصغرى المسموحة (مجموع نصفي القطرين)
        const minDistance = b1.radius + b2.radius;

        // اكتشاف التداخل (Broad-phase Detection)
        if (distance < minDistance) {
          // حساب السرعة النسبية بين الكرتين لتقدير شدة الصدمة (للصوتيات)
          const relativeVelocity = Math.abs(
            b1.omega * b1.length - b2.omega * b2.length,
          );

          // استدعاء دالة الرياضيات لحل الصدم (تبادل السرعات)
          const collided = PhysicsMath.resolveElasticCollision(
            b1,
            b2,
            restitution,
          );

          // تسجيل الصدمة لتشغيل الصوت (فقط في التكرار الأول لعدم تكرار الصوت)
          if (collided && iter === 0 && relativeVelocity > 0.1) {
            collisions.push(relativeVelocity);
          }

          // استدعاء دالة الرياضيات لفك التداخل البصري
          // (يتم تفعيلها فقط إذا كان التخامد مفعلاً، للحفاظ على دقة الاختبار الرياضي النقي)
          if (isDampingEnabled) {
            PhysicsMath.resolveOverlap(b1, b2, minDistance, distance);
          }
        }
      }
    }

    // إعادة قائمة الصدمات ليتعامل معها واجهة الصوت (Audio Manager)
    return collisions;
  }

  /**
   * دالة واجهة المستخدم (User Interaction)
   * تسمح للمستخدم بسحب الكرة وتحديد زاويتها بشكل قسري مع تصفير سرعتها
   */
  setBallTheta(index, theta) {
    if (this.balls[index]) {
      this.balls[index].theta = theta;
      this.balls[index].omega = 0; // تفريغ السرعة أثناء الإمساك
    }
  }
}
