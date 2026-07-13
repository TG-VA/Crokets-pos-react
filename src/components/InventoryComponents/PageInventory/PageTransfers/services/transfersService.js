import { supabase } from "../../../../../lib/supabaseClient";
import {
  getSystemLocalTimestamp,
  logInventoryMovement,
} from "../../../../../utils/inventoryMovements";

import {
  createTransferFolio,
  createTransferId,
  normalizeTransferOrder,
  readTransferOrders,
  writeTransferOrders,
} from "../utils/transfersUtils";

const getBranchFallback = (currentBranch) => {
  if (!currentBranch?.id) {
    return [];
  }

  return [
    {
      id: currentBranch.id,
      name: currentBranch.name || "Sucursal actual",
      code: currentBranch.code || "",
    },
  ];
};

const getProductId = (product) => {
  return product?.productId || product?.product_id || product?.id || null;
};

const getProductPrices = (product) => {
  return {
    costPrice: Number(product?.costo ?? product?.costPrice ?? 0) || 0,
    salePrice: Number(product?.precio ?? product?.salePrice ?? 0) || 0,
  };
};

const getMovementReason = ({
  folio,
  action,
  counterpartBranchName,
  note = "",
}) => {
  const baseReason = `TRASPASO ${action} ${folio} ${counterpartBranchName}`.trim();

  if (!note) {
    return baseReason;
  }

  return `${baseReason} - ${String(note).trim()}`;
};

const findInventoryRow = async ({ branchId, productId }) => {
  const { data, error } = await supabase
    .from("branch_inventory")
    .select("id, stock")
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

const applyInventoryDelta = async ({
  branchId,
  product,
  deltaQuantity,
  reason,
  userId = null,
  movementCreatedAt,
  databaseTimestamp,
}) => {
  const productId = getProductId(product);

  if (!branchId || !productId) {
    throw new Error("No se pudo aplicar el movimiento del traspaso.");
  }

  const normalizedDelta = Number(deltaQuantity);

  if (!Number.isFinite(normalizedDelta) || normalizedDelta === 0) {
    return;
  }

  const inventoryRow = await findInventoryRow({
    branchId,
    productId,
  });

  const previousStock = Number(inventoryRow?.stock ?? 0);
  const newStock = previousStock + normalizedDelta;

  if (newStock < 0) {
    throw new Error(
      `El producto ${product?.name || product?.descripcion || "seleccionado"} no tiene existencia suficiente para completar el traspaso.`
    );
  }

  const { costPrice, salePrice } = getProductPrices(product);

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
      initialStock: normalizedDelta,
      costPrice,
      salePrice,
      createdAt: databaseTimestamp,
    });
  }

  await logInventoryMovement({
    branchId,
    productId,
    movementType: "adjustment",
    quantity: normalizedDelta,
    previousStock,
    newStock,
    reason,
    userId,
    createdAt: movementCreatedAt,
  });
};

const buildTransferItems = (items = []) => {
  return items.map((item) => ({
    productId: getProductId(item),
    barcode: String(item?.barcode ?? item?.codigo ?? "").trim() || "—",
    name:
      String(item?.name ?? item?.descripcion ?? "").trim() ||
      "PRODUCTO SIN NOMBRE",
    requestedQty: Number(item?.quantity ?? item?.requestedQty ?? 0) || 0,
    receivedQty: 0,
    returnedQty: 0,
    ...getProductPrices(item),
  }));
};

const validateTransferItems = (items = []) => {
  const normalizedItems = buildTransferItems(items).filter(
    (item) => item.productId && item.requestedQty > 0
  );

  if (normalizedItems.length === 0) {
    throw new Error("Agrega al menos un producto al traspaso.");
  }

  return normalizedItems;
};

