import { supabase } from "../../../../../lib/supabaseClient";

import { calculateWeightedAverageCost } from "../../../../../services/inventory/inventoryCostCalculationService";

import {
  getSystemLocalTimestamp,
  logInventoryMovement,
} from "../../../../../utils/inventoryMovements";

const getProductId = (product) => {
  return product?.product_id || product?.id || null;
};

const getSalePrice = (product) => {
  return Number(product?.precio || 0);
};

/**
 * Costo unitario de compra del lote entrante.
 *
 * Si el flujo no lo provee (altas manuales), se cae al costo del catalogo del
 * producto como fallback defensivo para no perder el costo de la entrada.
 */
const resolveIncomingCostPrice = (product, incomingCostPrice) => {
  const isProvided =
    incomingCostPrice !== null && incomingCostPrice !== undefined;
  const rawCost = isProvided
    ? incomingCostPrice
    : product?.costo || product?.cost_price || 0;

  return Number(rawCost) || 0;
};

/**
 * Costo promedio vigente de la sucursal. `branch_inventory.cost_price` manda:
 * el `??` (y no `||`) es deliberado para que un costo ya calculado en 0 no se
 * reemplace por el del catalogo. Sin fila de inventario se hereda el catalogo.
 */
const resolveCurrentCost = (product, inventoryRow) => {
  return Number(
    inventoryRow?.cost_price ?? product?.costo ?? product?.cost_price ?? 0
  );
};

const findInventoryRow = async ({ branchId, productId }) => {
  const { data, error } = await supabase
    .from("branch_inventory")
    .select("id, stock, has_been_stocked, cost_price")
    .eq("branch_id", branchId)
    .eq("product_id", productId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};

const updateInventoryRow = async ({
  inventoryRowId,
  nextStock,
  costPrice,
  salePrice,
  updatedAt,
}) => {
  const { error } = await supabase
    .from("branch_inventory")
    .update({
      stock: nextStock,
      is_active: true,
      has_been_stocked: true,
      cost_price: costPrice,
      sale_price: salePrice,
      updated_at: updatedAt,
    })
    .eq("id", inventoryRowId);

  if (error) {
    throw error;
  }
};

const insertInventoryRow = async ({
  branchId,
  productId,
  quantity,
  costPrice,
  salePrice,
  createdAt,
}) => {
  const { error } = await supabase.from("branch_inventory").insert({
    branch_id: branchId,
    product_id: productId,
    stock: quantity,
    min_stock: 0,
    max_stock: 0,
    is_active: true,
    has_been_stocked: true,
    cost_price: costPrice,
    sale_price: salePrice,
    created_at: createdAt,
    updated_at: createdAt,
  });

  if (error) {
    throw error;
  }
};

export const addInventoryToProduct = async ({
  branchId,
  product,
  quantity,
  incomingCostPrice = null,
  userId = null,
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

  const inventoryRow = await findInventoryRow({
    branchId,
    productId,
  });

  const now = new Date();
  const databaseTimestamp = now.toISOString();
  const movementCreatedAt = getSystemLocalTimestamp(now);

  const salePrice = getSalePrice(product);
  const resolvedIncomingCostPrice = resolveIncomingCostPrice(
    product,
    incomingCostPrice
  );

  const previousStock = Number(inventoryRow?.stock || 0);
  const newStock = previousStock + normalizedQuantity;

  const newCostPrice = calculateWeightedAverageCost({
    currentStock: previousStock,
    currentCost: resolveCurrentCost(product, inventoryRow),
    incomingQty: normalizedQuantity,
    incomingCost: resolvedIncomingCostPrice,
  });

  if (inventoryRow?.id) {
    await updateInventoryRow({
      inventoryRowId: inventoryRow.id,
      nextStock: newStock,
      costPrice: newCostPrice,
      salePrice,
      updatedAt: databaseTimestamp,
    });
  } else {
    await insertInventoryRow({
      branchId,
      productId,
      quantity: normalizedQuantity,
      costPrice: newCostPrice,
      salePrice,
      createdAt: databaseTimestamp,
    });
  }

  await logInventoryMovement({
    branchId,
    productId,
    movementType: "inventory_add",
    quantity: normalizedQuantity,
    previousStock,
    newStock,
    unitCost: resolvedIncomingCostPrice,
    totalCost: Number(resolvedIncomingCostPrice * normalizedQuantity),
    reason: "Alta a inventario (manual)",
    userId,
    createdAt: movementCreatedAt,
  });

  return {
    productId,
    previousStock,
    newStock,
    quantity: normalizedQuantity,
    costPrice: newCostPrice,
  };
};
