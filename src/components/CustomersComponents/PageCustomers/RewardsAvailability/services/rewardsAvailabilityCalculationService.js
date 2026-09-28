/**
 * rewardsAvailabilityCalculationService.js
 * Calculos puros de la consulta de recompensas: resumen de disponibilidad por
 * recompensa y etiquetas de tipo/estado. Sin I/O ni React.
 *
 * El saldo de puntos se importa de `customerPointsCalculationService` porque lo
 * comparte con el ajuste manual de puntos.
 */

/**
 * Cuenta cuantas recompensas puede canjear el cliente con su saldo actual.
 *
 * Sin cliente seleccionado no hay saldo contra el que comparar, asi que nada
 * se marca como disponible.
 */
export const calculateRewardsStats = ({
  rewards = [],
  customerPoints = 0,
  hasSelectedCustomer = false,
} = {}) => {
  if (!hasSelectedCustomer) {
    return {
      available: 0,
      unavailable: 0,
      total: rewards.length,
    };
  }

  return rewards.reduce(
    (acc, reward) => {
      const requiredPoints = Number(reward.points_required || 0);

      if (customerPoints >= requiredPoints) {
        acc.available += 1;
      } else {
        acc.unavailable += 1;
      }

      acc.total += 1;
      return acc;
    },
    { available: 0, unavailable: 0, total: 0 }
  );
};

/**
 * Texto del tipo de recompensa (producto gratis o descuento).
 */
export const getRewardTypeLabel = (reward) => {
  const type = String(reward?.reward_type || "").trim();

  if (type === "free_product") {
    return "Producto gratis";
  }

  if (type === "product_discount") {
    if (reward?.discount_type === "percent") {
      return `Descuento ${Number(reward.discount_value || 0)}%`;
    }

    if (reward?.discount_type === "fixed") {
      return `Descuento $${Number(reward.discount_value || 0).toFixed(2)}`;
    }

    return "Descuento en producto";
  }

  return "Recompensa";
};

/**
 * Estado de canje de una recompensa para el cliente seleccionado.
 */
export const getRewardStatus = ({
  reward,
  customerPoints,
  hasSelectedCustomer,
}) => {
  const requiredPoints = Number(reward.points_required || 0);

  if (!hasSelectedCustomer) {
    return {
      label: "Selecciona un cliente",
      status: "neutral",
    };
  }

  if (customerPoints >= requiredPoints) {
    return {
      label: "Disponible para canje en ventas",
      status: "available",
    };
  }

  return {
    label: `Faltan ${requiredPoints - customerPoints} puntos`,
    status: "unavailable",
  };
};

/**
 * Un termino de busqueda necesita al menos 2 caracteres.
 */
export const isSearchableCustomerTerm = (searchTerm) => {
  return String(searchTerm || "").trim().length >= 2;
};
