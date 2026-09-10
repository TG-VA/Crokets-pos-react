/**
 * profitabilityReportFormatters.js
 * Utilidades de formateo para el reporte de rentabilidad.
 */

/**
 * Formatea cantidades numéricas a moneda ($X,XXX.XX)
 */
export const formatCurrency = (amount) => {
  const num = Number(amount);
  if (isNaN(num)) return "$0.00";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

/**
 * Formatea enteros o cantidades con separadores de miles
 */
export const formatNumber = (val) => {
  const num = Number(val);
  if (isNaN(num)) return "0";
  return new Intl.NumberFormat("es-MX").format(num);
};

/**
 * Formatea porcentajes con un decimal (ej. 32.5%)
 */
export const formatPercent = (val) => {
  const num = Number(val);
  if (isNaN(num) || !isFinite(num)) return "0.0%";
  return `${num.toFixed(1)}%`;
};

/**
 * Determina la clasificación y estilo cromático del margen de ganancia
 * - Alto: >= 30%
 * - Medio: 15% - 29.9%
 * - Bajo/Crítico: 0.1% - 14.9%
 * - Pérdida: <= 0%
 */
export const getMarginClassification = (marginPercent, { isPureReward = false } = {}) => {
  if (isPureReward) {
    return {
      label: "Promoción / Regalo",
      statusClass: "marginReward",
      isLoss: true,
      isCritical: true,
      isReward: true,
      badgeText: "Promo (0.0%)",
    };
  }
  const num = Number(marginPercent);
  if (isNaN(num) || !isFinite(num) || num <= 0) {
    return {
      label: "Pérdida / Nulo",
      statusClass: "marginLoss",
      isLoss: true,
      isCritical: true,
      isReward: false,
    };
  }
  if (num < 15) {
    return {
      label: "Crítico",
      statusClass: "marginCritical",
      isLoss: false,
      isCritical: true,
      isReward: false,
    };
  }
  if (num < 30) {
    return {
      label: "Moderado",
      statusClass: "marginModerate",
      isLoss: false,
      isCritical: false,
      isReward: false,
    };
  }
  return {
    label: "Óptimo",
    statusClass: "marginHigh",
    isLoss: false,
    isCritical: false,
    isReward: false,
  };
};

/**
 * Formatea una fecha corta (DD/MM/YYYY)
 */
export const formatShortDate = (dateStr) => {
  if (!dateStr) return "S/F";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "S/F";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (err) {
    console.error("Error al formatear fecha corta en reporte de rentabilidad:", err);
    return "S/F";
  }
};
