import { supabase } from "../lib/supabaseClient";

const MOVEMENTS_TABLE_CACHE_KEY = "inventoryMovementsSelectedTable_v1";

export const getSystemLocalTimestamp = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

const getCandidateTables = () => {
  const envTable = import.meta.env.VITE_INVENTORY_MOVEMENTS_TABLE;
  return [
    envTable,
    "inventory_movements",
    "inventory_movement",
    "stock_movements",
    "inventory_movements_log",
  ].filter(Boolean);
};

export const detectInventoryMovementsTable = async () => {
  const cached = localStorage.getItem(MOVEMENTS_TABLE_CACHE_KEY);
  if (cached) return cached;

  const candidates = getCandidateTables();

  for (const table of candidates) {
    try {
      const { error } = await supabase
        .from(table)
        .select("id", { head: true })
        .limit(1);

      if (!error) {
        localStorage.setItem(MOVEMENTS_TABLE_CACHE_KEY, table);
        return table;
      }
    } catch (err) {
      console.error("Error detectando tabla de movimientos:", err);
    }
  }

  return null;
};

const getSessionUserId = async () => {
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.user?.id || null;
  } catch (err) {
    return null;
  }
};

const buildInsertPayload = (movement) => {
  const {
    saleId,
    branchId,
    productId,
    movementType,
    quantity,
    previousStock,
    newStock,
    reason,
    userId,
    createdAt,
  } = movement || {};

  return {
    sale_id: saleId || null,
    branch_id: branchId || null,
    product_id: productId || null,
    movement_type: movementType || null,
    quantity: Number.isFinite(Number(quantity)) ? Number(quantity) : 0,
    previous_stock: Number.isFinite(Number(previousStock))
      ? Number(previousStock)
      : null,
    new_stock: Number.isFinite(Number(newStock)) ? Number(newStock) : null,
    reason: reason ? String(reason).trim() : null,
    user_id: userId || null,
    created_at: createdAt ? String(createdAt) : null,
  };
};

export const logInventoryMovement = async (movement) => {
  const table = await detectInventoryMovementsTable();
  if (!table) {
    return { success: false, skipped: true, error: "No hay tabla de movimientos." };
  }

  const resolvedUserId = movement?.userId || (await getSessionUserId());

  const fullPayload = buildInsertPayload({
    ...movement,
    userId: resolvedUserId,
  });

  try {
    const { error } = await supabase.from(table).insert(fullPayload);
    if (!error) return { success: true, skipped: false, error: null };

    const message = String(error.message || "").toLowerCase();
    const missingColumn =
      message.includes("column") && (message.includes("does not exist") || message.includes("not found"));

    const invalidMovementType =
      message.includes("movement_type") &&
      (message.includes("invalid input value for enum") ||
        message.includes("violates check constraint") ||
        message.includes("check constraint"));

    const invalidQuantity =
      message.includes("quantity") &&
      (message.includes("violates check constraint") ||
        message.includes("check constraint"));

    if (invalidMovementType) {
      const originalType = fullPayload.movement_type || "";
      const nextReason = fullPayload.reason
        ? `${originalType}: ${fullPayload.reason}`
        : originalType || null;

      const { error: retryError } = await supabase.from(table).insert({
        ...fullPayload,
        movement_type: "adjustment",
        reason: nextReason,
      });

      if (!retryError) return { success: true, skipped: false, error: null };
      console.error("Error insertando movimiento (retry tipo):", retryError);
      return {
        success: false,
        skipped: false,
        error: retryError.message || "Error insertando movimiento.",
      };
    }

    if (invalidQuantity) {
      const originalQty = fullPayload.quantity;
      const originalType = fullPayload.movement_type || "";
      const nextReason = fullPayload.reason
        ? `${originalType}: ${fullPayload.reason}`
        : originalType || null;

      const { error: retryError } = await supabase.from(table).insert({
        ...fullPayload,
        quantity: 1,
        movement_type: "adjustment",
        reason: nextReason
          ? `${nextReason} (QTY:${originalQty})`
          : `(QTY:${originalQty})`,
      });

      if (!retryError) return { success: true, skipped: false, error: null };
      console.error("Error insertando movimiento (retry qty):", retryError);
      return {
        success: false,
        skipped: false,
        error: retryError.message || "Error insertando movimiento.",
      };
    }

    if (!missingColumn) {
      console.error("Error insertando movimiento:", error);
      return { success: false, skipped: false, error: error.message || "Error insertando movimiento." };
    }

    const minimalPayload = {
      sale_id: fullPayload.sale_id,
      branch_id: fullPayload.branch_id,
      product_id: fullPayload.product_id,
      movement_type: fullPayload.movement_type,
      quantity: fullPayload.quantity,
      reason: fullPayload.reason,
      user_id: fullPayload.user_id,
      created_at: fullPayload.created_at,
    };

    const { error: minimalError } = await supabase.from(table).insert(minimalPayload);
    if (!minimalError) return { success: true, skipped: false, error: null };

    console.error("Error insertando movimiento (fallback):", minimalError);
    return {
      success: false,
      skipped: false,
      error: minimalError.message || "Error insertando movimiento.",
    };
  } catch (err) {
    console.error("Error inesperado insertando movimiento:", err);
    return { success: false, skipped: false, error: err.message || "Error insertando movimiento." };
  }
};
