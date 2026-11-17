import { supabase } from "../../../../../lib/supabaseClient";
import { fetchOperationalBranches } from "../../../../../services/branchScopeService";

import {
  isReceiptComplete,
  getReceivedQuantitiesPayload,
  getMissingReceiptItems,
  getNonIntegerReceiptItems,
} from "../utils/ordersCalculationService";
import {
  normalizeReceiptNote,
  validateReceiptNote,
} from "../utils/receiptNoteCalculationService";
import { getBranchFallback } from "../../PageTransfers/utils/transfersCalculationService";
import { toUpperLabel } from "../utils/ordersFormatters";
import { fetchStoreOrderById, STORE_ORDER_SELECT } from "./ordersDetailService";

export const fetchOrderBranchOptions = async (currentBranch) => {
  try {
    const { data, error } = await fetchOperationalBranches({
      activeOnly: true,
    });

    if (error) {
      throw error;
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(
      "No se pudieron cargar las sucursales para pedidos de abastecimiento:",
      error
    );

    return getBranchFallback(currentBranch);
  }
};

export const loadStoreOrders = async () => {
  const { data, error } = await supabase
    .from("store_orders")
    .select(STORE_ORDER_SELECT)
    .order("sent_at", { ascending: false });

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data : [];
};

export const countPendingStoreOrders = async (branchId) => {
  if (!branchId) return 0;

  const { count, error } = await supabase
    .from("store_orders")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
    .eq("to_branch_id", branchId);

  if (error) {
    throw error;
  }

  return Number.isFinite(count) ? count : 0;
};

const validateOrderDraft = ({
  orderName,
  originBranchId,
  destinationBranchId,
  user,
  items,
}) => {
  if (!originBranchId) {
    throw new Error("No hay una sucursal origen activa.");
  }

  if (!destinationBranchId) {
    throw new Error("Selecciona la sucursal destino.");
  }

  if (originBranchId === destinationBranchId) {
    throw new Error("La sucursal destino debe ser distinta a la origen.");
  }

  if (!user?.id) {
    throw new Error("No se detectó el usuario que genera el pedido.");
  }

  if (!orderName || !orderName.trim()) {
    throw new Error("Captura un nombre para identificar el pedido.");
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Agrega al menos un producto al pedido.");
  }

  const invalidItem = items.find((item) => {
    const quantity = Number(item.expectedQty);
    return !Number.isInteger(quantity) || quantity <= 0;
  });

  if (invalidItem) {
    throw new Error(
      `La cantidad esperada de ${invalidItem.productName || "un producto"} debe ser un numero entero mayor a cero.`
    );
  }

  const localItem = items.find((item) => item?.isGlobal === false);

  if (localItem) {
    throw new Error(
      `El producto ${localItem.productName || "seleccionado"} es local o no global y no se puede enviar a otra sucursal.`
    );
  }
};

const fetchOrderSnapshotOrFail = async (orderId, failureMessage) => {
  const order = await fetchStoreOrderById(orderId);

  if (!order) {
    throw new Error(failureMessage);
  }

  return order;
};

export const createStoreOrder = async ({
  orderName,
  originBranchId,
  destinationBranchId,
  items,
  notes = "",
  user = null,
}) => {
  validateOrderDraft({
    orderName,
    originBranchId,
    destinationBranchId,
    user,
    items,
  });

  const payloadItems = items.map((item) => ({
    productId: item.productId,
    expectedQty: Number(item.expectedQty),
  }));

  const { data, error } = await supabase.rpc("create_store_order", {
    p_order_name: toUpperLabel(orderName),
    p_from_branch_id: originBranchId,
    p_to_branch_id: destinationBranchId,
    p_user_id: user.id,
    p_notes: notes?.trim() || null,
    p_items: payloadItems,
  });

  if (error) {
    throw error;
  }

  if (!data?.success || !data?.orderId) {
    throw new Error("La sucursal no confirmó la creación del pedido.");
  }

  return fetchOrderSnapshotOrFail(
    data.orderId,
    "El pedido se creó, pero no se pudo recuperar su detalle. Recarga el historial antes de volver a intentarlo."
  );
};

export const receiveStoreOrder = async ({
  order,
  currentBranchId,
  quantities,
  receiptNote = "",
  user = null,
}) => {
  if (!order?.id) {
    throw new Error("Selecciona un pedido válido para recibir.");
  }

  if (!currentBranchId || order.toBranchId !== currentBranchId) {
    throw new Error("El pedido no corresponde a la sucursal activa.");
  }

  if (order.status !== "pending") {
    throw new Error("Solo se pueden recibir pedidos pendientes.");
  }

  if (!user?.id) {
    throw new Error("No se detectó el usuario que recibe el pedido.");
  }

  if (!isReceiptComplete(order.items, quantities)) {
    const missing = getMissingReceiptItems(order.items, quantities);

    throw new Error(
      `Captura el conteo físico de todos los productos (${missing.length} pendiente(s)).`
    );
  }

  const nonIntegerItems = getNonIntegerReceiptItems(order.items, quantities);

  if (nonIntegerItems.length > 0) {
    const names = nonIntegerItems
      .map((item) => item.productName)
      .filter(Boolean)
      .join(", ");

    throw new Error(
      `Captura cantidades enteras para recibir el pedido${names ? `: ${names}` : ""}.`
    );
  }

  const receiptNoteError = validateReceiptNote({
    items: order.items,
    quantities,
    note: receiptNote,
  });

  if (receiptNoteError) {
    throw new Error(receiptNoteError);
  }

  const { data, error } = await supabase.rpc("receive_store_order", {
    p_order_id: order.id,
    p_to_branch_id: currentBranchId,
    p_user_id: user.id,
    p_received_qty_map: getReceivedQuantitiesPayload(order.items, quantities),
    p_receipt_notes: normalizeReceiptNote(receiptNote) || null,
  });

  if (error) {
    throw error;
  }

  if (!data?.success) {
    throw new Error("La sucursal no confirmó la recepción del pedido.");
  }

  return fetchOrderSnapshotOrFail(
    order.id,
    "La recepción se registró, pero no se pudo recuperar el pedido. Recarga el historial antes de continuar."
  );
};
