import { supabase } from "../../../lib/supabaseClient";

const POINTS_AMOUNT_SETTING_KEY = "customer_points_amount_per_point";
const DEFAULT_POINTS_AMOUNT = 50;

export const formatCurrency = (value) => `$${Number(value || 0).toFixed(2)}`;

export const getCustomerPointsAmountPerPoint = async () => {
  try {
    const { data, error } = await supabase
      .from("system_settings")
      .select("setting_value, is_active")
      .eq("setting_key", POINTS_AMOUNT_SETTING_KEY)
      .is("branch_id", null)
      .maybeSingle();

    if (error) throw error;
    const configuredAmount = Number(data?.setting_value || 0);
    if (data?.is_active === false || !configuredAmount || configuredAmount <= 0) return DEFAULT_POINTS_AMOUNT;
    return configuredAmount;
  } catch (error) {
    console.error("Error cargando regla de puntos:", error);
    return DEFAULT_POINTS_AMOUNT;
  }
};

export const reverseCustomerPointsByPartialReturn = async ({ selectedTicket, totalRefund, returnReason, user, branch }) => {
  if (!selectedTicket?.id) return { registered: false, points: 0, reason: "NO_SALE" };

  const amountPerPoint = await getCustomerPointsAmountPerPoint();
  if (!amountPerPoint || amountPerPoint <= 0) return { registered: false, points: 0, reason: "INVALID_RULE" };

  const { data: salePointRows, error: salePointsError } = await supabase
    .from("customer_points")
    .select("customer_id, points")
    .eq("related_sale_id", selectedTicket.id)
    .eq("source", "sale");

  if (salePointsError) throw salePointsError;

  const earnedPoints = (salePointRows || []).reduce((acc, row) => acc + (Number(row.points || 0) > 0 ? Number(row.points) : 0), 0);
  const customerId = (salePointRows || []).find((row) => row.customer_id)?.customer_id;
  if (!customerId || earnedPoints <= 0) return { registered: false, points: 0, reason: "NO_EARNED_POINTS" };

  const [partialPointsRes, balanceRes, returnsRes] = await Promise.all([
    supabase.from("customer_points").select("points").eq("customer_id", customerId).eq("related_sale_id", selectedTicket.id).eq("source", "partial_return"),
    supabase.from("customer_points").select("points").eq("customer_id", customerId),
    supabase.from("sale_returns").select("total_refund").eq("sale_id", selectedTicket.id),
  ]);

  if (partialPointsRes.error) throw partialPointsRes.error;
  if (balanceRes.error) throw balanceRes.error;
  if (returnsRes.error) throw returnsRes.error;

  const alreadyReversedByReturns = (partialPointsRes.data || []).reduce((acc, row) => acc + Math.abs(Math.min(Number(row.points || 0), 0)), 0);
  const currentBalance = (balanceRes.data || []).reduce((acc, row) => acc + Number(row.points || 0), 0);
  const dbReturnedTotal = (returnsRes.data || []).reduce((acc, row) => acc + Number(row.total_refund || 0), 0);
  const fallbackReturnedTotal = Number(selectedTicket.totalReturned || 0) + Number(totalRefund || 0);
  const totalReturnedForPoints = Math.max(dbReturnedTotal, fallbackReturnedTotal);

  const originalSaleTotal = Number(selectedTicket.total || 0);
  const netTotalAfterReturns = Math.max(originalSaleTotal - totalReturnedForPoints, 0);

  const pointsCustomerShouldKeep = Math.min(earnedPoints, Math.floor(netTotalAfterReturns / amountPerPoint));
  const expectedReversedPoints = Math.max(earnedPoints - pointsCustomerShouldKeep, 0);
  const pointsToReverse = expectedReversedPoints - alreadyReversedByReturns;

  if (pointsToReverse <= 0) return { registered: false, points: 0, reason: "NO_POINTS_TO_REVERSE" };

  const safePointsToReverse = Math.min(pointsToReverse, Math.max(Number(currentBalance || 0), 0));
  if (safePointsToReverse <= 0) return { registered: false, points: 0, reason: "NO_AVAILABLE_BALANCE" };

  const limitedByBalance = safePointsToReverse < pointsToReverse;
  const notes = [
    `PUNTOS DESCONTADOS POR DEVOLUCIÓN PARCIAL. MONTO DEVUELTO: ${formatCurrency(totalRefund)} MXN.`,
    `TOTAL DEVUELTO ACUMULADO: ${formatCurrency(totalReturnedForPoints)} MXN.`,
    `NETO ACTUAL DE LA VENTA: ${formatCurrency(netTotalAfterReturns)} MXN.`,
    `PUNTOS ORIGINALES: ${earnedPoints}.`,
    `PUNTOS A CONSERVAR: ${pointsCustomerShouldKeep}.`,
    returnReason.trim() ? `MOTIVO: ${returnReason.trim()}.` : "",
    limitedByBalance ? "DESCUENTO LIMITADO POR SALDO DISPONIBLE DEL CLIENTE." : "",
  ].filter(Boolean).join(" ");

  const { error: insertError } = await supabase.from("customer_points").insert([{
    id: crypto.randomUUID(), customer_id: customerId, points: -safePointsToReverse, movement_type: "redeem", source: "partial_return",
    related_sale_id: selectedTicket.id, reward_id: null, user_id: user?.id || null, branch_id: branch?.id || null, notes, created_at: new Date().toISOString(),
  }]);

  if (insertError) throw insertError;
  return { registered: true, points: safePointsToReverse };
};

export const executePartialReturnTransaction = async ({ selectedTicket, user, branch, returnReason, refundMethodId, selectedItems, totalRefund }) => {
  const { error } = await supabase.rpc("create_partial_return_transaction", {
    p_sale_id: selectedTicket.id, 
    p_user_id: user.id, 
    p_branch_id: branch.id, 
    p_return_reason: returnReason.trim(),
    p_refund_method_id: refundMethodId, 
    p_items: selectedItems.map(i => ({ sale_detail_id: i.sale_detail_id, quantity: i.quantity }))
  });
  if (error) throw error;

  let pointsResult = { registered: false, points: 0 };
  try {
    pointsResult = await reverseCustomerPointsByPartialReturn({ selectedTicket, totalRefund, returnReason, user, branch });
  } catch (e) {
    console.error("Error descontando puntos:", e);
  }

  return { success: true, pointsResult };
};