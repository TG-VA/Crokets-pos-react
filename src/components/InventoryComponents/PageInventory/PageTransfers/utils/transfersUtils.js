export const TRANSFERS_STORAGE_KEY = "inventoryTransfers_v1";

const normalizeText = (value, fallback = "") => {
  return String(value ?? "").trim() || fallback;
};

const normalizeInteger = (value, fallback = 0) => {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.max(0, Math.floor(parsedValue));
};

const formatDatePart = (date) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);

  return `${day}${month}${year}`;
};

const formatTimePart = (date) => {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${hours}${minutes}${seconds}`;
};

export const createTransferId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `transfer-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2, 10)}`;
};

export const createTransferFolio = (date = new Date()) => {
  const referenceDate = date instanceof Date ? date : new Date(date);

  return `TR-${formatDatePart(referenceDate)}-${formatTimePart(
    referenceDate
  )}`;
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

export const normalizeTransferOrder = (order = {}) => {
  const normalizedItems = (Array.isArray(order?.items) ? order.items : []).map(
    (item) => ({
      productId: item?.productId || item?.id || null,
      barcode: normalizeText(item?.barcode, "—"),
      name: normalizeText(item?.name, "PRODUCTO SIN NOMBRE"),
      requestedQty: normalizeInteger(item?.requestedQty),
      receivedQty: normalizeInteger(item?.receivedQty),
      returnedQty: normalizeInteger(item?.returnedQty),
      costPrice: Number(item?.costPrice ?? 0) || 0,
      salePrice: Number(item?.salePrice ?? 0) || 0,
    })
  );

  return {
    id: normalizeText(order?.id, createTransferId()),
    folio: normalizeText(order?.folio, createTransferFolio()),
    status: normalizeText(order?.status, "pending_receipt"),
    notes: normalizeText(order?.notes),
    createdAt: order?.createdAt || new Date().toISOString(),
    receivedAt: order?.receivedAt || null,
    cancelledAt: order?.cancelledAt || null,
    createdByUserId: order?.createdByUserId || null,
    createdByUsername: normalizeText(order?.createdByUsername, "SISTEMA"),
    receivedByUserId: order?.receivedByUserId || null,
    receivedByUsername: normalizeText(order?.receivedByUsername),
    cancelledByUserId: order?.cancelledByUserId || null,
    cancelledByUsername: normalizeText(order?.cancelledByUsername),
    originBranchId: order?.originBranchId || null,
    originBranchName: normalizeText(
      order?.originBranchName,
      "SUCURSAL ORIGEN"
    ),
    destinationBranchId: order?.destinationBranchId || null,
    destinationBranchName: normalizeText(
      order?.destinationBranchName,
      "SUCURSAL DESTINO"
    ),
    items: normalizedItems,
    totals: buildTransferTotals(normalizedItems),
  };
};

export const readTransferOrders = () => {
  try {
    const rawValue = localStorage.getItem(TRANSFERS_STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.map(normalizeTransferOrder);
  } catch (error) {
    console.error("No se pudieron leer los traspasos guardados:", error);
    return [];
  }
};

export const writeTransferOrders = (orders = []) => {
  const normalizedOrders = (Array.isArray(orders) ? orders : [])
    .map(normalizeTransferOrder)
    .sort((a, b) => {
      return (
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });

  localStorage.setItem(
    TRANSFERS_STORAGE_KEY,
    JSON.stringify(normalizedOrders)
  );

  return normalizedOrders;
};

export const getTransferStatusMeta = (status) => {
  const normalizedStatus = normalizeText(status, "pending_receipt");

  if (normalizedStatus === "cancelled") {
    return {
      label: "Cancelado",
      tone: "cancelled",
    };
  }

  if (normalizedStatus === "received_complete") {
    return {
      label: "Recibido completo",
      tone: "success",
    };
  }

  if (normalizedStatus === "received_with_difference") {
    return {
      label: "Recibido con diferencia",
      tone: "warning",
    };
  }

  return {
    label: "Pendiente de recepción",
    tone: "pending",
  };
};

export const formatTransferDateTime = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

export const sortTransfersByDate = (orders = []) => {
  return [...(Array.isArray(orders) ? orders : [])].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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

export const getTransfersHistory = ({
  orders = [],
  currentBranchId = "",
}) => {
  return sortTransfersByDate(orders).filter(
    (order) =>
      order.originBranchId === currentBranchId ||
      order.destinationBranchId === currentBranchId
  );
};

export const filterTransferProducts = ({
  products = [],
  searchTerm = "",
}) => {
  const normalizedTerm = normalizeText(searchTerm).toUpperCase();

  const sendableProducts = (Array.isArray(products) ? products : [])
    .filter((product) => product?.tracks_inventory)
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

export const getTransferMetrics = ({
  orders = [],
  currentBranchId = "",
}) => {
  return orders.reduce(
    (summary, order) => {
      if (order.status === "cancelled") {
        summary.cancelled += 1;
      }

      if (order.originBranchId === currentBranchId) {
        summary.sent += 1;
      }

      if (
        order.destinationBranchId === currentBranchId &&
        order.status === "pending_receipt"
      ) {
        summary.pendingReceipts += 1;
      }

      if (
        order.destinationBranchId === currentBranchId &&
        order.status !== "pending_receipt"
      ) {
        summary.completedReceipts += 1;
      }

      summary.unitsInTransit +=
        Number(order?.totals?.requestedUnits ?? 0) -
        Number(order?.totals?.receivedUnits ?? 0) -
        Number(order?.totals?.returnedUnits ?? 0);

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
