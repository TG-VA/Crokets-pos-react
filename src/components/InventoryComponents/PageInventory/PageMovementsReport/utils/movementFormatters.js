import {
  formatDateTime,
  getDateKeyFromValue,
} from "./movementDateUtils";

export const MOVEMENT_TYPE_LABELS = {
  sale: "Venta",
  sale_redemption: "Venta/canje",
  return: "Devolución",
  canceled: "Cancelación",
  redemption: "Redención",
  adjustment: "Ajuste",
  transfer: "Traspaso",
  purchase: "Compra",
  inventory_add: "Alta inventario",
  inventory_activate: "Activar inventario",
  inventory_deactivate: "Desactivar inventario",
  product_create: "Alta producto",
  product_update: "Modificar producto",
  product_delete: "Eliminar producto",
};

export const formatMovementType = (value) => {
  const key = String(value ?? "")
    .trim()
    .toLowerCase();

  if (!key) {
    return "—";
  }

  return MOVEMENT_TYPE_LABELS[key] ?? value;
};

export const formatReason = (value) => {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    return "—";
  }

  const match = rawValue.match(
    /^([a-z_]+):\s*(.*)$/i
  );

  if (!match) {
    return rawValue.toUpperCase();
  }

  const movementTypeKey = String(
    match[1] ?? ""
  )
    .trim()
    .toLowerCase();

  const detail = String(
    match[2] ?? ""
  ).trim();

  const movementLabel =
    MOVEMENT_TYPE_LABELS[movementTypeKey];

  if (!movementLabel) {
    return rawValue.toUpperCase();
  }

  if (!detail) {
    return movementLabel.toUpperCase();
  }

  return `${movementLabel.toUpperCase()}: ${detail.toUpperCase()}`;
};

export const formatTicket = (value) => {
  const ticket = String(value ?? "").trim();

  if (!ticket) {
    return "—";
  }

  return ticket.slice(0, 8);
};

export const normalizeFilenameSegment = (
  value,
  fallback = "POLIGONO"
) => {
  const normalizedValue = String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[^\w\s-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  return normalizedValue || fallback;
};

export const toUpperSafe = (
  value,
  fallback = "—"
) => {
  const normalizedValue = String(
    value ?? ""
  ).trim();

  return (
    normalizedValue || fallback
  ).toUpperCase();
};

export const getSalesObject = (row) => {
  const sale =
    row?.sales ??
    row?.sale ??
    {};

  if (Array.isArray(sale)) {
    return sale[0] ?? {};
  }

  return sale ?? {};
};

export const getRowMovementTypeKey = (
  row
) => {
  return String(
    row?.movement_type ?? ""
  )
    .trim()
    .toLowerCase();
};

export const getRowTypeInfo = (row) => {
  const rawTypeKey =
    getRowMovementTypeKey(row);

  const isMixedSaleRedemption =
    row?.has_sale_redemption === true &&
    (
      rawTypeKey === "sale" ||
      rawTypeKey === "redemption"
    );

  if (isMixedSaleRedemption) {
    return {
      typeKey: "sale_redemption",
      typeLabel: formatMovementType(
        "sale_redemption"
      ),
      typeFilterKeys: [
        "sale_redemption",
        "sale",
        "redemption",
      ],
      rawTypeKey,
    };
  }

  return {
    typeKey: rawTypeKey,
    typeLabel: formatMovementType(
      rawTypeKey || row?.movement_type
    ),
    typeFilterKeys: rawTypeKey
      ? [rawTypeKey]
      : [],
    rawTypeKey,
  };
};

export const buildSaleProductKey = (
  saleId,
  productId
) => {
  const saleKey = String(
    saleId ?? ""
  ).trim();

  const productKey = String(
    productId ?? ""
  ).trim();

  if (!saleKey || !productKey) {
    return null;
  }

  return `${saleKey}::${productKey}`;
};

export const buildRedemptionReason = (
  rewardLabel,
  pointsValue
) => {
  const reasonParts = [];

  const normalizedRewardLabel = String(
    rewardLabel ?? ""
  ).trim();

  if (normalizedRewardLabel) {
    reasonParts.push(
      normalizedRewardLabel
    );
  }

  if (
    pointsValue !== null &&
    pointsValue !== undefined &&
    pointsValue !== ""
  ) {
    reasonParts.push(
      `${pointsValue} PTS`
    );
  }

  if (reasonParts.length === 0) {
    return "redemption";
  }

  return `redemption: ${reasonParts.join(
    " - "
  )}`;
};

export const buildRowView = (row) => {
  const product =
    row?.products ?? {};

  const sale =
    getSalesObject(row);

  const user =
    row?.users ?? {};

  const ticketRaw =
    String(
      sale?.ticket_number ?? ""
    ).trim() ||
    String(
      sale?.folio ?? ""
    ).trim() ||
    String(
      sale?.ticket ?? ""
    ).trim() ||
    String(
      sale?.receipt_number ?? ""
    ).trim() ||
    String(
      row?.sale_id ?? ""
    ).trim() ||
    String(
      row?.saleId ?? ""
    ).trim() ||
    "";

  const ticket =
    formatTicket(ticketRaw);

  const useSystemTime =
    !sale?.sale_date;

  const soldAtValue =
    sale?.sale_date ??
    row?.report_sort_at ??
    row?.created_at ??
    sale?.created_at ??
    null;

  const soldAt = formatDateTime(
    soldAtValue,
    {
      useSystemTime,
    }
  );

  const soldAtDateKey =
    getDateKeyFromValue(
      soldAtValue,
      {
        useSystemTime,
      }
    );

  const productName = (
    String(
      row?.display_product_name ?? ""
    ).trim() ||
    String(
      product?.name ?? ""
    ).trim() ||
    String(
      row?.product_id ?? ""
    ).trim() ||
    "—"
  ).toUpperCase();

  const username = (
    String(
      user?.username ?? ""
    ).trim() ||
    String(
      row?.user_id ?? ""
    ).trim() ||
    "—"
  ).toUpperCase();

  const {
    rawTypeKey,
    typeKey,
    typeLabel,
    typeFilterKeys,
  } = getRowTypeInfo(row);

  const reason = formatReason(
    row?.reason
  );

  const shouldForceZeroQuantity =
    typeKey === "product_update" ||
    typeKey === "product_delete";

  const quantity =
    shouldForceZeroQuantity
      ? 0
      : row?.quantity ?? 0;

  return {
    soldAtValue,
    soldAt,
    soldAtDateKey,

    productName,

    ticketRaw,
    ticket,

    rawTypeKey,
    typeKey,
    typeLabel,
    typeFilterKeys,

    qty: quantity,
    prev:
      row?.previous_stock ?? null,
    next:
      row?.new_stock ?? null,

    reason,
    username,
  };
};

export const isNoStockMovement = (
  rowView
) => {
  return String(
    rowView?.reason ?? ""
  ).includes("(SIN STOCK)");
};