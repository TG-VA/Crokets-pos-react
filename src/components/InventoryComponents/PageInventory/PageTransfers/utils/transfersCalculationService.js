// Calculos puros: agregaciones, conteos, filtros, ordenamiento.

import { isOperationalBranch } from "../../../../../services/branchScopeCalculationService";
import { isInventoryTrackedProduct } from "../../../../../services/inventory/inventoryProductCalculationService";
import { parseTransferDate, normalizeText } from "./transfersFormatters";

export const normalizeInteger = (value, fallback = 0) => {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.max(0, Math.floor(parsedValue));
};

/**
 * Sanea la cantidad recibida capturada: descarta todo lo que no sea digito y
 * recorta al maximo solicitado para que el faltante nunca sea negativo.
 */
export const normalizeReceivedQuantity = (value, maxQty = 0) => {
  const digitsOnly = String(value ?? "").replace(/\D/g, "");
  const parsedValue = Number(digitsOnly || 0);
  const upperBound = normalizeInteger(maxQty);

  return String(Math.min(parsedValue, upperBound));
};

/**
 * Indica si al menos un producto de la orden tiene cantidad recibida capturada.
 */
export const hasReceivedUnits = (items = [], receiptQuantities = {}) => {
  return (Array.isArray(items) ? items : []).some(
    (item) => normalizeInteger(receiptQuantities?.[item?.productId]) > 0
  );
};

/**
 * Cuenta los productos de la orden que se quedaron en 0 y por lo tanto
 * regresan completos a la sucursal de origen.
 */
export const countUnreceivedItems = (items = [], receiptQuantities = {}) => {
  return (Array.isArray(items) ? items : []).filter(
    (item) => normalizeInteger(receiptQuantities?.[item?.productId]) <= 0
  ).length;
};

export const buildTransferTotals = (items = []) => {
  return (Array.isArray(items) ? items : []).reduce(
    (summary, item) => {
      summary.requestedUnits += normalizeInteger(item?.requestedQty);
      summary.receivedUnits += normalizeInteger(item?.receivedQty);
      summary.returnedUnits += normalizeInteger(item?.returnedQty);
      summary.lineCount += 1;
      return summary;
    },
    {
      requestedUnits: 0,
      receivedUnits: 0,
      returnedUnits: 0,
      lineCount: 0,
    }
  );
};

export const sortTransfersByDate = (orders = []) => {
  return [...(Array.isArray(orders) ? orders : [])].sort((a, b) => {
    const dateA = parseTransferDate(a?.createdAt)?.getTime() ?? 0;
    const dateB = parseTransferDate(b?.createdAt)?.getTime() ?? 0;
    return dateB - dateA;
  });
};

export const getPendingReceiptsCount = ({
  orders = [],
  currentBranchId = "",
}) => {
  return orders.filter(
    (order) =>
      order.destinationBranchId === currentBranchId &&
      order.status === "pending_receipt"
  ).length;
};

export const getPendingReceiptOrders = ({
  orders = [],
  currentBranchId = "",
}) => {
  return sortTransfersByDate(orders).filter(
    (order) =>
      order.destinationBranchId === currentBranchId &&
      order.status === "pending_receipt"
  );
};

export const getTransfersHistory = ({ orders = [], currentBranchId = "" }) => {
  return sortTransfersByDate(orders).filter(
    (order) =>
      order.originBranchId === currentBranchId ||
      order.destinationBranchId === currentBranchId
  );
};

export const filterTransferProducts = ({ products = [], searchTerm = "" }) => {
  const normalizedTerm = normalizeText(searchTerm).toUpperCase();

  const sendableProducts = (Array.isArray(products) ? products : [])
    .filter(isInventoryTrackedProduct)
    .filter((product) => Number(product?.existencia ?? 0) > 0)
    .sort((a, b) =>
      String(a?.descripcion || "").localeCompare(
        String(b?.descripcion || ""),
        "es",
        {
          sensitivity: "base",
          numeric: true,
        }
      )
    );

  if (!normalizedTerm) {
    return sendableProducts;
  }

  return sendableProducts.filter((product) => {
    const description = String(product?.descripcion || "").toUpperCase();
    const barcode = String(product?.codigo || "").toUpperCase();

    return (
      description.includes(normalizedTerm) || barcode.includes(normalizedTerm)
    );
  });
};

export const getTransferMetrics = ({ orders = [], currentBranchId = "" }) => {
  const currentBranch = String(currentBranchId || "");

  return orders.reduce(
    (summary, order) => {
      const isOrigin = String(order?.originBranchId || "") === currentBranch;
      const isDestination =
        String(order?.destinationBranchId || "") === currentBranch;
      const participates = isOrigin || isDestination;

      if (order.status === "cancelled" && participates) {
        summary.cancelled += 1;
      }

      if (isOrigin) {
        summary.sent += 1;
      }

      if (isDestination && order.status === "pending_receipt") {
        summary.pendingReceipts += 1;
      }

      if (isDestination && order.status !== "pending_receipt") {
        summary.completedReceipts += 1;
      }

      if (participates && order.status === "pending_receipt") {
        const requested = Number(order?.totals?.requestedUnits ?? 0) || 0;
        const received = Number(order?.totals?.receivedUnits ?? 0) || 0;
        const returned = Number(order?.totals?.returnedUnits ?? 0) || 0;
        const remaining = requested - received - returned;
        if (Number.isFinite(remaining) && remaining > 0) {
          summary.unitsInTransit += remaining;
        }
      }

      return summary;
    },
    {
      sent: 0,
      pendingReceipts: 0,
      completedReceipts: 0,
      cancelled: 0,
      unitsInTransit: 0,
    }
  );
};

// ============================================================================
// Helpers de construccion y validacion de items de traspaso (logica pura).
// ============================================================================

// Una sucursal admin no tiene stock: nunca se ofrece como origen ni destino.
export const getBranchFallback = (currentBranch) => {
  if (!currentBranch?.id || !isOperationalBranch(currentBranch)) {
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

export const getProductId = (product) => {
  return product?.productId || product?.product_id || product?.id || null;
};

export const getProductPrices = (product) => {
  return {
    costPrice: Number(product?.costo ?? product?.costPrice ?? 0) || 0,
    salePrice: Number(product?.precio ?? product?.salePrice ?? 0) || 0,
  };
};

export const buildTransferItems = (items = []) => {
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

export const validateTransferItems = (items = []) => {
  const normalizedItems = buildTransferItems(items).filter(
    (item) => item.productId && item.requestedQty > 0
  );

  if (normalizedItems.length === 0) {
    throw new Error("Agrega al menos un producto al traspaso.");
  }

  return normalizedItems;
};