export const fetchTransferBranchOptions = async (currentBranch) => {
  try {
    const { data, error } = await supabase
      .from("branches")
      .select("id, name, code")
      .order("name", {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("No se pudieron cargar las sucursales para traspasos:", error);
    return getBranchFallback(currentBranch);
  }
};

export const loadStoredTransfers = () => {
  return readTransferOrders();
};

export const createTransferOrder = async ({
  originBranch,
  destinationBranch,
  items,
  notes = "",
  user = null,
}) => {
  if (!originBranch?.id) {
    throw new Error("No hay una sucursal origen activa.");
  }

  if (!destinationBranch?.id) {
    throw new Error("Selecciona la sucursal destino.");
  }

  if (originBranch.id === destinationBranch.id) {
    throw new Error("La sucursal destino debe ser distinta a la origen.");
  }

  const normalizedItems = validateTransferItems(items);
  const folio = createTransferFolio();
  const now = new Date();
  const movementCreatedAt = getSystemLocalTimestamp(now);
  const databaseTimestamp = now.toISOString();

  for (const item of normalizedItems) {
    await applyInventoryDelta({
      branchId: originBranch.id,
      product: item,
      deltaQuantity: item.requestedQty * -1,
      reason: getMovementReason({
        folio,
        action: "ENVIADO A",
        counterpartBranchName: destinationBranch.name || "SUCURSAL DESTINO",
        note: notes,
      }),
      userId: user?.id || null,
      movementCreatedAt,
      databaseTimestamp,
    });
  }

  const transferOrder = normalizeTransferOrder({
    id: createTransferId(),
    folio,
    status: "pending_receipt",
    notes,
    createdAt: databaseTimestamp,
    createdByUserId: user?.id || null,
    createdByUsername: user?.username || user?.email || "SISTEMA",
    originBranchId: originBranch.id,
    originBranchName: originBranch.name || "SUCURSAL ORIGEN",
    destinationBranchId: destinationBranch.id,
    destinationBranchName: destinationBranch.name || "SUCURSAL DESTINO",
    items: normalizedItems,
  });

  const updatedOrders = writeTransferOrders([
    transferOrder,
    ...readTransferOrders(),
  ]);

  return updatedOrders.find((order) => order.id === transferOrder.id) || transferOrder;
};

export const receiveTransferOrder = async ({
  transferOrderId,
  receivedQuantities = {},
  currentBranch,
  user = null,
}) => {
  if (!currentBranch?.id) {
    throw new Error("No hay una sucursal activa para recibir el traspaso.");
  }

  const storedOrders = readTransferOrders();
  const transferOrder = storedOrders.find((order) => order.id === transferOrderId);

  if (!transferOrder) {
    throw new Error("No se encontró la orden de traspaso.");
  }

  if (transferOrder.destinationBranchId !== currentBranch.id) {
    throw new Error("Esta orden no corresponde a la sucursal activa.");
  }

  if (transferOrder.status !== "pending_receipt") {
    throw new Error("La orden seleccionada ya fue recibida.");
  }

  const now = new Date();
  const movementCreatedAt = getSystemLocalTimestamp(now);
  const databaseTimestamp = now.toISOString();

  const completedItems = [];

  for (const item of transferOrder.items) {
    const requestedQty = Number(item?.requestedQty ?? 0) || 0;
    const parsedReceivedQty = Number(
      receivedQuantities[item.productId] ?? requestedQty
    );

    if (
      !Number.isFinite(parsedReceivedQty) ||
      parsedReceivedQty < 0 ||
      parsedReceivedQty > requestedQty
    ) {
      throw new Error(
        `La recepción de ${item.name} debe estar entre 0 y ${requestedQty} piezas.`
      );
    }

    const receivedQty = Math.floor(parsedReceivedQty);
    const returnedQty = requestedQty - receivedQty;

    if (receivedQty > 0) {
      await applyInventoryDelta({
        branchId: transferOrder.destinationBranchId,
        product: item,
        deltaQuantity: receivedQty,
        reason: getMovementReason({
          folio: transferOrder.folio,
          action: "RECIBIDO DE",
          counterpartBranchName: transferOrder.originBranchName,
        }),
        userId: user?.id || null,
        movementCreatedAt,
        databaseTimestamp,
      });
    }

    if (returnedQty > 0) {
      await applyInventoryDelta({
        branchId: transferOrder.originBranchId,
        product: item,
        deltaQuantity: returnedQty,
        reason: getMovementReason({
          folio: transferOrder.folio,
          action: "DEVOLUCION AUTOMATICA A",
          counterpartBranchName: transferOrder.originBranchName,
          note: `Diferencia en recepcion hacia ${transferOrder.destinationBranchName}`,
        }),
        userId: user?.id || null,
        movementCreatedAt,
        databaseTimestamp,
      });
    }

    completedItems.push({
      ...item,
      receivedQty,
      returnedQty,
    });
  }

  const nextStatus = completedItems.some((item) => item.returnedQty > 0)
    ? "received_with_difference"
    : "received_complete";

  const updatedOrder = normalizeTransferOrder({
    ...transferOrder,
    status: nextStatus,
    receivedAt: databaseTimestamp,
    receivedByUserId: user?.id || null,
    receivedByUsername: user?.username || user?.email || "SISTEMA",
    items: completedItems,
  });

  const updatedOrders = writeTransferOrders(
    storedOrders.map((order) =>
      order.id === transferOrderId ? updatedOrder : order
    )
  );

  return updatedOrders.find((order) => order.id === transferOrderId) || updatedOrder;
};

export const cancelTransferOrder = async ({
  transferOrderId,
  currentBranch,
  user = null,
}) => {
  if (!currentBranch?.id) {
    throw new Error("No hay una sucursal activa para cancelar el traspaso.");
  }

  const storedOrders = readTransferOrders();
  const transferOrder = storedOrders.find((order) => order.id === transferOrderId);

  if (!transferOrder) {
    throw new Error("No se encontró la orden de traspaso.");
  }

  if (transferOrder.originBranchId !== currentBranch.id) {
    throw new Error("Solo la sucursal origen puede cancelar este traspaso.");
  }

  if (transferOrder.status !== "pending_receipt") {
    throw new Error(
      "Solo se pueden cancelar órdenes pendientes de recepción."
    );
  }

  const now = new Date();
  const movementCreatedAt = getSystemLocalTimestamp(now);
  const databaseTimestamp = now.toISOString();

  for (const item of transferOrder.items) {
    const requestedQty = Number(item?.requestedQty ?? 0) || 0;

    if (requestedQty <= 0) {
      continue;
    }

    await applyInventoryDelta({
      branchId: transferOrder.originBranchId,
      product: item,
      deltaQuantity: requestedQty,
      reason: getMovementReason({
        folio: transferOrder.folio,
        action: "CANCELADO Y DEVUELTO A",
        counterpartBranchName: transferOrder.originBranchName,
        note: `Cancelado antes de recibir en ${transferOrder.destinationBranchName}`,
      }),
      userId: user?.id || null,
      movementCreatedAt,
      databaseTimestamp,
    });
  }

  const updatedOrder = normalizeTransferOrder({
    ...transferOrder,
    status: "cancelled",
    cancelledAt: databaseTimestamp,
    cancelledByUserId: user?.id || null,
    cancelledByUsername: user?.username || user?.email || "SISTEMA",
  });

  const updatedOrders = writeTransferOrders(
    storedOrders.map((order) =>
      order.id === transferOrderId ? updatedOrder : order
    )
  );

  return updatedOrders.find((order) => order.id === transferOrderId) || updatedOrder;
};
