import { formatDateTime, getDateKeyFromValue } from "./movementDateUtils";

export const MOVEMENT_TYPE_LABELS = {
  sale: "Venta",
  sale_redemption: "Venta/canje",
  return: "Devolución",
  canceled: "Cancelación",
  redemption: "Canje",
  adjustment: "Ajuste",
  transfer: "Traspaso",
  entry: "Entrada",
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

  const match = rawValue.match(/^([a-z_]+):\s*(.*)$/i);

  if (!match) {
    return rawValue.toUpperCase();
  }

  const movementTypeKey = String(match[1] ?? "")
    .trim()
    .toLowerCase();

  const detail = String(match[2] ?? "").trim();

  const movementLabel = MOVEMENT_TYPE_LABELS[movementTypeKey];

  if (!movementLabel) {
    return rawValue.toUpperCase();
  }

  if (!detail) {
    return movementLabel.toUpperCase();
  }

  return `${movementLabel.toUpperCase()}: ${detail.toUpperCase()}`;
};

/**
 * Direcciones de traspaso segun el texto que guardan los RPCs. El folio
 * (`TR-DDMMYY-HH24MISS` o `TR-SIN-FOLIO`) y la explicacion larga se descartan
 * al mostrar; la sucursal se conserva como unica referencia.
 */
const TRANSFER_REASON_DIRECTIONS = [
  { prefix: "TRASPASO DEVOLUCION AUTOMATICA A", label: "TRASPASO DEVUELTO A" },
  { prefix: "TRASPASO CANCELADO Y DEVUELTO A", label: "TRASPASO CANCELADO A" },
  { prefix: "TRASPASO ENVIADO A", label: "TRASPASO ENVIADO A" },
  { prefix: "TRASPASO RECIBIDO DE", label: "TRASPASO RECIBIDO DE" },
];

/**
 * Reduce un motivo de traspaso a `TRASPASO <direccion> <SUCURSAL>`. Devuelve
 * `null` cuando el texto no corresponde a un traspaso para que el llamador
 * use el formateo genérico.
 */
export const formatTransferReason = (value) => {
  const rawReason = String(value ?? "").trim();

  if (!rawReason) {
    return null;
  }

  const upperReason = rawReason.toUpperCase();

  const direction = TRANSFER_REASON_DIRECTIONS.find((candidate) =>
    upperReason.startsWith(candidate.prefix)
  );

  if (!direction) {
    return null;
  }

  const remainder = rawReason
    .slice(direction.prefix.length)
    .trim()
    .replace(/^TR-\S+\s*/i, "");

  const branch = remainder.split(" - ")[0].trim();

  return branch
    ? `${direction.label} ${branch.toUpperCase()}`
    : direction.label;
};

export const formatTicket = (value) => {
  const ticket = String(value ?? "").trim();

  if (!ticket) {
    return "—";
  }

  return ticket.slice(0, 8);
};

