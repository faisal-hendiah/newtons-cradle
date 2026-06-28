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
    const { ballCount, lengths, length, mass, masses, ballRadius } = config;

    this.balls = []; // 1. نجهز مصفوفة فارغة

    // 2. نفتح حلقة تبدأ من الصفر وتنتهي عند عدد الكرات
    for (let i = 0; i < ballCount; i++) {
      // 3. في كل لفة، ننشئ كرة جديدة (ندعم الكتل الفردية والأطوال الفردية)
      const ballMass =
        masses && masses[i] !== undefined ? masses[i] : mass || 1.0;
      const ballLength =
        lengths && lengths[i] !== undefined ? lengths[i] : length || 5.0;
      let newBall = new PendulumBall(
        i,
        ballCount,
        ballLength,
        ballMass,
        ballRadius,
      );

      // 4. نضع الكرة داخل المصفوفة
      this.balls.push(newBall);
    }
  }

  /**
   * الحلقة الرئيسية للمحرك (Main Physics Loop)
   */
  update(dt, params, grabbedIndex = null) {
    const { gravity, restitution, isDampingEnabled, damping } = params;
    const collisions = []; // مصفوفة لتخزين شدة الصدمات (لتشغيل الصوت)

    // المرحلة 1: خطوة التكامل المستقلة (Integration Step)
    // كل كرة تحسب موقعها الجديد بشكل مستقل بناءً على الجاذبية وسرعتها
    for (let i = 0; i < this.balls.length; i++) {
      if (i === grabbedIndex) {
        this.balls[i].omega = 0;
        this.balls[i].alpha = 0;
        continue; // لا نقوم بدمج الكرة المسحوبة بالجاذبية حتى لا تتذبذب تحت الماوس
      }
      this.balls[i].integrate(dt, gravity, damping, isDampingEnabled);
    }

    // المرحلة 2: اكتشاف وحل التصادمات (Iterative Collision Resolution)
    // التكرار (iterations = 10) ضروري جداً! لأنه يسمح بمرور "موجة كمية الحركة"
    // عبر الكرات الوسطى في نفس الإطار الزمني لتنطلق الكرة الأخيرة فوراً.
    const iterations = 10;
    for (let iter = 0; iter < iterations; iter++) {
      // فحص كل كرة مع جميع الكرات التي تليها
      for (let i = 0; i < this.balls.length; i++) {
        for (let j = i + 1; j < this.balls.length; j++) {
          const b1 = this.balls[i];
          const b2 = this.balls[j];

          // 1. حساب الموقع الأفقي (X)
          const x1 = b1.pivotX + b1.length * Math.sin(b1.theta);
          const x2 = b2.pivotX + b2.length * Math.sin(b2.theta);

          // 2. حساب الموقع العمودي (Y) بافتراض أن سقف التعليق ثابت
          const y1 = -b1.length * Math.cos(b1.theta);
          const y2 = -b2.length * Math.cos(b2.theta);

          // 3. حساب المسافة الفعلية بين المركزين (2D Euclidean Distance)
          const dx = x2 - x1;
          const dy = y2 - y1;
          const distance = Math.sqrt(dx * dx + dy * dy);
          // 3. المسافة الصغرى المسموحة (مجموع نصفي القطرين)
          const minDistance = b1.radius + b2.radius;

          // اكتشاف التداخل (Broad-phase Detection)
          if (distance < minDistance) {
            // حساب السرعة النسبية بين الكرتين لتقدير شدة الصدمة (للصوتيات)
            const relativeVelocity = Math.abs(
              b1.omega * b1.length - b2.omega * b2.length,
            );

            // استدعاء دالة الرياضيات لحل الصدم (تبادل السرعات مع معرفة المقبوضة)
            const collided = PhysicsMath.resolveElasticCollision(
              b1,
              b2,
              restitution,
              i === grabbedIndex,
              j === grabbedIndex,
            );

            // تسجيل الصدمة لتشغيل الصوت (فقط في التكرار الأول لعدم تكرار الصوت)
            if (collided && iter === 0 && relativeVelocity > 0.7) {
              collisions.push(relativeVelocity);
            }

            // استدعاء دالة الرياضيات لفك التداخل البصري
            // نقوم بفك التداخل دائماً عند وجود سحب لتفادي تداخل الكرات
            if (isDampingEnabled || grabbedIndex !== null) {
              PhysicsMath.resolveOverlap(
                b1,
                b2,
                minDistance,
                distance,
                dx,
                dy,
                i === grabbedIndex,
                j === grabbedIndex,
              );
            }
          }
        }
      }
    }

    // فرض قيود الترتيب الأفقي فقط عند السحب باليد لمنع التداخل أثناء الحركة السريعة
    if (grabbedIndex !== null) {
      this.enforceOrderConstraints(grabbedIndex);
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
      this.balls[index].alpha = 0;

      // تطبيق فك التداخل وقفل الحركة بشكل فوري
      this.enforceOrderConstraints(index);
    }
  }

  /**
   * دالة فرض قيود الترتيب الأفقي ومنع تداخل الكرات
   * تضمن بقاء الكرات مرتبة من اليسار إلى اليمين بمسافة لا تقل عن قطر الكرة
   * تأخذ في الاعتبار الفارق الرأسي (dy) لتسمح للكرات الطويلة بالمرور تحت الكرات القصيرة دون تصادم
   */
  enforceOrderConstraints(grabbedIndex) {
    if (grabbedIndex === null) return;
    const n = this.balls.length;

    // دفع الكرات إلى اليمين
    for (let i = grabbedIndex; i < n - 1; i++) {
      const b1 = this.balls[i];
      const b2 = this.balls[i + 1];

      for (let iter = 0; iter < 10; iter++) {
        const x1 = b1.pivotX + b1.length * Math.sin(b1.theta);
        const y1 = -b1.length * Math.cos(b1.theta);
        const x2 = b2.pivotX + b2.length * Math.sin(b2.theta);
        const y2 = -b2.length * Math.cos(b2.theta);
        const minDistance = b1.radius + b2.radius;
        const dy = y2 - y1;

        // نطبق القيد فقط إذا كان الفارق الرأسي صغيراً (أي يمكنهما التصادم)
        if (Math.abs(dy) < minDistance) {
          const dxRequired = Math.sqrt(minDistance * minDistance - dy * dy);
          if (x2 - x1 < dxRequired) {
            const targetX2 = x1 + dxRequired;
            const sinTheta2 = (targetX2 - b2.pivotX) / b2.length;
            b2.theta = Math.asin(Math.max(-0.98, Math.min(0.98, sinTheta2)));
            b2.omega = 0;
            b2.alpha = 0;
          } else {
            break;
          }
        } else {
          break;
        }
      }
    }

    // دفع الكرات إلى اليسار
    for (let i = grabbedIndex; i > 0; i--) {
      const b2 = this.balls[i];
      const b1 = this.balls[i - 1];

      for (let iter = 0; iter < 10; iter++) {
        const x1 = b1.pivotX + b1.length * Math.sin(b1.theta);
        const y1 = -b1.length * Math.cos(b1.theta);
        const x2 = b2.pivotX + b2.length * Math.sin(b2.theta);
        const y2 = -b2.length * Math.cos(b2.theta);
        const minDistance = b1.radius + b2.radius;
        const dy = y2 - y1;

        // نطبق القيد فقط إذا كان الفارق الرأسي صغيراً (أي يمكنهما التصادم)
        if (Math.abs(dy) < minDistance) {
          const dxRequired = Math.sqrt(minDistance * minDistance - dy * dy);
          if (x2 - x1 < dxRequired) {
            const targetX1 = x2 - dxRequired;
            const sinTheta1 = (targetX1 - b1.pivotX) / b1.length;
            b1.theta = Math.asin(Math.max(-0.98, Math.min(0.98, sinTheta1)));
            b1.omega = 0;
            b1.alpha = 0;
          } else {
            break;
          }
        } else {
          break;
        }
      }
    }
  }
}
