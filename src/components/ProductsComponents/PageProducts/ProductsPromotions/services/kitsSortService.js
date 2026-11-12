import { getKitValidityStatus } from "./kitValidityCalculationService";

export const KIT_SORT_CRITERIA = {
  EXPIRY: "expiry",
  DESCRIPTION: "description",
  PRICE: "price",
  STATUS: "status",
};

const STATUS_RANK = { active: 0, scheduled: 1, expired: 2, inactive: 3 };

const compareExpiry = (a, b) => {
  if (!a.ends_on && !b.ends_on) return 0;
  if (!a.ends_on) return 1;
  if (!b.ends_on) return -1;
  return a.ends_on < b.ends_on ? -1 : a.ends_on > b.ends_on ? 1 : 0;
};

const compareDescription = (a, b) =>
  String(a.products?.name ?? "").localeCompare(
    String(b.products?.name ?? ""),
    "es",
    { sensitivity: "base" }
  );

const comparePrice = (a, b) =>
  Number(a.products?.sale_price ?? 0) - Number(b.products?.sale_price ?? 0);

/**
 * Ordena kits sin mutar la entrada. Array.prototype.sort es estable, asi que
 * los empates conservan el orden original. Criterio desconocido: copia igual.
 */
export const sortKits = (kits, criterion, options = {}) => {
  if (!Array.isArray(kits)) return [];
  const copy = [...kits];

  const comparators = {
    [KIT_SORT_CRITERIA.EXPIRY]: compareExpiry,
    [KIT_SORT_CRITERIA.DESCRIPTION]: compareDescription,
    [KIT_SORT_CRITERIA.PRICE]: comparePrice,
    [KIT_SORT_CRITERIA.STATUS]: (a, b) =>
      (STATUS_RANK[getKitValidityStatus(a, options)] ?? 99) -
      (STATUS_RANK[getKitValidityStatus(b, options)] ?? 99),
  };

  const comparator = comparators[criterion];
  return comparator ? copy.sort(comparator) : copy;
};
