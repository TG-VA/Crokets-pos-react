import { supabase } from "../../../../../lib/supabaseClient";

const getProductId = (product) => {
  return product?.product_id || product?.id || null;
};

// `null` es la senal de entrada manual: la RPC valoriza la mercancia al CPP
// vigente y lo deja intacto. Un valor no numerico se trata igual, como hacia
// `resolveIncomingCostPrice` antes de mover el calculo al servidor.
const toIncomingCostParam = (incomingCostPrice) => {
  if (incomingCostPrice === null || incomingCostPrice === undefined) {
    return null;
  }

  const parsed = Number(incomingCostPrice);

  return Number.isFinite(parsed) ? parsed : null;
};

const toNumber = (value) => {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
};

// `add_inventory_entry` usa 42501 tanto para la falta de autorizacion como para
// la falta de acceso a la sucursal; solo la primera se resuelve autorizando.
// El texto es contrato con la migracion: lo fija `addInventoryEntryAdminGrantContract.test.js`.
export const ADMIN_GRANT_REQUIRED_MESSAGE =
  "requiere la autorizacion de un administrador";

/**
 * Indica si la RPC rechazo el alta porque la autorizacion del administrador no
 * existe o ya vencio.
 */
export const isAdminGrantRequiredError = (error) => {
  return (
    error?.code === "42501" &&
    String(error?.message ?? "").includes(ADMIN_GRANT_REQUIRED_MESSAGE)
  );
};

/**
 * Registra una entrada de inventario en la sucursal activa.
 *
 * El stock, el CPP y el movimiento del kardex se escriben en una sola
 * transaccion dentro de `add_inventory_entry`: dos terminales que agregan el
 * mismo producto a la vez no pierden sumas y un fallo no deja stock sin
 * movimiento.
 */
export const addInventoryToProduct = async ({
  branchId,
  product,
  quantity,
  incomingCostPrice = null,
}) => {
  if (!branchId) {
    throw new Error("No hay una sucursal activa para registrar el inventario.");
  }

  const productId = getProductId(product);

  if (!productId) {
    throw new Error("No se detectó el identificador del producto.");
  }

  const normalizedQuantity = Number(quantity);

  if (!Number.isFinite(normalizedQuantity) || normalizedQuantity <= 0) {
    throw new Error("La cantidad debe ser mayor a 0.");
  }

  const { data, error } = await supabase.rpc("add_inventory_entry", {
    p_branch_id: branchId,
    p_product_id: productId,
    p_quantity: normalizedQuantity,
    p_incoming_cost: toIncomingCostParam(incomingCostPrice),
  });

  if (error) {
    throw error;
  }

  return {
    productId,
    previousStock: toNumber(data?.previousStock),
    newStock: toNumber(data?.newStock),
    quantity: normalizedQuantity,
    previousCostPrice: toNumber(data?.previousCostPrice),
    costPrice: toNumber(data?.costPrice),
  };
};
