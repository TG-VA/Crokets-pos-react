export const KIT_MARGIN_WARNING = {
  NO_DISCOUNT: "no_discount",
  BELOW_COST: "below_cost",
};

const sumBy = (components, field) =>
  components.reduce(
    (sum, item) =>
      sum + Number(item?.[field] || 0) * Number(item?.quantity || 0),
    0
  );

/**
 * Aviso no bloqueante sobre el precio de un kit frente a sus componentes.
 * Devuelve `NO_DISCOUNT` si el precio no ofrece ahorro, `BELOW_COST` si se
 * vende por debajo del costo, o `null` si no hay nada que avisar.
 */
export const getKitMarginWarning = (components, kitPrice) => {
  const price = Number(kitPrice);
  if (!Array.isArray(components) || components.length === 0) return null;
  if (!Number.isFinite(price) || price <= 0) return null;

  if (price >= sumBy(components, "sale_price")) {
    return KIT_MARGIN_WARNING.NO_DISCOUNT;
  }
  if (price < sumBy(components, "cost_price")) {
    return KIT_MARGIN_WARNING.BELOW_COST;
  }
  return null;
};
