import { supabase } from "../../../lib/supabaseClient";

export const DEFAULT_POINTS_AMOUNT = 50;
const POINTS_AMOUNT_SETTING_KEY = "customer_points_amount_per_point";

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

    if (data?.is_active === false || configuredAmount <= 0) {
      return DEFAULT_POINTS_AMOUNT;
    }

    return configuredAmount;
  } catch (error) {
    console.error("Error cargando regla de puntos:", error);
    return DEFAULT_POINTS_AMOUNT;
  }
};

export const calculateEarnedCustomerPoints = (saleTotal, amountPerPoint) => {
  const numericTotal = Number(saleTotal || 0);
  const numericAmountPerPoint = Number(amountPerPoint || 0);

  if (numericTotal <= 0 || numericAmountPerPoint <= 0) return 0;

  return Math.floor(numericTotal / numericAmountPerPoint);
};

export const getCustomerCurrentPointsBalance = async (customerId) => {
  if (!customerId) return 0;

  const { data, error } = await supabase
    .from("customer_points")
    .select("points")
    .eq("customer_id", customerId);

  if (error) throw error;

  return (data || []).reduce((sum, movement) => sum + Number(movement.points || 0), 0);
};

export const registerCustomerPointsForSale = async ({
  saleId, customerId, saleTotal, saleDate, userId = null, branchId = null,
}) => {
  if (!saleId || !customerId) {
    return { points: 0, amountPerPoint: DEFAULT_POINTS_AMOUNT, registered: false, newBalance: null };
  }

  const amountPerPoint = await getCustomerPointsAmountPerPoint();
  const earnedPoints = calculateEarnedCustomerPoints(saleTotal, amountPerPoint);

  if (earnedPoints <= 0) {
    const currentBalance = await getCustomerCurrentPointsBalance(customerId);
    return { points: 0, amountPerPoint, registered: false, newBalance: currentBalance };
  }

  // Candado de Idempotencia: previene puntos duplicados si la red falla y se reintenta
  const { data: existingMovement, error: existingError } = await supabase
    .from("customer_points")
    .select("id")
    .eq("customer_id", customerId)
    .eq("related_sale_id", saleId)
    .eq("source", "sale")
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existingMovement?.id) {
    const currentBalance = await getCustomerCurrentPointsBalance(customerId);
    return { points: earnedPoints, amountPerPoint, registered: false, newBalance: currentBalance };
  }

  const { error: pointsInsertError } = await supabase.from("customer_points").insert([{
    id: crypto.randomUUID(),
    customer_id: customerId,
    points: earnedPoints,
    movement_type: "earn",
    source: "sale",
    related_sale_id: saleId,
    reward_id: null,
    user_id: userId,
    branch_id: branchId,
    notes: `PUNTOS GENERADOS POR VENTA. TOTAL DE VENTA: $${Number(saleTotal || 0).toFixed(2)} MXN.`,
    created_at: saleDate || new Date().toISOString(),
  }]);

  if (pointsInsertError) throw pointsInsertError;

  const newBalance = await getCustomerCurrentPointsBalance(customerId);

  return { points: earnedPoints, amountPerPoint, registered: true, newBalance };
};