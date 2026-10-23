import { supabase } from "../../../../../lib/supabaseClient";

import {
  isReceiptComplete,
  getReceivedQuantitiesPayload,
  getMissingReceiptItems,
} from "../utils/ordersCalculationService";
import { getBranchFallback } from "../../PageTransfers/utils/transfersCalculationService";
import { fetchStoreOrderById, STORE_ORDER_SELECT } from "./ordersDetailService";

export const fetchOrderBranchOptions = async (currentBranch) => {
  try {
    const { data, error } = await supabase
      .from("branches")
      .select("id, name, code")
      .eq("is_active", true)
      .order("name", { ascending: true });

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
    throw new Error("No se detecto el usuario que genera el pedido.");
  }

  if (!orderName || !orderName.trim()) {
    throw new Error("Captura un nombre para identificar el pedido.");
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Agrega al menos un producto al pedido.");
  }

  const invalidItem = items.find((item) => {
    const quantity = Number(item.expectedQty);
    return !Number.isFinite(quantity) || quantity <= 0;
  });

  if (invalidItem) {
    throw new Error(
      `La cantidad esperada de ${invalidItem.productName || "un producto"} debe ser mayor a cero.`
    );
  }
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
    p_order_name: orderName.trim(),
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
    throw new Error("La sucursal no confirmo la creacion del pedido.");
  }

  return fetchStoreOrderById(data.orderId);
};

export const receiveStoreOrder = async ({
  order,
  currentBranchId,
  quantities,
  user = null,
}) => {
  if (!order?.id) {
    throw new Error("Selecciona un pedido valido para recibir.");
  }

  if (!currentBranchId || order.toBranchId !== currentBranchId) {
    throw new Error("El pedido no corresponde a la sucursal activa.");
  }

  if (order.status !== "pending") {
    throw new Error("Solo se pueden recibir pedidos pendientes.");
  }

  if (!user?.id) {
    throw new Error("No se detecto el usuario que recibe el pedido.");
  }

  if (!isReceiptComplete(order.items, quantities)) {
    const missing = getMissingReceiptItems(order.items, quantities);

    throw new Error(
      `Captura el conteo fisico de todas las partidas (${missing.length} pendiente(s)).`
    );
  }

  const { data, error } = await supabase.rpc("receive_store_order", {
    p_order_id: order.id,
    p_to_branch_id: currentBranchId,
    p_user_id: user.id,
    p_received_qty_map: getReceivedQuantitiesPayload(order.items, quantities),
  });

  if (error) {
    throw error;
  }

  if (!data?.success) {
    throw new Error("La sucursal no confirmo la recepcion del pedido.");
  }

  return fetchStoreOrderById(order.id);
};
