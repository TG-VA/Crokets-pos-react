export const KIT_STATUS_FILTERS = {
  ALL: "all",
  ACTIVE: "active",
  INACTIVE: "inactive",
};

const normalize = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

export const filterKits = (kits, { searchTerm = "", status = "all" } = {}) => {
  if (!Array.isArray(kits)) return [];
  const term = normalize(searchTerm);

  return kits.filter((kit) => {
    if (status === KIT_STATUS_FILTERS.ACTIVE && !kit?.is_active) return false;
    if (status === KIT_STATUS_FILTERS.INACTIVE && kit?.is_active) return false;
    if (!term) return true;

    return (
      normalize(kit?.products?.name).includes(term) ||
      normalize(kit?.products?.barcode).includes(term)
    );
  });
};
