/**
 * ============================================================================
 * كلاس رياضيات وحسابات الفيزياء ثلاثية الأبعاد (PhysicsMath)
 * ============================================================================
 * يوفر هذا الملف الدوال الرياضية ومصفوفات المتجهات المتقدمة لحل تفاعلات 
 * الأجسام وتصادماتها في الفضاء ثلاثي الأبعاد.
 * 
 * ----------------------------------------------------------------------------
 * 1. القوانين الفيزيائية المطبقة (Physical Laws Implemented):
 * ----------------------------------------------------------------------------
 *  أ. قانون انحفاظ كمية الحركة (Conservation of Linear Momentum):
 *     m1 * v1 + m2 * v2 = m1 * v1' + m2 * v2'
 *     حيث يبقى مجموع كمية الحركة الإجمالي للنظام ثابتاً قبل وبعد التصادم.
 * 
 *  ب. معامل الارتداد والتصادم المرن (Restitution & Elastic Collision):
 *     v2' - v1' = -e * (v2 - v1)
 *     حيث:
 *     - e: معامل الارتداد (Restitution) ويتراوح بين 0 (تصادم عديم المرونة) و 1 (تصادم مرن تماماً).
 *     ويتم تطبيق هذه الانحفاظات حصرياً على المحور العمودي المشترك للتلامس (Normal Axis).
 * 
 *  ج. حساب قوة النبض المتجهة (Vector Impulse Resolution Method):
 *     بدلاً من تبديل السرعات الزاوية عشوائياً، نقوم بحساب النبض (Impulse Scalar - J) 
 *     الذي يمثل القوة اللحظية المتولدة عند التصادم:
 *     J = -(1 + e) * (v_rel . n) / (1/m1 + 1/m2)
 *     حيث:
 *     - v_rel: السرعة النسبية المتجهة بين الكرتين (v2 - v1).
 *     - n: متجه الوحدة العمودي الفاصل بين الكرتين (Normal Unit Vector).
 *     - m1, m2: كتل الكرات المتصادمة.
 * 
 *  د. تحديث السرعات وإسقاط قيد النواس (Velocity Update & Constraint Projection):
 *     يتم إضافة النبض الموزع على الكتلة لسرعة كل كرة:
 *     v1' = v1 - (J / m1) * n
 *     v2' = v2 + (J / m2) * n
 *     ثم يتم إلغاء أي سرعة خطية تسحب الكرات خارج مسارها الدائري عبر ضربها بمتجه الخيط لمنع تمدد الخيط.
 * 
 *  هـ. حل التداخل البصري ثلاثي الأبعاد (3D Spatial Penetration Resolution):
 *     عند تداخل كرتين بسبب خطوة التكامل الزمنية، يتم حساب مسافة الاختراق:
 *     overlap = minDistance - currentDistance
 *     ويتم دفع الكرات بعيداً عن بعضها البعض على طول خط التلامس n. يتم تقسيم هذه الإزاحة بناءً 
 *     على حالة الإمساك (الكرة الممسوخة باليد لا تتزحزح وتتحمل الكرة الحرة 100% من الإزاحة).
 * ============================================================================
 */
