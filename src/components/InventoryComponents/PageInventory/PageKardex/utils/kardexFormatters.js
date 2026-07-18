export const KARDEX_TIME_ZONE =
  "America/Cancun";

export const formatKardexDateTime = (
  value
) => {
  if (!value) {
    return "—";
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "es-MX",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone:
        KARDEX_TIME_ZONE,
    }
  ).format(date);
};

export const formatKardexCurrency = (
  value
) => {
  const numericValue =
    Number(value);

  const safeValue =
    Number.isFinite(numericValue)
      ? numericValue
      : 0;

  return new Intl.NumberFormat(
    "es-MX",
    {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  ).format(safeValue);
};

export const normalizeKardexText = (
  value
) => {
  return String(value ?? "")
    .trim();
};

export const toKardexUpperCase = (
  value,
  fallback = "—"
) => {
  const normalizedValue =
    normalizeKardexText(value);

  return normalizedValue
    ? normalizedValue.toUpperCase()
    : fallback;
};

export const getKardexMovementType = (
  movement
) => {
  return normalizeKardexText(
    movement?.movement_type
  ).toLowerCase();
};

const appendReason = (
  label,
  reason
) => {
  const normalizedReason =
    normalizeKardexText(reason);

  return normalizedReason
    ? `${label} — ${normalizedReason}`
    : label;
};

export const getKardexMovementDescription = (
  movement
) => {
  const movementType =
    getKardexMovementType(
      movement
    );

  const reason =
    normalizeKardexText(
      movement?.reason
    );

  const saleId =
    normalizeKardexText(
      movement?.sale_id
    );

  switch (movementType) {
    case "sale": {
      const saleLabel = saleId
        ? `VENTA ${saleId
            .slice(0, 8)
            .toUpperCase()}`
        : "VENTA";

      return appendReason(
        saleLabel,
        reason
      );
    }

    case "return":
      return appendReason(
        "DEVOLUCIÓN",
        reason
      );

    case "canceled":
    case "cancelled":
      return appendReason(
        "CANCELACIÓN",
        reason
      );

    case "inventory_add":
      return appendReason(
        "ALTA A INVENTARIO",
        reason
      );

    case "adjustment":
      return appendReason(
        "AJUSTE",
        reason
      );

    case "purchase":
      return appendReason(
        "COMPRA",
        reason
      );

    case "transfer_in":
      return appendReason(
        "TRASPASO ENTRADA",
        reason
      );

    case "transfer_out":
      return appendReason(
        "TRASPASO SALIDA",
        reason
      );

    case "inventory_activate":
      return appendReason(
        "ACTIVACIÓN DE INVENTARIO",
        reason
      );

    case "inventory_deactivate":
      return appendReason(
        "DESACTIVACIÓN DE INVENTARIO",
        reason
      );

    case "product_create":
      return appendReason(
        "ALTA DE PRODUCTO",
        reason
      );

    case "product_update":
      return appendReason(
        "MODIFICACIÓN DE PRODUCTO",
        reason
      );

    case "product_delete":
      return appendReason(
        "ELIMINACIÓN DE PRODUCTO",
        reason
      );

    case "redemption":
      return appendReason(
        "CANJE",
        reason
      );

    default:
      return (
        reason ||
        movementType.toUpperCase() ||
        "—"
      );
  }
};

export const formatKardexDateKey = (
  dateKey
) => {
  if (!dateKey) {
    return "—";
  }

  const [
    year,
    month,
    day,
  ] = String(dateKey).split("-");

  if (
    !year ||
    !month ||
    !day
  ) {
    return "—";
  }

  return `${day}/${month}/${year}`;
};

export const getKardexRangeLabel = ({
  dateFrom,
  dateTo,
}) => {
  if (
    !dateFrom &&
    !dateTo
  ) {
    return "TODAS LAS FECHAS";
  }

  const fromLabel =
    dateFrom
      ? formatKardexDateKey(
          dateFrom
        )
      : "INICIO";

  const toLabel =
    dateTo
      ? formatKardexDateKey(
          dateTo
        )
      : "HOY";

  if (
    dateFrom &&
    dateTo &&
    dateFrom === dateTo
  ) {
    return fromLabel;
  }

  return `${fromLabel} - ${toLabel}`;
};

export const normalizeKardexFilenameSegment = (
  value,
  fallback = "SIN-DATO"
) => {
  const normalizedValue =
    normalizeKardexText(value)
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .replace(
        /[^a-zA-Z0-9_-]+/g,
        "-"
      )
      .replace(
        /^[-_]+|[-_]+$/g,
        ""
      )
      .toUpperCase();

  return (
    normalizedValue ||
    fallback
  );
};