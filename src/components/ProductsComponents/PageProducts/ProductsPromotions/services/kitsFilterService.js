import {
  KIT_VALIDITY_STATUS,
  getKitValidityStatus,
} from "./kitValidityCalculationService";

export const KIT_STATUS_FILTERS = {
  ALL: "all",
  ACTIVE: KIT_VALIDITY_STATUS.ACTIVE,
  SCHEDULED: KIT_VALIDITY_STATUS.SCHEDULED,
  EXPIRED: KIT_VALIDITY_STATUS.EXPIRED,
  INACTIVE: KIT_VALIDITY_STATUS.INACTIVE,
};

const normalize = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

export const filterKits = (
  kits,
  { searchTerm = "", status = KIT_STATUS_FILTERS.ALL, now, timezone } = {}
) => {
  if (!Array.isArray(kits)) return [];
  const term = normalize(searchTerm);

  return kits.filter((kit) => {
    if (
      status !== KIT_STATUS_FILTERS.ALL &&
      getKitValidityStatus(kit, { now, timezone }) !== status
    ) {
      return false;
    }
    if (!term) return true;

    return (
      normalize(kit?.products?.name).includes(term) ||
      normalize(kit?.products?.barcode).includes(term)
    );
  });
};
