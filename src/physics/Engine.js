import { PendulumBall } from "./PendulumBall.js";
import { PhysicsMath } from "./PhysicsMath.js";

/**
 * ============================================================================
 * كلاس محرك الفيزياء المركزي (NewtonEngine)
 * ============================================================================
 * يمثل هذا الملف العقل المنظم والمشرف على تشغيل المحاكاة الفيزيائية لنواس نيوتن.
 * مسؤوليته الرئيسية هي دمج عجلة الزمن (Integrate time)، اكتشاف التصادمات بين الكرات، 
 * وفك التداولات بالإضافة إلى فرض قيود الترتيب ثنائية وثلاثية الأبعاد.
 * 
 * ----------------------------------------------------------------------------
 * 1. تفاصيل دورة تحديث الفيزياء (Physics Tick Cycle):
 * ----------------------------------------------------------------------------
 *  أ. خطوة التكامل المستقل (Independent Integration Step):
 *     في كل إطار زمني، يتم استدعاء دالة التكامل لكل كرة بشكل مستقل لحساب موقعها الجديد 
 *     بناءً على السرعة والجاذبية الأرضية وتخامد مقاومة الهواء. في حال كانت هناك كرة 
 *     ممسوخة، نمرر لها موقع مؤشر الماوس لتطبيق قوة الجذب المرنة.
 * 
 *  ب. دورة الإصلاح التكراري للتصادمات (Iterative Collision Resolution):
 *     لضمان انتقال "موجة الزخم الحركي" عبر الكرات الوسيطة فورياً في نفس الإطار الزمني 
 *     (وهو الجوهر الفيزيائي لنواس نيوتن)، نقوم بتكرار عملية فحص وحل التصادمات 10 مرات (10 iterations) 
 *     في كل تحديث. هذا يمنع الكرات من التداخل ويجعل انتقال الطاقة يبدو واقعياً لحظياً.
 * 
 *  ج. فك التداخل الهندسي (Overlapping Resolution):
 *     تتراكم الكرات في بعض الأحيان بسبب أخطاء التقريب العددي للخطوة الزمنية، لذا يتم استدعاء 
 *     معالج التداخل الهندسي لدفع الكرات بعيداً عن بعضها بمسافة لا تقل عن مجموع أنصاف أقطارها.
 * 
 *  د. قيد الترتيب الديناميكي (Order Preservation Constraint):
 *     إذا تم سحب إحدى الكرات، نقوم بفرض قيد يمنع عبورها خلف الكرات المجاورة إذا كانتا على نفس الارتفاع.
 *     يتم فحص المسافة القطرية الجانبية: dist2D = sqrt(dy^2 + dz^2).
 *     وإذا كانت أصغر من مجموع أنصاف الأقطار، يتم إزاحة الكرات المجاورة أفقياً وتعديل زاويتها لضمان عدم الاختراق.
 * ============================================================================
 */
export class NewtonEngine {
  /**
   * إنشاء وتهيئة كرات المحاكاة
   * @param {Object} config - إعدادات المحاكاة (ballCount, lengths, mass, masses, ballRadius)
   */
  constructor(config) {
    this.reinitialize(config);
  }

  /**
   * إعادة ضبط وتهيئة النظام بالكامل بالكرات والكتل والأطوال الجديدة
   * @param {Object} config - الإعدادات المدخلة من واجهة المستخدم
   */
  reinitialize(config) {
    const { ballCount, lengths, length, mass, masses, ballRadius } = config;

    this.balls = [];

    // إنشاء قائمة الكرات وتحديد خصائصها الفردية
    for (let i = 0; i < ballCount; i++) {
      // دعم خيار الكتل والأطوال الفردية لكل كرة على حدة مع توفير بديل احتياطي (Fallback)
      const ballMass = (masses && masses[i] !== undefined) ? masses[i] : (mass || 1.0);
      const ballLength = (lengths && lengths[i] !== undefined) ? lengths[i] : (length || 5.0);
      let newBall = new PendulumBall(i, ballCount, ballLength, ballMass, ballRadius);
      this.balls.push(newBall);
    }
  }

