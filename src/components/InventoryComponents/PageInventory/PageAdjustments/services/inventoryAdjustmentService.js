import { supabase } from "../../../../../lib/supabaseClient";

import {
  getSystemLocalTimestamp,
  logInventoryMovement,
} from "../../../../../utils/inventoryMovements";

const getProductId = (product) => {
  return product?.product_id || product?.id || null;
};

const getProductPrices = (product) => {
  return {
    costPrice: Number(product?.costo || 0),
    salePrice: Number(product?.precio || 0),
  };
};

const buildMovementReason = ({ reason, notes }) => {
  const cleanReason = String(reason ?? "").trim();
  const cleanNotes = String(notes ?? "").trim();

  return cleanNotes
    ? `${cleanReason} - ${cleanNotes}`
    : cleanReason;
};

const findInventoryRow = async ({
  branchId,
  productId,
}) => {
  const { data, error } = await supabase
    .from("branch_inventory")
    .select("id, stock, has_been_stocked, is_active")
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
  initialStock,
  costPrice,
  salePrice,
  createdAt,
}) => {
  const { error } = await supabase
    .from("branch_inventory")
    .insert({
      branch_id: branchId,
      product_id: productId,
      stock: initialStock,
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

export const applyInventoryAdjustment = async ({
  branchId,
  product,
  quantity,
  reason,
  notes = "",
  userId = null,
}) => {
  if (!branchId) {
    throw new Error(
      "No hay una sucursal activa para aplicar el ajuste."
    );
  }

  const productId = getProductId(product);

  if (!productId) {
    throw new Error(
      "No se detectó el identificador del producto."
    );
  }

  const normalizedQuantity = Number(quantity);

  if (
    !Number.isFinite(normalizedQuantity) ||
    normalizedQuantity === 0
  ) {
    throw new Error(
      "La diferencia debe ser distinta de 0."
    );
  }

  const cleanReason = String(reason ?? "").trim();

  if (!cleanReason) {
    throw new Error(
      "Captura el motivo del ajuste."
    );
  }

  const inventoryRow = await findInventoryRow({
    branchId,
    productId,
  });

  const previousStock = Number(
    inventoryRow?.stock || 0
  );

  const newStock =
    previousStock + normalizedQuantity;

  if (newStock < 0) {
    const error = new Error(
      `No puedes dejar el stock en negativo.\n\nStock actual: ${previousStock}\nAjuste: ${normalizedQuantity}\nResultado: ${newStock}`
    );

    error.code = "NEGATIVE_STOCK";
    throw error;
  }

  if (!inventoryRow?.id && normalizedQuantity < 0) {
    const error = new Error(
      "Este producto aún no existe en el inventario de la sucursal. Primero agrégalo con una entrada positiva."
    );

    error.code = "INVENTORY_NOT_REGISTERED";
    throw error;
  }

  const now = new Date();
  const databaseTimestamp = now.toISOString();
  const movementCreatedAt =
    getSystemLocalTimestamp(now);

  const { costPrice, salePrice } =
    getProductPrices(product);

  if (inventoryRow?.id) {
    await updateInventoryRow({
      inventoryRowId: inventoryRow.id,
      nextStock: newStock,
      costPrice,
      salePrice,
      updatedAt: databaseTimestamp,
    });
  } else {
    await insertInventoryRow({
      branchId,
      productId,
      initialStock: normalizedQuantity,
      costPrice,
      salePrice,
      createdAt: databaseTimestamp,
    });
  }

  await logInventoryMovement({
    branchId,
    productId,
    movementType: "adjustment",
    quantity: normalizedQuantity,
    previousStock,
    newStock,
    reason: buildMovementReason({
      reason: cleanReason,
      notes,
    }),
    userId,
    createdAt: movementCreatedAt,
  });

  return {
    productId,
    previousStock,
    newStock,
    quantity: normalizedQuantity,
  };
};