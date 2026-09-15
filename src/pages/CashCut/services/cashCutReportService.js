/**
 * cashCutReportService.js
 * Servicio de consultas y escritura del modulo de Corte de cajero.
 * Punto de acceso unificado: re-exporta los calculos puros y el detalle.
 *
 * Las funciones devuelven el resultado de Supabase tal cual ({ data, error });
 * el componente decide como mapear cada resultado a su estado.
 */

import { supabase } from "../../../lib/supabaseClient";
import { CUT_SELECT_FIELDS } from "./cashCutConstants";

export {
  calculateSalesTotals,
  calculateCancellations,
  calculatePartialReturns,
  calculateRewardSummary,
  groupPaymentsByMethod,
  calculateDollarTotals,
  groupSalesByDepartment,
  calculateDepartmentsTotal,
  splitCashMovements,
  buildNetPaymentMethodDetails,
  calculateMethodTotals,
  calculateRefundsByMethod,
  calculateMethodNetTotals,
  calculateDiscountTotal,
  calculateNetSales,
  calculateCashInRegister,
  resolveCutDisplay,
} from "./cashCutCalculationService";
export { fetchHistoricalCutDetail } from "./cashCutDetailService";

/**
 * Sesion de caja abierta mas reciente del usuario.
 */
export const fetchActiveSession = async ({ userId }) =>
  supabase
    .from("cash_register_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "open")
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();

/**
 * Nombre de la sucursal por id.
 */
export const fetchBranchName = async ({ branchId }) =>
  supabase
    .from("branches")
    .select("name")
    .eq("id", branchId)
    .maybeSingle();

/**
 * Historial de cortes de turno de la sucursal (con usuario y sesion embebidos).
 */
export const fetchCutsHistory = async ({ branchId } = {}) => {
  if (!branchId) {
    return { data: [], error: null };
  }

  return supabase
    .from("cash_cuts")
    .select(CUT_SELECT_FIELDS)
    .eq("branch_id", branchId)
    .eq("cut_type", "shift")
    .order("created_at", { ascending: false })
    .limit(300);
};

/**
 * Corte de turno mas reciente de la sesion (si existe).
 */
export const fetchExistingShiftCut = async ({ sessionId }) =>
  supabase
    .from("cash_cuts")
    .select("*")
    .eq("cash_register_session_id", sessionId)
    .eq("cut_type", "shift")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

/**
 * Ventas del turno (completadas, canceladas y reembolsadas).
 * `endAt` acota el tope superior para vistas historicas.
 */
export const fetchSalesByShift = async ({
  branchId,
  userId,
  startAt,
  endAt = null,
}) => {
  let query = supabase
    .from("sales")
    .select("id, subtotal, tax, total, created_at, status")
    .eq("branch_id", branchId)
    .eq("user_id", userId)
    .in("status", ["completed", "cancelled", "refunded"])
    .gte("created_at", startAt);

  if (endAt) {
    query = query.lte("created_at", endAt);
  }

  return query;
};

/**
 * Cancelaciones del turno con el metodo de pago embebido.
 */
export const fetchCancellationsByShift = async ({
  branchId,
  userId,
  startAt,
  endAt = null,
}) => {
  let query = supabase
    .from("canceled_sales")
    .select(
      `
        id,
        sale_id,
        cancel_reason,
        refund_amount,
        refund_method_id,
        canceled_at,
        user_id,
        branch_id,
        payment_methods (
          id,
          name,
          affects_cash
        )
      `
    )
    .eq("branch_id", branchId)
    .eq("user_id", userId)
    .gte("canceled_at", startAt)
    .order("canceled_at", { ascending: false });

  if (endAt) {
    query = query.lte("canceled_at", endAt);
  }

  return query;
};

/**
 * Devoluciones parciales del turno con el metodo de pago embebido.
 */
export const fetchPartialReturnsByShift = async ({
  branchId,
  userId,
  startAt,
  endAt = null,
}) => {
  let query = supabase
    .from("sale_returns")
    .select(
      `
        id,
        sale_id,
        return_reason,
        total_refund,
        refund_method_id,
        created_at,
        user_id,
        branch_id,
        payment_methods (
          id,
          name,
          affects_cash
        )
      `
    )
    .eq("branch_id", branchId)
    .eq("user_id", userId)
    .gte("created_at", startAt)
    .order("created_at", { ascending: false });

  if (endAt) {
    query = query.lte("created_at", endAt);
  }

  return query;
};

/**
 * Canjes de recompensas de las ventas del turno. Deduplica y descarta ids vacios.
 */
export const fetchRewardRedemptions = async ({ saleIds = [] } = {}) => {
  const cleanSaleIds = [...new Set((saleIds || []).filter(Boolean))];

  if (cleanSaleIds.length === 0) {
    return { data: [], error: null };
  }

  return supabase
    .from("sale_reward_redemptions")
    .select("id, sale_id, quantity, total_points, reversed_at")
    .in("sale_id", cleanSaleIds);
};

/**
 * Pagos por venta con el metodo de pago embebido.
 */
export const fetchPaymentsByMethod = async ({ saleIds, branchId }) =>
  supabase
    .from("sale_payments")
    .select("amount, payment_method_id, payment_methods(id, name, affects_cash)")
    .in("sale_id", saleIds)
    .eq("branch_id", branchId);

/**
 * Pagos en dolares (USD) de las ventas del turno.
 */
export const fetchUsdPayments = async ({ saleIds, branchId }) =>
  supabase
    .from("sale_payments")
    .select("amount, currency, exchange_rate")
    .in("sale_id", saleIds)
    .eq("branch_id", branchId)
    .eq("currency", "USD");

/**
 * Detalle de venta con producto y departamento embebidos.
 */
export const fetchDepartmentSales = async ({ saleIds }) =>
  supabase
    .from("sale_details")
    .select("total_price, products(department_id, departments(name))")
    .in("sale_id", saleIds);

/**
 * Movimientos de caja de la sesion. `endAt` acota el tope superior historico.
 */
export const fetchCashMovementsBySession = async ({
  sessionId,
  endAt = null,
} = {}) => {
  if (!sessionId) {
    return { data: [], error: null };
  }

  let query = supabase
    .from("cash_movements")
    .select("id, movement_type, amount, description, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });

  if (endAt) {
    query = query.lte("created_at", endAt);
  }

  return query;
};

/**
 * Crea el corte de cajero y devuelve la fila creada.
 */
export const createCashCut = async (payload) =>
  supabase.from("cash_cuts").insert(payload).select().single();

/**
 * Inserta el detalle del corte por metodo de pago.
 */
export const insertCashCutDetails = async (details) =>
  supabase.from("cash_cut_details").insert(details);

/**
 * Cierra la sesion de caja via RPC.
 */
export const closeCashRegisterSession = async ({ sessionId }) =>
  supabase.rpc("close_cash_register_session", { p_session_id: sessionId });