  /**
   * خطوة التحديث الزمني المركزي لمحرك الفيزياء
   * @param {number} dt - الخطوة الزمنية الصغيرة جداً بالثواني (مثلاً 0.004 ثانية لضمان الدقة العالية)
   * @param {Object} params - معطيات الفيزياء (gravity, restitution, isDampingEnabled, damping)
   * @param {number|null} grabbedIndex - مؤشر الكرة الممسوخة حالياً بواسطة مؤشر الماوس
   * @param {Array<number>|null} targetPos - موقع مؤشر الماوس ثلاثي الأبعاد [x, y, z] لسحب الكرة
   * @returns {Array<number>} مصفوفة تحتوي على شدة السرعات النسبية للتصادمات الحادثة (لتشغيل الصوت)
   */
  update(dt, params, grabbedIndex = null, targetPos = null) {
    const { gravity, restitution, isDampingEnabled, damping } = params;
    const collisions = [];

    // المرحلة 1: خطوة التكامل المستقلة وتحديث المواقع والسرعات بشكل حر
    for (let i = 0; i < this.balls.length; i++) {
      if (i === grabbedIndex && targetPos) {
        // الكرة الممسوكة بالماوس تتحرك تحت تأثير قوى الجاذبية + قوة الزنبرك للمؤشر
        this.balls[i].integrate(dt, gravity, damping, isDampingEnabled, targetPos);
      } else {
        this.balls[i].integrate(dt, gravity, damping, isDampingEnabled, null);
      }
    }

    // المرحلة 2: حل التصادمات والتداخلات الميكانيكية تكرارياً (10 دورات لتمرير زخم الحركة اللحظي)
    const iterations = 10;
    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < this.balls.length; i++) {
        for (let j = i + 1; j < this.balls.length; j++) {
          const b1 = this.balls[i];
          const b2 = this.balls[j];

          // حساب الإزاحة والمواقع النسبية ثلاثية الأبعاد
          const dx = b2.pos[0] - b1.pos[0];
          const dy = b2.pos[1] - b1.pos[1];
          const dz = b2.pos[2] - b1.pos[2];
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const minDistance = b1.radius + b2.radius;

          if (distance < minDistance) {
            // حساب السرعة النسبية المتجهة بين الكرتين
            const dvx = b2.vel[0] - b1.vel[0];
            const dvy = b2.vel[1] - b1.vel[1];
            const dvz = b2.vel[2] - b1.vel[2];
            const relativeVelocity = Math.sqrt(dvx * dvx + dvy * dvy + dvz * dvz);

            // حل الصدم ثلاثي الأبعاد
            // نمرر false للمعاملين الأخيرين حتى ترتد الكرة الممسوخة طبيعياً بكتلتها الواقعية
            const collided = PhysicsMath.resolveElasticCollision(
              b1,
              b2,
              restitution,
              false,
              false,
            );

            // تسجيل شدة الصدم لتشغيل الصوت الملائم (فقط في التكرار الأول لتفادي تكرار الصوت)
            if (collided && iter === 0 && relativeVelocity > 0.3) {
              collisions.push(relativeVelocity);
            }

            // فك التداخل الميكانيكي ومنع الاختراق
            if (isDampingEnabled || grabbedIndex !== null) {
              PhysicsMath.resolveOverlap(
                b1,
                b2,
                minDistance,
                distance,
                dx,
                dy,
                dz,
                false,
                false,
              );
            }
          }
        }
      }
    }

    // تطبيق قيود الترتيب فقط عندما تكون هناك كرة ممسوخة باليد لمنع الاختراقات أثناء السحب السريع
    if (grabbedIndex !== null) {
      this.enforceOrderConstraints(grabbedIndex);
    }

    return collisions;
  }

  /**
   * تعيين زاوية الكرة بالراديان (للتوافقية مع التهيئة والرموز القديمة)
   * @param {number} index - مؤشر الكرة
   * @param {number} theta - زاوية التأرجح المطلوبة بالراديان
   */
  setBallTheta(index, theta) {
    if (this.balls[index]) {
      const ball = this.balls[index];
      const x = ball.pivotX + ball.length * Math.sin(theta);
      const y = -ball.length * Math.cos(theta);
      ball.pos = [x, y, 0];
      ball.vel = [0, 0, 0];

      this.enforceOrderConstraints(index);
    }
  }

  /**
   * تعيين إحداثيات موقع الكرة بشكل مباشر (مثل السحب أو الإعادة القسرية)
   * ويتم معها إعادة إسقاط الكرة على سطح طول الخيط لمنع تمدده
   * @param {number} index - مؤشر الكرة
   * @param {number} x - الإحداثي X المطلوب
   * @param {number} y - الإحداثي Y المطلوب
   * @param {number} z - الإحداثي Z المطلوب
   */
  setBallPosition(index, x, y, z) {
    if (this.balls[index]) {
      const ball = this.balls[index];
      ball.pos[0] = x;
      ball.pos[1] = y;
      ball.pos[2] = z;
      ball.vel = [0, 0, 0];

      // إسقاط الموقع على قيد طول الخيط فوراً لمنع التمدد
      const px = ball.pivotX;
      const dx = ball.pos[0] - px;
      const dy = ball.pos[1];
      const dz = ball.pos[2];
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (len > 0) {
        ball.pos[0] = px + (dx / len) * ball.length;
        ball.pos[1] = (dy / len) * ball.length;
        ball.pos[2] = (dz / len) * ball.length;
      }

      this.enforceOrderConstraints(index);
    }
  }

  /**
   * فرض قيود الترتيب ثنائية وثلاثية الأبعاد لمنع تداخل الكرات أثناء السحب
   * تضمن الدالة بقاء الكرات مرتبة من اليسار إلى اليمين بمسافة لا تقل عن القطر.
   * وتأخذ في الاعتبار الفارق الجانبي (dy, dz) لتسمح للكرات الطويلة بالمرور تحت/بجانب القصيرة بحرية.
   * @param {number} grabbedIndex - مؤشر الكرة الممسوخة باليد حالياً
   */
  enforceOrderConstraints(grabbedIndex) {
    if (grabbedIndex === null) return;
    const n = this.balls.length;

    // 1. دفع الكرات الواقعة على يمين الكرة الممسوخة نحو اليمين
    for (let i = grabbedIndex; i < n - 1; i++) {
      const b1 = this.balls[i];
      const b2 = this.balls[i + 1];

      for (let iter = 0; iter < 10; iter++) {
        const x1 = b1.pos[0];
        const y1 = b1.pos[1];
        const z1 = b1.pos[2];
        const x2 = b2.pos[0];
        const y2 = b2.pos[1];
        const z2 = b2.pos[2];

        const minDistance = b1.radius + b2.radius;
        const dy = y2 - y1;
        const dz = z2 - z1;
        const dist2D = Math.sqrt(dy * dy + dz * dz); // الفارق القطري في المستوى YZ

        // نقوم بفرض الإزاحة الأفقية فقط إذا كان الفارق الجانبي أصغر من مجموع نصفي القطرين
        // (أي أن مسارات الكرات تتقاطع في الفضاء ثلاثي الأبعاد وقد يحدث تصادم)
        if (dist2D < minDistance) {
          const dxRequired = Math.sqrt(minDistance * minDistance - dist2D * dist2D);
          if (x2 - x1 < dxRequired) {
            const targetX2 = x1 + dxRequired;
            b2.pos[0] = targetX2;

            // إسقاط الموقع المحدث على كرة قيود طول الخيط الخاصة بـ b2
            const px = b2.pivotX;
            const dx = b2.pos[0] - px;
            const dyVal = b2.pos[1];
            const dzVal = b2.pos[2];
            const len = Math.sqrt(dx * dx + dyVal * dyVal + dzVal * dzVal);
            if (len > 0) {
              b2.pos[0] = px + (dx / len) * b2.length;
              b2.pos[1] = (dyVal / len) * b2.length;
              b2.pos[2] = (dzVal / len) * b2.length;
            }
            b2.vel = [0, 0, 0];
          } else {
            break;
          }
        } else {
          break;
        }
      }
    }

    // 2. دفع الكرات الواقعة على يسار الكرة الممسوخة نحو اليسار
    for (let i = grabbedIndex; i > 0; i--) {
      const b2 = this.balls[i];
      const b1 = this.balls[i - 1];

      for (let iter = 0; iter < 10; iter++) {
        const x1 = b1.pos[0];
        const y1 = b1.pos[1];
        const z1 = b1.pos[2];
        const x2 = b2.pos[0];
        const y2 = b2.pos[1];
        const z2 = b2.pos[2];

        const minDistance = b1.radius + b2.radius;
        const dy = y2 - y1;
        const dz = z2 - z1;
        const dist2D = Math.sqrt(dy * dy + dz * dz);

        if (dist2D < minDistance) {
          const dxRequired = Math.sqrt(minDistance * minDistance - dist2D * dist2D);
          if (x2 - x1 < dxRequired) {
            const targetX1 = x2 - dxRequired;
            b1.pos[0] = targetX1;

            // إسقاط الموقع المحدث على كرة قيود طول الخيط الخاصة بـ b1
            const px = b1.pivotX;
            const dx = b1.pos[0] - px;
            const dyVal = b1.pos[1];
            const dzVal = b1.pos[2];
            const len = Math.sqrt(dx * dx + dyVal * dyVal + dzVal * dzVal);
            if (len > 0) {
              b1.pos[0] = px + (dx / len) * b1.length;
              b1.pos[1] = (dyVal / len) * b1.length;
              b1.pos[2] = (dzVal / len) * b1.length;
            }
            b1.vel = [0, 0, 0];
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
