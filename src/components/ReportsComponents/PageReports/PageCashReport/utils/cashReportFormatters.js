/**
 * Formateador de moneda nativo en formato MXN ($)
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(Number(amount) || 0);
};

/**
 * Formateador de números con separador de miles
 */
export const formatNumber = (value) => {
  return new Intl.NumberFormat("es-MX").format(Number(value) || 0);
};

/**
 * Formateador de fecha/hora dinámico por Sucursal o ISO string
 */
export const formatDynamicDate = (isoDate, timeZone = "America/Cancun") => {
  if (!isoDate) return "N/A";

  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return "N/A";

    const formatted = new Intl.DateTimeFormat("es-MX", {
      timeZone: timeZone,
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);

    // Reemplaza coma por guión y asegura que la hora y a.m./p.m. no se partan
    return formatted
      .replace(/,\s*/g, " - ")
      .replace(/\s+([ap]\.?\s*m\.?)/i, "\u00A0$1");
  } catch (err) {
    console.error("Error al formatear fecha dinámica:", err);
    return "N/A";
  }
};

/**
 * Formateador solo de fecha (dd/mm/aaaa)
 */
export const formatShortDate = (isoDate, timeZone = "America/Cancun") => {
  if (!isoDate) return "N/A";

  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return "N/A";

    return new Intl.DateTimeFormat("es-MX", {
      timeZone: timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch (err) {
    console.error("Error al formatear fecha corta:", err);
    return "N/A";
  }
};

/**
 * Formateador solo de hora (hh:mm am/pm)
 */
export const formatTime = (isoDate, timeZone = "America/Cancun") => {
  if (!isoDate) return "N/A";

  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return "N/A";

    return new Intl.DateTimeFormat("es-MX", {
      timeZone: timeZone,
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch (err) {
    console.error("Error al formatear hora:", err);
    return "N/A";
  }
};

/**
 * Genera un folio amigable para sesión o corte
 */
export const getShortFolio = (id, prefix = "TURNO") => {
  if (!id) return "—";
  return `${prefix}-${String(id).slice(0, 8).toUpperCase()}`;
};

/**
 * Formatea el tipo de movimiento de caja para visualización
 */
export const formatMovementType = (type) => {
  const normalized = String(type || "").toLowerCase().trim();
  switch (normalized) {
    case "entry":
    case "cash_in":
    case "ingreso":
    case "entrada":
      return { label: "Entrada / Ingreso", isPositive: true };
    case "exit":
    case "cash_out":
    case "retiro":
    case "salida":
    case "gasto":
      return { label: "Retiro / Salida", isPositive: false };
    default:
      return { label: type || "Movimiento", isPositive: true };
  }
};

/**
 * Formatea el estado de la diferencia (Sobrante, Faltante o Exacto)
 */
export const getDifferenceStatus = (diff) => {
  const val = Number(diff) || 0;
  const tolerance = 0.009; // Para evitar imprecisiones de flotantes

  if (Math.abs(val) <= tolerance) {
    return {
      status: "exact",
      label: "Exacto",
      formatted: formatCurrency(0),
    };
  }

  if (val > 0) {
    return {
      status: "surplus",
      label: "Sobrante",
      formatted: `+${formatCurrency(val)}`,
    };
  }

  return {
    status: "shortage",
    label: "Faltante",
    formatted: `-${formatCurrency(Math.abs(val))}`,
  };
};
