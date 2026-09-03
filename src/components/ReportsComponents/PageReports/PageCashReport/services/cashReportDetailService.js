import { supabase } from "../../../../../lib/supabaseClient";

/**
 * Obtiene el detalle exhaustivo de una sesión específica (para el modal de detalle)
 */
export const fetchCashSessionDetail = async (sessionId) => {
  try {
    if (!sessionId) return null;

    // 1. Datos principales de la sesión
    const { data: sessionData, error: sessionErr } = await supabase
      .from("cash_register_sessions")
      .select(`
        id,
        user_id,
        branch_id,
        opening_amount,
        closing_amount,
        opened_at,
        closed_at,
        status,
        difference,
        users (
          id,
          username,
          email
        ),
        branches (
          id,
          name,
          timezone
        ),
        cash_cuts (
          id,
          cut_type,
          expected_amount,
          counted_amount,
          difference,
          notes,
          created_at
        )
      `)
      .eq("id", sessionId)
      .single();

    if (sessionErr) throw sessionErr;
    if (!sessionData) return null;

    // 2. Movimientos manuales asociados a la sesión
    const { data: movementsData, error: movErr } = await supabase
      .from("cash_movements")
      .select(`
        id,
        user_id,
        movement_type,
        amount,
        description,
        created_at,
        users (username)
      `)
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(5000);

    if (movErr) {
      console.error("Error obteniendo movimientos de la sesión:", movErr);
    }

    // 3. Ventas, descuentos y pagos en el lapso de la sesión
    const sessionStart = sessionData.opened_at;
    const sessionEnd = sessionData.closed_at || new Date().toISOString();

    let paymentsData = [];
    let salesData = [];
    let redemptionsData = [];
    let saleDetailsWithDiscounts = [];

    if (sessionData.branch_id && sessionData.user_id && sessionStart) {
      try {
        const [salesRes, paymentsRes] = await Promise.all([
          supabase
            .from("sales")
            .select("id, subtotal, tax, total, discount_total, status, created_at")
            .eq("branch_id", sessionData.branch_id)
            .eq("user_id", sessionData.user_id)
            .gte("created_at", sessionStart)
            .lte("created_at", sessionEnd)
            .in("status", ["completed", "partial_refund"])
            .limit(5000),
          supabase
            .from("sale_payments")
            .select(`
              id,
              sale_id,
              amount,
              payment_method_id,
              payment_methods (id, name, affects_cash),
              sales!inner (
                id,
                user_id,
                branch_id,
                status,
                created_at
              )
            `)
            .eq("sales.branch_id", sessionData.branch_id)
            .eq("sales.user_id", sessionData.user_id)
            .gte("sales.created_at", sessionStart)
            .lte("sales.created_at", sessionEnd)
            .in("sales.status", ["completed", "partial_refund"])
            .limit(5000),
        ]);

        salesData = salesRes.data || [];
        paymentsData = paymentsRes.data || [];

        const saleIds = salesData.map((s) => s.id);
        if (saleIds.length > 0) {
          const [rewardsRes, detailsRes] = await Promise.all([
            supabase
              .from("sale_reward_redemptions")
              .select("id, sale_id, sale_detail_id, reward_name, product_name, quantity, total_points, discount_amount, status, reversed_at, created_at")
              .in("sale_id", saleIds)
              .limit(5000),
            supabase
              .from("sale_details")
              .select(`
                id,
                sale_id,
                product_id,
                quantity,
                unit_price,
                original_unit_price,
                final_unit_price,
                discount_type,
                discount_value,
                discount_amount,
                total_price,
                products (
                  name,
                  barcode
                ),
                sales (
                  created_at
                )
              `)
              .in("sale_id", saleIds)
              .gt("discount_amount", 0)
              .limit(5000),
          ]);

          if (!rewardsRes.error && rewardsRes.data) {
            redemptionsData = rewardsRes.data;
          }
          if (!detailsRes.error && detailsRes.data) {
            saleDetailsWithDiscounts = detailsRes.data;
          }
        }
      } catch (salesErr) {
        console.error("Error al obtener ventas y pagos de la sesión:", salesErr);
      }
    }

    // 4. Procesar desglose de pagos por método
    const paymentsByMethodMap = {};
    let cashSalesTotal = 0;
    let cardSalesTotal = 0;

    (paymentsData || []).forEach((p) => {
      const amt = Number(p.amount || 0);
      const methodId = p.payment_method_id || "unknown";
      const methodName = p.payment_methods?.name || "Sin método";
      const affectsCash = Boolean(
        p.payment_methods?.affects_cash ||
        String(methodName).toLowerCase().includes("efectivo")
      );

      if (!paymentsByMethodMap[methodId]) {
        paymentsByMethodMap[methodId] = {
          id: methodId,
          name: methodName,
          affectsCash,
          total: 0,
          count: 0,
        };
      }

      paymentsByMethodMap[methodId].total += amt;
      paymentsByMethodMap[methodId].count += 1;

      if (affectsCash) {
        cashSalesTotal += amt;
      } else {
        cardSalesTotal += amt;
      }
    });

    // 5. Procesar movimientos manuales (entradas y salidas)
    let totalManualIn = 0;
    let totalManualOut = 0;

    (movementsData || []).forEach((m) => {
      const type = String(m.movement_type || "").toLowerCase();
      const amt = Number(m.amount || 0);
      if (type.includes("entry") || type.includes("in") || type.includes("ingreso") || type.includes("entrada")) {
        totalManualIn += amt;
      } else {
        totalManualOut += amt;
      }
    });

    // 6. Balance y esperado
    const openingAmount = Number(sessionData.opening_amount || 0);
    const expectedCashCalculated = openingAmount + cashSalesTotal + totalManualIn - totalManualOut;

    // 7. Descuentos y Canjes de recompensas
    const processedDiscountsAndRewards = [];

    (saleDetailsWithDiscounts || []).forEach((d) => {
      const rawType = String(d.discount_type || "").toLowerCase();
      let label = "Descuento Manual";
      if (rawType.includes("promo") || rawType.includes("catalog") || rawType.includes("catálogo") || rawType.includes("global")) {
        label = "Desc. Catálogo";
      }

      processedDiscountsAndRewards.push({
        id: `detail-${d.id}`,
        saleId: d.sale_id,
        createdAt: d.sales?.created_at || sessionData.opened_at,
        isReward: false,
        name: d.products?.name || "Producto",
        discountType: label,
        quantity: d.quantity || 1,
        discountAmount: Number(d.discount_amount || 0),
        points: 0,
      });
    });

    (redemptionsData || []).forEach((r) => {
      processedDiscountsAndRewards.push({
        id: `reward-${r.id}`,
        saleId: r.sale_id,
        createdAt: r.created_at || sessionData.opened_at,
        isReward: true,
        name: r.product_name || r.reward_name || "Beneficio de Lealtad",
        discountType: "Canje",
        quantity: r.quantity || 1,
        discountAmount: Number(r.discount_amount || 0),
        points: Number(r.total_points || 0),
      });
    });

    processedDiscountsAndRewards.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    const totalDiscounts = salesData.reduce(
      (acc, s) => acc + Number(s.discount_total || 0),
      0
    );
    const discountedSalesCount = salesData.filter(
      (s) => Number(s.discount_total || 0) > 0
    ).length;

    const totalPointsUsed = (redemptionsData || []).reduce(
      (acc, r) => acc + Number(r.total_points || 0),
      0
    );

    return {
      ...sessionData,
      movements: movementsData || [],
      paymentsByMethod: Object.values(paymentsByMethodMap).sort((a, b) => b.total - a.total),
      cashSalesTotal,
      cardSalesTotal,
      totalSalesVolume: cashSalesTotal + cardSalesTotal,
      salesCount: salesData.length,
      totalManualIn,
      totalManualOut,
      expectedCashCalculated,
      discountsAndRewardsList: processedDiscountsAndRewards,
      totalDiscounts,
      discountedSalesCount,
      totalRedemptions: (redemptionsData || []).length,
      totalPointsUsed,
    };
  } catch (err) {
    console.error("Error al obtener detalle de sesión en fetchCashSessionDetail:", err);
    throw err;
  }
};
