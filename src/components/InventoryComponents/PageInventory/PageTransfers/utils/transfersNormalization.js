// Normalizacion de ordenes de traspaso y parseo de notas/metadata.

import {
  normalizeText,
  createTransferFolio,
  TRANSFER_META_SEPARATOR,
} from "./transfersFormatters";
import {
  normalizeInteger,
  buildTransferTotals,
} from "./transfersCalculationService";

export const parseTransferNotesPayload = (value) => {
  const normalizedValue = String(value ?? "");
  const separatorIndex = normalizedValue.lastIndexOf(TRANSFER_META_SEPARATOR);

  if (separatorIndex === -1) {
    return {
      noteText: normalizedValue.trim(),
      metadata: {},
    };
  }

  const noteText = normalizedValue.slice(0, separatorIndex).trim();
  const metadataText = normalizedValue
    .slice(separatorIndex + TRANSFER_META_SEPARATOR.length)
    .trim();

  try {
    const metadata = metadataText ? JSON.parse(metadataText) : {};

    return {
      noteText,
      metadata: metadata && typeof metadata === "object" ? metadata : {},
    };
  } catch (error) {
    console.error("No se pudo interpretar la metadata del traspaso:", error);
    return {
      noteText: normalizedValue.trim(),
      metadata: {},
    };
  }
};

const getItemOutcome = (metadata = {}, productId = "") => {
  const itemOutcomes = metadata?.itemOutcomes;

  if (!itemOutcomes || typeof itemOutcomes !== "object") {
    return null;
  }

  return itemOutcomes[productId] || null;
};

export const normalizeTransferOrder = (order = {}) => {
  const { noteText, metadata } = parseTransferNotesPayload(
    order?.notes ?? order?.rawNotes
  );

  const normalizedStatus = normalizeText(order?.status, "pending_receipt");
  const normalizedItemsSource = Array.isArray(order?.items)
    ? order.items
    : Array.isArray(order?.inventory_transfer_items)
      ? order.inventory_transfer_items
      : [];

  const normalizedItems = normalizedItemsSource.map((item) => {
    const productId = item?.productId || item?.product_id || item?.id || null;
    const itemOutcome = getItemOutcome(metadata, productId);
    const requestedQty = normalizeInteger(item?.requestedQty ?? item?.quantity);

    let receivedQty = normalizeInteger(
      item?.receivedQty ?? itemOutcome?.receivedQty
    );
    let returnedQty = normalizeInteger(
      item?.returnedQty ?? itemOutcome?.returnedQty
    );

    if (normalizedStatus === "received_complete" && receivedQty === 0) {
      receivedQty = requestedQty;
    }

    if (
      normalizedStatus === "received_with_difference" &&
      receivedQty === 0 &&
      returnedQty === 0
    ) {
      receivedQty = requestedQty;
    }

    const rawOriginBefore =
      item?.origin_stock_before ?? item?.originStockBefore ?? null;
    const rawOriginAfter =
      item?.origin_stock_after ?? item?.originStockAfter ?? null;
    const rawDestinationBefore =
      item?.destination_stock_before ?? item?.destinationStockBefore ?? null;
    const rawDestinationAfter =
      item?.destination_stock_after ?? item?.destinationStockAfter ?? null;

    return {
      productId,
      barcode: normalizeText(
        item?.barcode ?? item?.product?.barcode ?? item?.products?.barcode,
        "—"
      ),
      name: normalizeText(
        item?.name ?? item?.product?.name ?? item?.products?.name,
        "PRODUCTO SIN NOMBRE"
      ),
      requestedQty,
      receivedQty,
      returnedQty,
      costPrice: Number(item?.costPrice ?? item?.cost_price ?? 0) || 0,
      salePrice: Number(item?.salePrice ?? item?.sale_price ?? 0) || 0,
      origin_stock_before:
        rawOriginBefore == null ? null : Number(rawOriginBefore),
      origin_stock_after:
        rawOriginAfter == null ? null : Number(rawOriginAfter),
      destination_stock_before:
        rawDestinationBefore == null ? null : Number(rawDestinationBefore),
      destination_stock_after:
        rawDestinationAfter == null ? null : Number(rawDestinationAfter),
    };
  });

  return {
    id: normalizeText(order?.id),
    folio: normalizeText(
      order?.folio ?? metadata?.folio,
      createTransferFolio()
    ),
    status: normalizedStatus,
    notes: noteText,
    rawNotes: order?.notes ?? order?.rawNotes ?? "",
    metadata,
    createdAt:
      order?.createdAt || order?.created_at || new Date().toISOString(),
    receivedAt:
      order?.receivedAt ||
      metadata?.receivedAt ||
      (normalizedStatus === "received_complete" ||
      normalizedStatus === "received_with_difference"
        ? order?.completedAt || order?.completed_at || null
        : null),
    cancelledAt:
      order?.cancelledAt ||
      metadata?.cancelledAt ||
      (normalizedStatus === "cancelled"
        ? order?.completedAt || order?.completed_at || null
        : null),
    completedAt: order?.completedAt || order?.completed_at || null,
    createdByUserId: order?.createdByUserId || order?.user_id || null,
    createdByUsername: normalizeText(
      order?.createdByUsername ?? order?.user?.username ?? order?.user?.email,
      "SISTEMA"
    ),
    receivedByUserId:
      order?.receivedByUserId || metadata?.receivedByUserId || null,
    receivedByUsername: normalizeText(
      order?.receivedByUsername ?? metadata?.receivedByUsername
    ),
    cancelledByUserId:
      order?.cancelledByUserId || metadata?.cancelledByUserId || null,
    cancelledByUsername: normalizeText(
      order?.cancelledByUsername ?? metadata?.cancelledByUsername
    ),
    originBranchId: order?.originBranchId || order?.from_branch_id || null,
    originBranchName: normalizeText(
      order?.originBranchName ?? order?.from_branch?.name,
      "SUCURSAL ORIGEN"
    ),
    originBranchCode: normalizeText(
      order?.originBranchCode ?? order?.from_branch?.code
    ),
    destinationBranchId:
      order?.destinationBranchId || order?.to_branch_id || null,
    destinationBranchName: normalizeText(
      order?.destinationBranchName ?? order?.to_branch?.name,
      "SUCURSAL DESTINO"
    ),
    destinationBranchCode: normalizeText(
      order?.destinationBranchCode ?? order?.to_branch?.code
    ),
    items: normalizedItems,
    totals: buildTransferTotals(normalizedItems),
  };
};