export class PhysicsMath {
  /**
   * حل التصادم المرن التام ثلاثي الأبعاد باستخدام ناقلات الحركة والنبضات المتجهة
   * @param {PendulumBall} ball1 - الكرة الأولى (اليسار افتراضياً)
   * @param {PendulumBall} ball2 - الكرة الثانية (اليمين افتراضياً)
   * @param {number} restitution - معامل المرونة والارتداد (e)
   * @param {boolean} ball1Grabbed - ما إذا كانت الكرة الأولى ممسوكة باليد
   * @param {boolean} ball2Grabbed - ما إذا كانت الكرة الثانية ممسوكة باليد
   * @returns {boolean} true إذا حدث تصادم حقيقي وتمت معالجته، وإلا false
   */
  static resolveElasticCollision(ball1, ball2, restitution, ball1Grabbed = false, ball2Grabbed = false) {
    // 1. استخراج مواقع الكرات ثلاثية الأبعاد
    const x1 = ball1.pos[0];
    const y1 = ball1.pos[1];
    const z1 = ball1.pos[2];

    const x2 = ball2.pos[0];
    const y2 = ball2.pos[1];
    const z2 = ball2.pos[2];

    // 2. استخراج ناقلات السرعة الخطية
    const v1x = ball1.vel[0];
    const v1y = ball1.vel[1];
    const v1z = ball1.vel[2];

    const v2x = ball2.vel[0];
    const v2y = ball2.vel[1];
    const v2z = ball2.vel[2];

    // 3. حساب المسافة ومتجه الفصل ثلاثي الأبعاد (3D Vector Separation)
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // حماية ضد القسمة على صفر في حالة التقاطع الكامل
    if (distance === 0) return false;

    // 4. حساب السرعة النسبية ونقطة التلامس
    const dvx = v2x - v1x;
    const dvy = v2y - v1y;
    const dvz = v2z - v1z;

    // الضرب النقطي للسرعة النسبية مع متجه الإزاحة لمعرفة التقارب
    const relVelocityDotDist = dx * dvx + dy * dvy + dz * dvz;
    if (relVelocityDotDist >= 0) {
      return false; // الكرتان تبتعدان عن بعضهما بالفعل، لا داعي للتصادم
    }

    // متجه الوحدة الطبيعي للتصادم (Normal Unit Vector)
    const nx = dx / distance;
    const ny = dy / distance;
    const nz = dz / distance;

    // السرعة النسبية المسقطة على خط التصادم
    const vRelN = dvx * nx + dvy * ny + dvz * nz;

    // 5. تطبيق قانون النبض المتجه (Vector Impulse Resolution)
    // إذا كانت إحدى الكرات ممسوخة، نمنحها افتراضياً كتلة هائلة (1e12) لمنع ارتدادها
    const m1 = ball1Grabbed ? 1e12 : ball1.mass;
    const m2 = ball2Grabbed ? 1e12 : ball2.mass;

    // القيمة القياسية للنبض: J = -(1 + e) * v_rel_normal / (1/m1 + 1/m2)
    const impulse = -(1 + restitution) * vRelN / (1 / m1 + 1 / m2);

    // 6. تحديث السرعات وإعادة تطبيق قيود خيوط النواس
    if (!ball1Grabbed) {
      ball1.vel[0] -= (impulse / ball1.mass) * nx;
      ball1.vel[1] -= (impulse / ball1.mass) * ny;
      ball1.vel[2] -= (impulse / ball1.mass) * nz;

      // إسقاط لمنع خروج الكرة خارج القيد الدائري للخيط (Radial Constraint Projection)
      const u1x = (ball1.pos[0] - ball1.pivotX) / ball1.length;
      const u1y = ball1.pos[1] / ball1.length;
      const u1z = ball1.pos[2] / ball1.length;
      const vDotU1 = ball1.vel[0] * u1x + ball1.vel[1] * u1y + ball1.vel[2] * u1z;
      ball1.vel[0] -= vDotU1 * u1x;
      ball1.vel[1] -= vDotU1 * u1y;
      ball1.vel[2] -= vDotU1 * u1z;
    } else {
      ball1.vel = [0, 0, 0];
    }

    if (!ball2Grabbed) {
      ball2.vel[0] += (impulse / ball2.mass) * nx;
      ball2.vel[1] += (impulse / ball2.mass) * ny;
      ball2.vel[2] += (impulse / ball2.mass) * nz;

      // إسقاط لمنع خروج الكرة خارج القيد الدائري للخيط
      const u2x = (ball2.pos[0] - ball2.pivotX) / ball2.length;
      const u2y = ball2.pos[1] / ball2.length;
      const u2z = ball2.pos[2] / ball2.length;
      const vDotU2 = ball2.vel[0] * u2x + ball2.vel[1] * u2y + ball2.vel[2] * u2z;
      ball2.vel[0] -= vDotU2 * u2x;
      ball2.vel[1] -= vDotU2 * u2y;
      ball2.vel[2] -= vDotU2 * u2z;
    } else {
      ball2.vel = [0, 0, 0];
    }

    return true; 
  }

