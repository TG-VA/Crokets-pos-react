import { ADMIN_GRANT_REQUIRED_HINT } from "../../../../../lib/adminAuthorizationService";
import { supabase } from "../../../../../lib/supabaseClient";

const getProductId = (product) => {
  return product?.product_id || product?.id || null;
};

const toNumber = (value) => {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
};

// La RPC distingue con `hint` los rechazos de negocio que la pantalla explica
// con su propio titulo. El texto es contrato con la migracion: lo fija
// `applyInventoryAdjustmentContract.test.js`.
export const ADJUSTMENT_ERROR_HINTS = [
  "NEGATIVE_STOCK",
  "INVENTORY_NOT_REGISTERED",
];

// Hint con el que la RPC rechaza a quien no es admin ni tiene autorizacion
// vigente; distingue ese 42501 de la falta de acceso a la sucursal.
export { ADMIN_GRANT_REQUIRED_HINT };

/**
 * Indica si la RPC rechazo el ajuste porque la autorizacion del administrador
 * no existe o ya vencio.
 */
export const isAdminGrantRequiredError = (error) =>
  error?.code === "42501" && error.hint === ADMIN_GRANT_REQUIRED_HINT;

const toAdjustmentError = (error) => {
  if (!ADJUSTMENT_ERROR_HINTS.includes(error?.hint)) {
    return error;
  }

  const adjustmentError = new Error(error.message);
  adjustmentError.code = error.hint;

  return adjustmentError;
};

/**
 * Aplica un ajuste de inventario (positivo o negativo) en la sucursal activa.
 *
 * El stock y el movimiento del kardex se escriben en una sola transaccion
 * dentro de `apply_inventory_adjustment`, que bloquea la fila, valida el stock
 * resultante con el dato vigente y no altera el costo promedio de la sucursal.
 */
export const applyInventoryAdjustment = async ({
  branchId,
  product,
  quantity,
  reason,
  notes = "",
}) => {
  if (!branchId) {
    throw new Error("No hay una sucursal activa para aplicar el ajuste.");
  }

  const productId = getProductId(product);

  if (!productId) {
    throw new Error("No se detectó el identificador del producto.");
  }

  const normalizedQuantity = Number(quantity);

  if (!Number.isFinite(normalizedQuantity) || normalizedQuantity === 0) {
    throw new Error("La diferencia debe ser distinta de 0.");
  }

  const cleanReason = String(reason ?? "").trim();

  if (!cleanReason) {
    throw new Error("Captura el motivo del ajuste.");
  }

  const { data, error } = await supabase.rpc("apply_inventory_adjustment", {
    p_branch_id: branchId,
    p_product_id: productId,
    p_quantity: normalizedQuantity,
    p_reason: cleanReason,
    p_notes: String(notes ?? "").trim() || null,
  });

  if (error) {
    throw toAdjustmentError(error);
  }

  return {
    productId,
    previousStock: toNumber(data?.previousStock),
    newStock: toNumber(data?.newStock),
    quantity: normalizedQuantity,
  };
};
