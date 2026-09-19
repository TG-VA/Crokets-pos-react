/**
 * customersReportFormatters.js
 * Utilidades de formateo para el reporte de clientes.
 */

/**
 * Formatea cantidades numéricas a moneda nacional MXN
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(Number(amount) || 0);
};

/**
 * Formatea valores numéricos con separador de miles
 */
export const formatNumber = (value) => {
  return new Intl.NumberFormat("es-MX").format(Number(value) || 0);
};

/**
 * Formateador de fecha/hora dinámico respetando la zona horaria de la sucursal
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

    return formatted
      .replace(/,\s*/g, " - ")
      .replace(/\s+([ap]\.?\s*m\.?)/i, "\u00A0$1");
  } catch (err) {
    console.error("Error al formatear fecha dinamica en reporte de clientes:", err);
    return "N/A";
  }
};

/**
 * Formateador de solo fecha corta (DD/MM/YYYY)
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
    console.error("Error al formatear fecha corta en reporte de clientes:", err);
    return "N/A";
  }
};

/**
 * Formateador de solo hora corta (ej. 11:47 p.m.)
 */
export const formatShortTime = (isoDate, timeZone = "America/Cancun") => {
  if (!isoDate) return "";

  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat("es-MX", {
      timeZone: timeZone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch (err) {
    console.error("Error al formatear hora corta en reporte de clientes:", err);
    return "";
  }
};

/**
 * Limpia y formatea números telefónicos a 10 dígitos (XXX) XXX-XXXX
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return "Sin teléfono";
  const cleaned = String(phone).replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

/**
 * Calcula la diferencia en días desde una fecha dada hasta hoy
 */
export const getDaysAgo = (isoDate) => {
  if (!isoDate) return null;
  try {
    const target = new Date(isoDate);
    if (isNaN(target.getTime())) return null;
    const now = new Date();
    const diffMs = now.getTime() - target.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  } catch (err) {
    console.error("Error calculando dias transcurridos:", err);
    return null;
  }
};

/**
 * Determina el estado de retención / riesgo del cliente según los días transcurridos
 */
export const getCustomerRiskBadge = (daysAgo) => {
  if (daysAgo === null || daysAgo === undefined) {
    return {
      label: "Sin compras",
      className: "badgeNeutral",
      isRisk: false,
    };
  }

  if (daysAgo <= 15) {
    return {
      label: daysAgo === 0 ? "Hoy" : `Hace ${daysAgo}d (Reciente)`,
      className: "badgeSuccess",
      isRisk: false,
    };
  }

  if (daysAgo <= 30) {
    return {
      label: `Hace ${daysAgo}d (Regular)`,
      className: "badgeInfo",
      isRisk: false,
    };
  }

  if (daysAgo <= 60) {
    return {
      label: `Hace ${daysAgo}d (En riesgo)`,
      className: "badgeWarning",
      isRisk: true,
    };
  }

  return {
    label: `Hace ${daysAgo}d (Inactivo)`,
    className: "badgeDanger",
    isRisk: true,
  };
};
