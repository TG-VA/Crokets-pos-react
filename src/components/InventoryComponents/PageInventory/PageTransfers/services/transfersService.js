import { supabase } from "../../../../../lib/supabaseClient";
import { fetchOperationalBranches } from "../../../../../services/branchScopeService";

import {
  createTransferFolio,
  normalizeTransferOrder,
} from "../utils/transfersUtils";
import {
  getBranchFallback,
  validateTransferItems,
} from "../utils/transfersCalculationService";
import {
  TRANSFER_SELECT,
  fetchTransferOrderById,
} from "./transfersDetailService";

export const fetchTransferBranchOptions = async (currentBranch) => {
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
      "No se pudieron cargar las sucursales para traspasos:",
      error
    );
    const fallback = getBranchFallback(currentBranch);
    if (import.meta.env.MODE !== "production") {
      // Dev/Staging: re-lanzar el error para que QA detecte fallos RLS/permisos
      // y no se oculten con el fallback. En producción se mantiene el fallback.
      // TODO: descomentar al cerrar el issue de mejora de propagación de errores a UI.
      // throw error;
    }
    return fallback;
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
      // SEGURIDAD DE AUDITORÍA (verificado en Supabase 2026-09-28,
      // validación unificada Q1/Q2/Q3 = 3, parche aplicado en BD):
      // (a) AUTORÍA: p_user_id se envía como fallback defensivo.
      //     El RPC server-side hace p_user_id := COALESCE(auth.uid(), p_user_id).
      //     Bajo flujo normal con JWT authenticated, auth.uid() es non-null
      //     => NO es spoofeable. Fuente de verdad server-side.
      // (b) VALORACIÓN (costPrice / salePrice): PARCHE APLICADO 2026-09-28.
      //     El RPC hace FROM public.products p WHERE id = v_product_id LIMIT 1
      //     y asigna v_cost_price := v_p_cost_from_tbl, v_sale_price :=
      //     v_p_sale_from_tbl. Los valores costPrice/salePrice enviados por el
      //     cliente en p_items.jsonb se IGNORAN COMPLETAMENTE (no spoofable).
      // (c) ATOMICIDAD: SECURITY DEFINER + SET search_path TO public.
      //     Bloque BEGIN ... EXCEPTION WHEN OTHERS rollbackea todo.
      //     Guard anti-stock negativo v_req_qty > v_origin_before RAISE.
      //     Snapshots origin_before/after en el mismo TX.
      //   El guard de status PENDING del cliente (transfersService L242-244) NO
      //   protege contra doble recepción: la guard atómica real vive en el RPC.
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
      // SEGURIDAD DE AUDITORÍA:
      // p_user_id y p_username se envían SOLO por compatibilidad histórica/logging.
      // La fuente de verdad de received_by y auditoría la resuelve EXCLUSIVAMENTE
      // el RPC server-side via auth.uid() + SELECT COALESCE(username, email, 'SISTEMA')
      // en public.users. El cliente NO puede spoofear quién recibió la orden.
      // Ver backup/dump del RPC receive_transfer_order en el enlace privado del PR.
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
    throw new Error("Solo se pueden cancelar órdenes pendientes de recepción.");
  }

  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    "cancel_transfer_order",
    {
      p_transfer_id: transferOrderId,
      p_current_branch: currentBranch.id,
      // SEGURIDAD DE AUDITORÍA (mismo patrón que receive_transfer_order):
      // p_user_id y p_username se envían SOLO por compatibilidad histórica/logging.
      // La fuente de verdad de cancelled_by y auditoría la resuelve EXCLUSIVAMENTE
      // el RPC server-side via auth.uid() + SELECT COALESCE(username, email, 'SISTEMA')
      // en public.users. El cliente NO puede spoofear quién canceló la orden.
      // Ver backup/dump del RPC cancel_transfer_order en el enlace privado del PR.
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
