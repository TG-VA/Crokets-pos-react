import { supabase } from "../../../../../lib/supabaseClient";

import {
  createTransferFolio,
  normalizeTransferOrder,
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

const TRANSFER_SELECT = `
  id,
  from_branch_id,
  to_branch_id,
  user_id,
  status,
  notes,
  created_at,
  approved_at,
  completed_at,
  from_branch:branches!inventory_transfers_from_branch_id_fkey (
    id,
    name,
    code
  ),
  to_branch:branches!inventory_transfers_to_branch_id_fkey (
    id,
    name,
    code
  ),
  user:users!inventory_transfers_user_id_fkey (
    id,
    username,
    email
  ),
  inventory_transfer_items (
    id,
    product_id,
    quantity,
    cost_price,
    product:products!inventory_transfer_items_product_id_fkey (
      id,
      name,
      barcode
    )
  )
`;

const fetchTransferOrderById = async (transferOrderId) => {
  const { data, error } = await supabase
    .from("inventory_transfers")
    .select(TRANSFER_SELECT)
    .eq("id", transferOrderId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return normalizeTransferOrder(data);
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

export const loadTransferOrders = async () => {
  const { data, error } = await supabase
    .from("inventory_transfers")
    .select(TRANSFER_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (Array.isArray(data) ? data : []).map(normalizeTransferOrder);
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

  if (!user?.id) {
    throw new Error("No se detectó el usuario que genera el traspaso.");
  }

  if (originBranch.id === destinationBranch.id) {
    throw new Error("La sucursal destino debe ser distinta a la origen.");
  }

  const normalizedItems = validateTransferItems(items);
  const folio = createTransferFolio();

  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    "create_transfer_order",
    {
      p_from_branch_id: originBranch.id,
      p_to_branch_id: destinationBranch.id,
      p_user_id: user.id,
      p_notes: notes || "",
      p_folio: folio,
      p_items: normalizedItems.map((item) => ({
        productId: item.productId,
        barcode: item.barcode,
        name: item.name,
        requestedQty: item.requestedQty,
        costPrice: item.costPrice,
        salePrice: item.salePrice,
      })),
    }
  );

  if (rpcError) {
    throw new Error(
      rpcError?.message ||
        "No se pudo crear la orden de traspaso (RPC create_transfer_order)."
    );
  }

  if (!rpcResult?.success || !rpcResult?.transferId) {
    throw new Error(
      "La operación de creación no devolvió una referencia válida. Intenta nuevamente."
    );
  }

  return fetchTransferOrderById(rpcResult.transferId);
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

  const transferOrder = await fetchTransferOrderById(transferOrderId);

  if (!transferOrder) {
    throw new Error("No se encontró la orden de traspaso.");
  }

  if (transferOrder.destinationBranchId !== currentBranch.id) {
    throw new Error("Esta orden no corresponde a la sucursal activa.");
  }

  if (transferOrder.status !== "pending_receipt") {
    throw new Error("La orden seleccionada ya fue recibida.");
  }

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
  }

  const normalizedReceivedMap = {};
  for (const item of transferOrder.items) {
    const requestedQty = Number(item?.requestedQty ?? 0) || 0;
    const parsedReceivedQty = Number(
      receivedQuantities[item.productId] ?? requestedQty
    );
    normalizedReceivedMap[item.productId] = Math.floor(parsedReceivedQty);
  }

  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    "receive_transfer_order",
    {
      p_transfer_id: transferOrderId,
      p_destination_branch: currentBranch.id,
      p_user_id: user?.id || null,
      p_username: user?.username || user?.email || "SISTEMA",
      p_received_qty_map: normalizedReceivedMap,
    }
  );

  if (rpcError) {
    throw new Error(
      rpcError?.message ||
        "No se pudo recibir la orden de traspaso (RPC receive_transfer_order)."
    );
  }

  if (!rpcResult?.success || !rpcResult?.transferId) {
    throw new Error(
      "La operación de recepción no devolvió una referencia válida. Intenta nuevamente."
    );
  }

  return fetchTransferOrderById(transferOrderId);
};

export const cancelTransferOrder = async ({
  transferOrderId,
  currentBranch,
  user = null,
}) => {
  if (!currentBranch?.id) {
    throw new Error("No hay una sucursal activa para cancelar el traspaso.");
  }

  const transferOrder = await fetchTransferOrderById(transferOrderId);

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

  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    "cancel_transfer_order",
    {
      p_transfer_id: transferOrderId,
      p_current_branch: currentBranch.id,
      p_user_id: user?.id || null,
      p_username: user?.username || user?.email || "SISTEMA",
    }
  );

  if (rpcError) {
    throw new Error(
      rpcError?.message ||
        "No se pudo cancelar la orden de traspaso (RPC cancel_transfer_order)."
    );
  }

  if (!rpcResult?.success || !rpcResult?.transferId) {
    throw new Error(
      "La operación de cancelación no devolvió una referencia válida. Intenta nuevamente."
    );
  }

  return fetchTransferOrderById(transferOrderId);
};
