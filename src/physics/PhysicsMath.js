/**
 * ============================================================================
 * PhysicsMath Class (Static Utility)
 * ============================================================================
 * يوفر هذا الكلاس الدوال الرياضية المجردة لحل تفاعلات الأجسام.
 * مسؤوليته:
 * 1. تطبيق مصفوفة تبادل السرعات (1D Elastic Collision).
 * 2. معالجة التداخل البصري بين الكرات (Penetration Resolution).
 * ============================================================================
 */
export class PhysicsMath {
  /**
   * دالة حل التصادم المرن التام في بعد واحد
   * تعتمد على قانوني: انحفاظ كمية الحركة (Momentum) وانحفاظ الطاقة الحركية (Kinetic Energy)
   */
  static resolveElasticCollision(ball1, ball2, restitution, ball1Grabbed = false, ball2Grabbed = false) {
    // 1. حساب الموقع (x, y) لكل كرة لحظة التصادم
    const x1 = ball1.pivotX + ball1.length * Math.sin(ball1.theta);
    const y1 = -ball1.length * Math.cos(ball1.theta);

    const x2 = ball2.pivotX + ball2.length * Math.sin(ball2.theta);
    const y2 = -ball2.length * Math.cos(ball2.theta);

    // 2. حساب السرعة الخطية المماسية ثم تحليلها إلى متجهات (vx, vy)
    // مشتقة الموقع بالنسبة للزمن تعطينا متجهات السرعة
    const v1 = ball1.omega * ball1.length;
    const v1x = v1 * Math.cos(ball1.theta);
    const v1y = v1 * Math.sin(ball1.theta);

    const v2 = ball2.omega * ball2.length;
    const v2x = v2 * Math.cos(ball2.theta);
    const v2y = v2 * Math.sin(ball2.theta);

    // 3. حساب المسافة والمتجه الفاصل بين المركزين
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // حماية من القسمة على صفر في حال تقاطع الكرتين تماماً
    if (distance === 0) return false;

    // 4. الحماية من الالتصاق الوهمي
    // نحسب السرعة النسبية بين الكرتين
    const dvx = v2x - v1x;
    const dvy = v2y - v1y;

    // استخدام الضرب النقطي (Dot Product)
    // إذا كانت النتيجة موجبة، فهذا يعني أن الكرتين تبتعدان عن بعضهما فعلياً ولا داعي لتطبيق الصدم
    if (dx * dvx + dy * dvy >= 0) {
      return false;
    }

    // --- المرحلة الثانية: إسقاط السرعات وتطبيق قانون التصادم ---

    // 1. حساب متجه الوحدة لخط التصادم (Normal Unit Vector)
    // هذا المتجه يمثل "خط التصادم" المباشر بين الكرتين
    const nx = dx / distance;
    const ny = dy / distance;

    // 2. حساب المتجه المماسي (Tangent Unit Vector)
    // عمودي تماماً على خط التصادم
    const tx = -ny;
    const ty = nx;

    // 3. إسقاط المتجهات: حساب السرعة على الخط العمودي (التي ستتغير) والمماسي (التي ستبقى ثابتة)
    // نستخدم الضرب النقطي (Dot Product)
    const v1n = nx * v1x + ny * v1y;
    const v1t = tx * v1x + ty * v1y;

    const v2n = nx * v2x + ny * v2y;
    const v2t = tx * v2x + ty * v2y;

    // 4. تطبيق قانون حفظ الزخم على السرعات العمودية فقط (1D Collision)
    let v1n_new, v2n_new;
    if (ball1Grabbed) {
      v1n_new = v1n; // grabbed ball does not change velocity
      v2n_new = (1 + restitution) * v1n - restitution * v2n;
    } else if (ball2Grabbed) {
      v1n_new = (1 + restitution) * v2n - restitution * v1n;
      v2n_new = v2n; // grabbed ball does not change velocity
    } else {
      const m1 = ball1.mass;
      const m2 = ball2.mass;
      const totalMomentum = m1 * v1n + m2 * v2n;
      v1n_new = (totalMomentum - m2 * restitution * (v1n - v2n)) / (m1 + m2);
      v2n_new = (totalMomentum + m1 * restitution * (v1n - v2n)) / (m1 + m2);
    }

    // --- المرحلة الثالثة: إعادة تركيب السرعات وتحويلها لسرعة زاوية ---

    // 1. إعادة تركيب المتجهات: نجمع السرعة العمودية الجديدة مع السرعة المماسية (التي لم تتغير)
    const v1x_final = v1n_new * nx + v1t * tx;
    const v1y_final = v1n_new * ny + v1t * ty;

    const v2x_final = v2n_new * nx + v2t * tx;
    const v2y_final = v2n_new * ny + v2t * ty;

    // 2. فرض قيد الخيط (Pendulum Constraint):
    // الكرة لا يمكنها التحرك إلا بشكل مماس لمسارها الدائري، لذلك نسقط السرعة النهائية على هذا المماس
    const v1_final =
      v1x_final * Math.cos(ball1.theta) + v1y_final * Math.sin(ball1.theta);
    const v2_final =
      v2x_final * Math.cos(ball2.theta) + v2y_final * Math.sin(ball2.theta);

    // 3. تحويل السرعة الخطية النهائية إلى سرعة زاوية لتحديث حالة الكرات
    if (!ball1Grabbed) {
      ball1.omega = v1_final / ball1.length;
    } else {
      ball1.omega = 0;
    }
    if (!ball2Grabbed) {
      ball2.omega = v2_final / ball2.length;
    } else {
      ball2.omega = 0;
    }

    return true; // تمت عملية التصادم بنجاح!
  }

