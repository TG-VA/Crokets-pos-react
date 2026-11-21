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

// Une clases CSS Module omitiendo las condicionales falsas, para que no queden
// espacios colgantes en el className del DOM.
export const joinClasses = (...classes) => classes.filter(Boolean).join(" ");
