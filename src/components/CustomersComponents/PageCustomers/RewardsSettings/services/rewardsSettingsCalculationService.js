/**
 * rewardsSettingsCalculationService.js
 * Calculos puros de la configuracion de recompensas: normalizacion de tipo,
 * etiquetas de beneficio y productos, ordenamiento, filtrado y ejemplo de la
 * regla de puntos. Sin I/O, sin React y sin Supabase.
 */

export const EXAMPLE_SALE_AMOUNT = 420;

/**
 * La base solo admite `product_discount`; cualquier otro valor se trata como
 * producto gratis, que es el comportamiento historico de la pantalla.
 */
export const normalizeRewardType = (type) => {
  if (type === "product_discount") return "product_discount";
  return "free_product";
};

/**
 * Etiqueta corta del tipo de recompensa.
 */
export const getRewardTypeLabel = (type) => {
  const rewardType = normalizeRewardType(type);

  if (rewardType === "free_product") return "PRODUCTO GRATIS";
  if (rewardType === "product_discount") return "DESCUENTO EN PRODUCTO";

  return "PRODUCTO GRATIS";
};

/**
 * Descripcion del beneficio segun tipo, cantidad y descuento.
 */
export const getRewardBenefitLabel = (reward) => {
  const rewardType = normalizeRewardType(reward?.reward_type);
  const quantity = Number(reward?.reward_quantity || 1);
  const discountType = reward?.discount_type;
  const discountValue = Number(reward?.discount_value || 0);

  if (rewardType === "free_product") {
    return `${quantity} producto${quantity !== 1 ? "s" : ""} gratis`;
  }

  if (rewardType === "product_discount") {
    if (discountType === "percent") {
      return `${discountValue}% en ${quantity} unidad${quantity !== 1 ? "es" : ""}`;
    }

    if (discountType === "fixed") {
      return `$${discountValue.toFixed(2)} en ${quantity} unidad${
        quantity !== 1 ? "es" : ""
      }`;
    }

    return `Descuento en ${quantity} unidad${quantity !== 1 ? "es" : ""}`;
  }

  return "Sin beneficio";
};

/**
 * Productos aplicables: un descuento aplica a todos, un producto gratis solo a
 * los vinculados.
 */
export const getLinkedProductsLabel = (reward) => {
  const rewardType = normalizeRewardType(reward?.reward_type);
  const linkedProductsCount = reward?.reward_products?.length || 0;

  if (rewardType === "product_discount") {
    return "TODOS";
  }

  if (linkedProductsCount === 0) {
    return "SIN PRODUCTOS";
  }

  return `${linkedProductsCount} producto${linkedProductsCount !== 1 ? "s" : ""}`;
};

/**
 * Ordena recompensas: activas primero, luego por puntos requeridos y nombre.
 */
export const sortRewards = (rewardsList = []) => {
  return [...rewardsList].sort((a, b) => {
    const statusA = a.is_active === false ? 1 : 0;
    const statusB = b.is_active === false ? 1 : 0;

    if (statusA !== statusB) return statusA - statusB;

    const pointsA = Number(a.points_required || 0);
    const pointsB = Number(b.points_required || 0);

    if (pointsA !== pointsB) return pointsA - pointsB;

    return String(a.name || "").localeCompare(String(b.name || ""), "es", {
      sensitivity: "base",
      numeric: true,
    });
  });
};

/**
 * Filtra por estado y busqueda libre sobre todos los textos derivados de la
 * recompensa, y vuelve a ordenar el resultado.
 */
export const filterAndSortRewards = ({
  rewards = [],
  searchTerm = "",
  statusFilter = "all",
} = {}) => {
  const search = searchTerm.trim().toLowerCase();

  const filtered = rewards.filter((reward) => {
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && reward.is_active !== false) ||
      (statusFilter === "inactive" && reward.is_active === false);

    if (!matchesStatus) return false;

    if (!search) return true;

    const values = [
      reward.name,
      reward.description,
      reward.points_required,
      normalizeRewardType(reward.reward_type),
      getRewardTypeLabel(reward.reward_type),
      getRewardBenefitLabel(reward),
      getLinkedProductsLabel(reward),
    ];

    return values.some((value) =>
      String(value || "")
        .toLowerCase()
        .includes(search)
    );
  });

  return sortRewards(filtered);
};

/**
 * Puntos que generaria una venta de ejemplo con la regla actual.
 *
 * El sistema no maneja puntos fraccionarios, asi que siempre redondea hacia
 * abajo; sin regla valida el ejemplo es 0.
 */
export const calculateExamplePoints = (pointsAmountPerPoint) => {
  if (!pointsAmountPerPoint || pointsAmountPerPoint <= 0) {
    return 0;
  }

  return Math.floor(EXAMPLE_SALE_AMOUNT / pointsAmountPerPoint);
};

/**
 * `true` cuando el valor editado difiere del almacenado.
 */
export const hasPointsRuleChanges = ({
  pointsAmountPerPoint,
  originalPointsAmountPerPoint,
}) => {
  return (
    String(pointsAmountPerPoint || "").trim() !==
    String(originalPointsAmountPerPoint || "").trim()
  );
};

/**
 * Reglas de habilitacion del boton de guardado de la regla.
 */
export const canSavePointsRule = ({
  numericPointsAmountPerPoint,
  hasChanges,
  savingPointsRule,
  loadingPointsRule,
}) => {
  return (
    numericPointsAmountPerPoint > 0 &&
    hasChanges &&
    !savingPointsRule &&
    !loadingPointsRule
  );
};

/**
 * Normaliza el input de monto: solo digitos y un punto, hasta 2 decimales y sin
 * ceros a la izquierda.
 */
export const sanitizePointsAmountInput = (value) => {
  const cleanValue = String(value || "")
    .replace(/[^\d.]/g, "")
    .replace(/^0+(?=\d)/, "");

  const parts = cleanValue.split(".");

  return parts.length > 1
    ? `${parts[0]}.${parts.slice(1).join("").slice(0, 2)}`
    : parts[0];
};

/**
 * Titulo y mensaje de la confirmacion de activacion o desactivacion.
 */
export const buildRewardStatusConfirmation = (reward) => {
  const nextStatus = reward.is_active === false;
  const actionLabel = nextStatus ? "activar" : "desactivar";

  return {
    nextStatus,
    type: nextStatus ? "info" : "warning",
    title: nextStatus ? "Activar recompensa" : "Desactivar recompensa",
    message: `¿Seguro que deseas ${actionLabel} la recompensa "${
      reward.name || "SIN NOMBRE"
    }"? ${
      nextStatus
        ? "Volverá a estar disponible para canjearse en ventas."
        : "Ya no estará disponible para canjearse en ventas."
    }`,
    confirmText: nextStatus ? "Activar" : "Desactivar",
    cancelText: "Cancelar",
  };
};