  /**
   * دالة فك التداخل الميكانيكي (2D Static Collision Resolution)
   */
  static resolveOverlap(ball1, ball2, minDistance, currentDistance, dx, dy, ball1Grabbed = false, ball2Grabbed = false) {
    const overlap = minDistance - currentDistance;

    // إذا كان هناك اختراق فعلي
    if (overlap > 0 && currentDistance > 0) {
      // 1. حساب متجه الوحدة لخط التلامس (Normal Vector)
      const nx = dx / currentDistance;
      const ny = dy / currentDistance;

      // 2. تقسيم مسافة التداخل بين الكرتين
      let moveX1, moveY1, moveX2, moveY2;
      if (ball1Grabbed) {
        // ball1 is grabbed, so ball2 moves 100% of the overlap
        moveX1 = 0;
        moveY1 = 0;
        moveX2 = overlap * nx;
        moveY2 = overlap * ny;
      } else if (ball2Grabbed) {
        // ball2 is grabbed, so ball1 moves 100% of the overlap
        moveX1 = -overlap * nx;
        moveY1 = -overlap * ny;
        moveX2 = 0;
        moveY2 = 0;
      } else {
        // normal case: split 50/50
        moveX1 = -(overlap / 2) * nx;
        moveY1 = -(overlap / 2) * ny;
        moveX2 = (overlap / 2) * nx;
        moveY2 = (overlap / 2) * ny;
      }

      // 3. حساب المتجه المماسي (Tangent) لكل كرة بناءً على زاويتها
      const t1x = Math.cos(ball1.theta);
      const t1y = Math.sin(ball1.theta);
      
      const t2x = Math.cos(ball2.theta);
      const t2y = Math.sin(ball2.theta);

      // 4. إسقاط الإزاحة على المماس وتحويلها لتعديل في الزاوية
      if (!ball1Grabbed) {
        ball1.theta += (moveX1 * t1x + moveY1 * t1y) / ball1.length;
      }
      if (!ball2Grabbed) {
        ball2.theta += (moveX2 * t2x + moveY2 * t2y) / ball2.length;
      }
    }
  }
}
