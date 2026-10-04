export const KARDEX_TIME_ZONE = "America/Cancun";

export const formatKardexDateTime = (value) => {
  if (!value) {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: KARDEX_TIME_ZONE,
  }).format(date);
};

export const formatKardexCurrency = (value) => {
  const numericValue = Number(value);

  const safeValue = Number.isFinite(numericValue) ? numericValue : 0;

  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeValue);
};

/**
 * Formatea un importe monetario opcional del kardex. Los movimientos sin costo
 * registrado (`null`, `undefined`, vacio o cero) no son presentables como
 * moneda, por lo que se representan con el guion largo.
 */
export const formatKardexOptionalCurrency = (value) => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return "—";
  }

  return formatKardexCurrency(numericValue);
};

export const normalizeKardexText = (value) => {
  return String(value ?? "").trim();
};

export const toKardexUpperCase = (value, fallback = "—") => {
  const normalizedValue = normalizeKardexText(value);

  return normalizedValue ? normalizedValue.toUpperCase() : fallback;
};

export const getKardexMovementType = (movement) => {
  return normalizeKardexText(movement?.movement_type).toLowerCase();
};

/**
 * Slugs de tipo de movimiento que el fallback historico de `logInventoryMovement`
 * concatenaba al motivo (`"inventory_add: Alta a inventario"`). Un motivo humano
 * que empieza con cualquiera de ellos se despinta para que la UI nunca exponga
 * identificadores tecnicos.
 */
const TECHNICAL_REASON_PREFIXES = new Set([
  "adjustment",
  "canceled",
  "cancelled",
  "inventory_activate",
  "inventory_add",
  "inventory_deactivate",
  "product_create",
  "product_delete",
  "product_update",
  "purchase",
  "redemption",
  "return",
  "sale",
  "sale_redemption",
  "transfer",
  "transfer_in",
  "transfer_out",
]);

const INVENTORY_ADD_REASON_PATTERN =
  /alta\s+(?:a|de)\s+inventario|ingreso\s+a\s+inventario|alta\s+de\s+mercancia/i;

/**
 * Limpia el motivo de los prefijos tecnicos residuales.
 *
 * Los registros ya persistidos pueden traer el motivo contaminado por el slug
 * tecnico (o tener el slug como motivo unico), asi que se eliminan en cascada
 * hasta encontrar texto descriptivo. El slug mas externo que se logro quitar se
 * devuelve aparte para que la vista pueda conservar la intencion del movimiento
 * original cuando el motivo se queda vacio.
 *
 * @param {unknown} value
 * @returns {{ reason: string, strippedTechnicalType: string|null }}
 */
export const sanitizeKardexReason = (value) => {
  let currentReason = normalizeKardexText(value);

  let strippedTechnicalType = null;

  while (currentReason) {
    const separatorIndex = currentReason.indexOf(":");

    if (separatorIndex <= 0) break;

    const candidate = currentReason
      .slice(0, separatorIndex)
      .trim()
      .toLowerCase();

    if (!TECHNICAL_REASON_PREFIXES.has(candidate)) break;

    strippedTechnicalType = strippedTechnicalType || candidate;
    currentReason = currentReason.slice(separatorIndex + 1).trim();
  }

  if (!strippedTechnicalType && currentReason) {
    const bareCandidate = currentReason.toLowerCase();

    if (TECHNICAL_REASON_PREFIXES.has(bareCandidate)) {
      strippedTechnicalType = bareCandidate;
      currentReason = "";
    }
  }

  return { reason: currentReason, strippedTechnicalType };
};

const appendReason = (label, reason) => {
  const normalizedReason = normalizeKardexText(reason);

  return normalizedReason ? `${label} — ${normalizedReason}` : label;
};

const isInventoryAddReason = (reason) => {
  return INVENTORY_ADD_REASON_PATTERN.test(normalizeKardexText(reason));
};

export const getKardexMovementDescription = (movement) => {
  const movementType = getKardexMovementType(movement);

  const { reason, strippedTechnicalType } = sanitizeKardexReason(
    movement?.reason
  );

  const saleId = normalizeKardexText(movement?.sale_id);

  switch (movementType) {
    case "sale": {
      const saleLabel = saleId
        ? `VENTA ${saleId.slice(0, 8).toUpperCase()}`
        : "VENTA";

      return appendReason(saleLabel, reason);
    }

    case "return":
      return appendReason("DEVOLUCIÓN", reason);

    case "canceled":
    case "cancelled":
      return appendReason("CANCELACIÓN", reason);

    case "inventory_add":
      return appendReason("ALTA A INVENTARIO", reason);

    case "adjustment": {
      const isInventoryAdd =
        strippedTechnicalType === "inventory_add" ||
        isInventoryAddReason(reason);

      if (isInventoryAdd && !reason) {
        return "ALTA A INVENTARIO";
      }

      return appendReason("AJUSTE", reason);
    }

    case "purchase":
      return appendReason("COMPRA", reason);

    case "transfer_in":
      return appendReason("TRASPASO ENTRADA", reason);

    case "transfer_out":
      return appendReason("TRASPASO SALIDA", reason);

    case "inventory_activate":
      return appendReason("ACTIVACIÓN DE INVENTARIO", reason);

    case "inventory_deactivate":
      return appendReason("DESACTIVACIÓN DE INVENTARIO", reason);

    case "product_create":
      return appendReason("ALTA DE PRODUCTO", reason);

    case "product_update":
      return appendReason("MODIFICACIÓN DE PRODUCTO", reason);

    case "product_delete":
      return appendReason("ELIMINACIÓN DE PRODUCTO", reason);

    case "redemption":
      return appendReason("CANJE", reason);

    default:
      return reason || movementType.toUpperCase() || "—";
  }
};

export const formatKardexDateKey = (dateKey) => {
  if (!dateKey) {
    return "—";
  }

  const [year, month, day] = String(dateKey).split("-");

  if (!year || !month || !day) {
    return "—";
  }

  return `${day}/${month}/${year}`;
};

export const getKardexRangeLabel = ({ dateFrom, dateTo }) => {
  if (!dateFrom && !dateTo) {
    return "TODAS LAS FECHAS";
  }

  const fromLabel = dateFrom ? formatKardexDateKey(dateFrom) : "INICIO";

  const toLabel = dateTo ? formatKardexDateKey(dateTo) : "HOY";

  if (dateFrom && dateTo && dateFrom === dateTo) {
    return fromLabel;
  }

  return `${fromLabel} - ${toLabel}`;
};

export const normalizeKardexFilenameSegment = (
  value,
  fallback = "SIN-DATO"
) => {
  const normalizedValue = normalizeKardexText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .toUpperCase();

  return normalizedValue || fallback;
};
