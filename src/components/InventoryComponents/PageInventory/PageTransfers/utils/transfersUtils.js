const normalizeText = (value, fallback = "") => {
  return String(value ?? "").trim() || fallback;
};

const TRANSFER_META_SEPARATOR = "\n\n##TRANSFER_META##";

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

const parseTransferNotesPayload = (value) => {
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

export const buildTransferNotesPayload = ({
  noteText = "",
  metadata = {},
}) => {
  const normalizedNoteText = normalizeText(noteText);
  const normalizedMetadata =
    metadata && typeof metadata === "object" ? metadata : {};

  if (Object.keys(normalizedMetadata).length === 0) {
    return normalizedNoteText;
  }

  return `${normalizedNoteText}${TRANSFER_META_SEPARATOR}${JSON.stringify(
    normalizedMetadata
  )}`.trim();
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

    let receivedQty = normalizeInteger(item?.receivedQty ?? itemOutcome?.receivedQty);
    let returnedQty = normalizeInteger(item?.returnedQty ?? itemOutcome?.returnedQty);

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
      salePrice:
        Number(
          item?.salePrice ?? item?.sale_price ?? 0
        ) || 0,
    };
  });

  return {
    id: normalizeText(order?.id),
    folio: normalizeText(order?.folio ?? metadata?.folio, createTransferFolio()),
    status: normalizedStatus,
    notes: noteText,
    rawNotes: order?.notes ?? order?.rawNotes ?? "",
    metadata,
    createdAt: order?.createdAt || order?.created_at || new Date().toISOString(),
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
      order?.createdByUsername ??
        order?.user?.username ??
        order?.user?.email,
      "SISTEMA"
    ),
    receivedByUserId: order?.receivedByUserId || metadata?.receivedByUserId || null,
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
    originBranchCode: normalizeText(order?.originBranchCode ?? order?.from_branch?.code),
    destinationBranchId: order?.destinationBranchId || order?.to_branch_id || null,
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
