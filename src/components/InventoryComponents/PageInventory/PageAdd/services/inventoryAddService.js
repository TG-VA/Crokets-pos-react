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

const findInventoryRow = async ({ branchId, productId }) => {
  const { data, error } = await supabase
    .from("branch_inventory")
    .select("id, stock, has_been_stocked")
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
  const { error } = await supabase
    .from("branch_inventory")
    .insert({
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
  userId = null,
}) => {
  if (!branchId) {
    throw new Error(
      "No hay una sucursal activa para registrar el inventario."
    );
  }

  const productId = getProductId(product);

  if (!productId) {
    throw new Error("No se detectó el identificador del producto.");
  }

  const normalizedQuantity = Number(quantity);

  if (
    !Number.isFinite(normalizedQuantity) ||
    normalizedQuantity <= 0
  ) {
    throw new Error("La cantidad debe ser mayor a 0.");
  }

  const inventoryRow = await findInventoryRow({
    branchId,
    productId,
  });

  const now = new Date();
  const databaseTimestamp = now.toISOString();
  const movementCreatedAt = getSystemLocalTimestamp(now);

  const { costPrice, salePrice } = getProductPrices(product);

  const previousStock = Number(inventoryRow?.stock || 0);
  const newStock = previousStock + normalizedQuantity;

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
      quantity: normalizedQuantity,
      costPrice,
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
    reason: "Alta a inventario (manual)",
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