export const normalizeFilenameSegment = (value, fallback = "POLIGONO") => {
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

export const toUpperSafe = (value, fallback = "—") => {
  const normalizedValue = String(value ?? "").trim();

  return (normalizedValue || fallback).toUpperCase();
};

export const getSalesObject = (row) => {
  const sale = row?.sales ?? row?.sale ?? {};

  if (Array.isArray(sale)) {
    return sale[0] ?? {};
  }

  return sale ?? {};
};

export const getRowMovementTypeKey = (row) => {
  return String(row?.movement_type ?? "")
    .trim()
    .toLowerCase();
};

export const getRowTypeInfo = (row) => {
  const rawTypeKey = getRowMovementTypeKey(row);

  const hasRedemption =
    row?.has_sale_redemption === true &&
    (rawTypeKey === "sale" || rawTypeKey === "redemption");

  const saleTotal = Number(getSalesObject(row)?.total);

  // Ticket con canje y ademas cobro: es venta/canje. Si el total es 0 o menor
  // el ticket fue solo canje. Cuando el total no se puede leer se conserva el
  // comportamiento previo (venta/canje) para no cambiar el marcado existente.
  const isRedemptionOnly =
    hasRedemption && Number.isFinite(saleTotal) && saleTotal <= 0;

  if (isRedemptionOnly) {
    return {
      typeKey: "redemption",
      typeLabel: formatMovementType("redemption"),
      typeFilterKeys: ["redemption"],
      rawTypeKey,
    };
  }

  if (hasRedemption) {
    return {
      typeKey: "sale_redemption",
      typeLabel: formatMovementType("sale_redemption"),
      typeFilterKeys: ["sale_redemption", "sale", "redemption"],
      rawTypeKey,
    };
  }

  return {
    typeKey: rawTypeKey,
    typeLabel: formatMovementType(rawTypeKey || row?.movement_type),
    typeFilterKeys: rawTypeKey ? [rawTypeKey] : [],
    rawTypeKey,
  };
};

export const buildSaleProductKey = (saleId, productId) => {
  const saleKey = String(saleId ?? "").trim();

  const productKey = String(productId ?? "").trim();

  if (!saleKey || !productKey) {
    return null;
  }

  return `${saleKey}::${productKey}`;
};

export const buildRedemptionReason = (rewardLabel, pointsValue) => {
  const reasonParts = [];

  const normalizedRewardLabel = String(rewardLabel ?? "").trim();

  if (normalizedRewardLabel) {
    reasonParts.push(normalizedRewardLabel);
  }

  if (pointsValue !== null && pointsValue !== undefined && pointsValue !== "") {
    reasonParts.push(`${pointsValue} PTS`);
  }

  if (reasonParts.length === 0) {
    return "redemption";
  }

  return `redemption: ${reasonParts.join(" - ")}`;
};

export const buildRowView = (row) => {
  const product = row?.products ?? {};

  const sale = getSalesObject(row);

  const user = row?.users ?? {};

  const ticketRaw =
    String(sale?.ticket_number ?? "").trim() ||
    String(sale?.folio ?? "").trim() ||
    String(sale?.ticket ?? "").trim() ||
    String(sale?.receipt_number ?? "").trim() ||
    String(row?.sale_id ?? "").trim() ||
    String(row?.saleId ?? "").trim() ||
    "";

  const ticket = formatTicket(ticketRaw);

  const movementTypeKey = getRowMovementTypeKey(row);

  const useSystemTime = !sale?.sale_date;
  const assumeUtcNaive = ["transfer", "canceled", "return"].includes(
    movementTypeKey
  );

  const soldAtValue =
    movementTypeKey === "sale" || movementTypeKey === "redemption"
      ? (sale?.sale_date ??
        row?.report_sort_at ??
        row?.created_at ??
        sale?.created_at ??
        null)
      : (row?.report_sort_at ??
        row?.created_at ??
        sale?.sale_date ??
        sale?.created_at ??
        null);

  const soldAt = formatDateTime(soldAtValue, {
    useSystemTime,
    assumeUtcNaive,
  });

  const soldAtDateKey = getDateKeyFromValue(soldAtValue, {
    useSystemTime,
    assumeUtcNaive,
  });

  const productName = (
    String(row?.display_product_name ?? "").trim() ||
    String(product?.name ?? "").trim() ||
    String(row?.product_id ?? "").trim() ||
    "—"
  ).toUpperCase();

  const username = (
    String(user?.username ?? "").trim() ||
    String(row?.user_id ?? "").trim() ||
    "—"
  ).toUpperCase();

  const { rawTypeKey, typeKey, typeLabel, typeFilterKeys } =
    getRowTypeInfo(row);

  const reason = formatTransferReason(row?.reason) ?? formatReason(row?.reason);

  const shouldForceZeroQuantity =
    typeKey === "product_update" || typeKey === "product_delete";

  const quantity = shouldForceZeroQuantity ? 0 : (row?.quantity ?? 0);

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
    prev: row?.previous_stock ?? null,
    next: row?.new_stock ?? null,

    reason,
    username,
  };
};

export const isNoStockMovement = (rowView) => {
  return String(rowView?.reason ?? "").includes("(SIN STOCK)");
};