  /**
   * فك التداخل الميكانيكي ومنع اختراق كرات النواس لبعضها البعض
   * @param {PendulumBall} ball1 - الكرة الأولى
   * @param {PendulumBall} ball2 - الكرة الثانية
   * @param {number} minDistance - المسافة الصغرى المسموحة (مجموع نصفي القطرين R1 + R2)
   * @param {number} currentDistance - المسافة الفعلية بين المركزين
   * @param {number} dx - الفارق على المحور X
   * @param {number} dy - الفارق على المحور Y
   * @param {number} dz - الفارق على المحور Z
   * @param {boolean} ball1Grabbed - ما إذا كانت الكرة الأولى ممسوكة
   * @param {boolean} ball2Grabbed - ما إذا كانت الكرة الثانية ممسوكة
   */
  static resolveOverlap(ball1, ball2, minDistance, currentDistance, dx, dy, dz, ball1Grabbed = false, ball2Grabbed = false) {
    const overlap = minDistance - currentDistance;

    if (overlap > 0 && currentDistance > 0) {
      const nx = dx / currentDistance;
      const ny = dy / currentDistance;
      const nz = dz / currentDistance;

      // حساب نسب الدفع
      // إذا كانت الكرة ممسوخة باليد، نمنع حركتها وننقل 100% من مسافة التراجع للكرة الأخرى
      let moveX1, moveY1, moveZ1, moveX2, moveY2, moveZ2;
      if (ball1Grabbed) {
        moveX1 = 0; moveY1 = 0; moveZ1 = 0;
        moveX2 = overlap * nx; moveY2 = overlap * ny; moveZ2 = overlap * nz;
      } else if (ball2Grabbed) {
        moveX1 = -overlap * nx; moveY1 = -overlap * ny; moveZ1 = -overlap * nz;
        moveX2 = 0; moveY2 = 0; moveZ2 = 0;
      } else {
        // في الحالة الطبيعية يتوزع التراجع بالتساوي 50% لكل كرة
        moveX1 = -(overlap / 2) * nx;
        moveY1 = -(overlap / 2) * ny;
        moveZ1 = -(overlap / 2) * nz;
        moveX2 = (overlap / 2) * nx;
        moveY2 = (overlap / 2) * ny;
        moveZ2 = (overlap / 2) * nz;
      }

      // تطبيق التراجع وإعادة إسقاط المواقع على كرة القيود لمنع تمدد الخيوط
      if (!ball1Grabbed) {
        ball1.pos[0] += moveX1;
        ball1.pos[1] += moveY1;
        ball1.pos[2] += moveZ1;

        const ux = ball1.pos[0] - ball1.pivotX;
        const uy = ball1.pos[1];
        const uz = ball1.pos[2];
        const len = Math.sqrt(ux * ux + uy * uy + uz * uz);
        if (len > 0) {
          ball1.pos[0] = ball1.pivotX + (ux / len) * ball1.length;
          ball1.pos[1] = (uy / len) * ball1.length;
          ball1.pos[2] = (uz / len) * ball1.length;
        }
      }

      if (!ball2Grabbed) {
        ball2.pos[0] += moveX2;
        ball2.pos[1] += moveY2;
        ball2.pos[2] += moveZ2;

        const ux = ball2.pos[0] - ball2.pivotX;
        const uy = ball2.pos[1];
        const uz = ball2.pos[2];
        const len = Math.sqrt(ux * ux + uy * uy + uz * uz);
        if (len > 0) {
          ball2.pos[0] = ball2.pivotX + (ux / len) * ball2.length;
          ball2.pos[1] = (uy / len) * ball2.length;
          ball2.pos[2] = (uz / len) * ball2.length;
        }
      }
    }
  }
  /**
   * حل اصطدام الكرات مع إطار الستاند المعدني (Static Boundary Collision)
   */
  /**
   * حل اصطدام الكرات مع إطار الستاند (A-Frame Collision) وتجاهل الفراغات
   */
  /**
   * حل اصطدام الكرات مع إطار الستاند (A-Frame Collision) بدقة متناهية (3D Segment Collision)
   */
  static resolveFrameCollision(ball, ballCount, ballRadius, restitution) {
    const coreWidth = (ballCount + 1) * ballRadius * 2;
    const frameWidth = coreWidth + (ballRadius * 6);
    const thickness = 0.15;
    const limitX = frameWidth / 2;

    const height = ball.length + 1.0;
    const depth = 6;
    
    // تعريف الأعمدة الأربعة كقطع مستقيمة في الفضاء الثلاثي [بداية، نهاية]
    const legs = [
      { a: [limitX, 0, 0], b: [limitX, -height, depth/2] },   // اليمين الأمامي
      { a: [limitX, 0, 0], b: [limitX, -height, -depth/2] },  // اليمين الخلفي
      { a: [-limitX, 0, 0], b: [-limitX, -height, depth/2] }, // اليسار الأمامي
      { a: [-limitX, 0, 0], b: [-limitX, -height, -depth/2] } // اليسار الخلفي
    ];

    // المسافة المسموحة هي نصف قطر الكرة + نصف سماكة العمود
    const visualPadding = 0.05; 
    const combinedRadius = ballRadius + (thickness / 2) + visualPadding;
    let maxImpact = 0;

    // فحص التصادم مع كل عمود بشكل مستقل
    for (let leg of legs) {
      const ax = leg.a[0], ay = leg.a[1], az = leg.a[2];
      const bx = leg.b[0], by = leg.b[1], bz = leg.b[2];
      const px = ball.pos[0], py = ball.pos[1], pz = ball.pos[2];

      // متجه العمود (AB) ومتجه الكرة (AP)
      const abx = bx - ax, aby = by - ay, abz = bz - az;
      const apx = px - ax, apy = py - ay, apz = pz - az;

      // الإسقاط الشعاعي لإيجاد أقرب نقطة على العمود
      const dotAP_AB = apx * abx + apy * aby + apz * abz;
      const dotAB_AB = abx * abx + aby * aby + abz * abz;
      
      // حصر النقطة لتكون ضمن طول العمود فقط (بين 0 و 1)
      let t = Math.max(0, Math.min(1, dotAP_AB / dotAB_AB));

      // إحداثيات أقرب نقطة ملامسة
      const cx = ax + t * abx;
      const cy = ay + t * aby;
      const cz = az + t * abz;

      // حساب المسافة بين مركز الكرة وهذه النقطة
      const dx = px - cx, dy = py - cy, dz = pz - cz;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < combinedRadius && dist > 0) {
        // تم اختراق العمود!
        const overlap = combinedRadius - dist;
        const nx = dx / dist, ny = dy / dist, nz = dz / dist;

        // 1. الدفع الميكانيكي: إخراج الكرة من الحديد
        ball.pos[0] += nx * overlap;
        ball.pos[1] += ny * overlap;
        ball.pos[2] += nz * overlap;

        // 2. الارتداد الفيزيائي: عكس السرعة باتجاه الخارج
        const vDotN = ball.vel[0] * nx + ball.vel[1] * ny + ball.vel[2] * nz;
        
        // تطبيق الصدمة فقط إذا كانت الكرة تتجه نحو العمود
        if (vDotN < 0) {
          const impulse = -(1 + restitution) * vDotN;
          ball.vel[0] += impulse * nx;
          ball.vel[1] += impulse * ny;
          ball.vel[2] += impulse * nz;
          
          maxImpact = Math.max(maxImpact, Math.abs(impulse));
        }
      }
    }

    // إعادة فرض قيد البندول لحماية الخيط من التمدد بعد الاصطدام
    if (maxImpact > 0) {
      const dx = ball.pos[0] - ball.pivotX;
      const dy = ball.pos[1];
      const dz = ball.pos[2];
      const currentDist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (currentDist > 0) {
        const ux = dx / currentDist, uy = dy / currentDist, uz = dz / currentDist;

        // إعادة الكرة لمسارها الدائري الصحيح
        ball.pos[0] = ball.pivotX + ux * ball.length;
        ball.pos[1] = uy * ball.length;
        ball.pos[2] = uz * ball.length;

        // إزالة أي سرعة تحاول قطع الخيط
        const vDotU = ball.vel[0] * ux + ball.vel[1] * uy + ball.vel[2] * uz;
        ball.vel[0] -= vDotU * ux;
        ball.vel[1] -= vDotU * uy;
        ball.vel[2] -= vDotU * uz;
      }
    }

    return maxImpact;
  }
}
