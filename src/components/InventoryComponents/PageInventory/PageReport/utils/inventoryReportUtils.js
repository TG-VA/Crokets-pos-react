export const STOCK_FILTER_PREFIX = "status:";
export const QUANTITY_FILTER_PREFIX = "quantity:";

export const STOCK_FILTER_OPTIONS = [
  {
    value: `${STOCK_FILTER_PREFIX}outOfStock`,
    statusType: "outOfStock",
    label: "Agotado",
  },
  {
    value: `${STOCK_FILTER_PREFIX}lowStock`,
    statusType: "lowStock",
    label: "Stock bajo",
  },
  {
    value: `${STOCK_FILTER_PREFIX}available`,
    statusType: "available",
    label: "Disponible",
  },
  {
    value: `${STOCK_FILTER_PREFIX}notApplicable`,
    statusType: "notApplicable",
    label: "No aplica",
  },
];

export const INITIAL_FACET_FILTERS = {
  nombre: [],
  depto: [],
  existencia: [],
};

export const formatDateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
};

export const toUpperSafe = (value, fallback = "—") => {
  const normalized = String(value ?? "").trim();

  return (normalized || fallback).toUpperCase();
};

export const formatInventoryValue = (value) => {
  return value === null || value === undefined ? "—" : String(value);
};

export const formatDateForFilename = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "00-00-00";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);

  return `${day}-${month}-${year}`;
};

export const normalizeFilenameSegment = (
  value,
  fallback = "POLIGONO"
) => {
  const normalized = String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[^\w\s-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  return normalized || fallback;
};

export const normalizeProductNameForSorting = (value) => {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
};

export const getProductWeightInKg = (productName) => {
  const normalizedName =
    normalizeProductNameForSorting(productName);

  const kilogramsMatch = normalizedName.match(
    /(\d+(?:[.,]\d+)?)\s*KG\b/
  );

  if (kilogramsMatch) {
    return Number(kilogramsMatch[1].replace(",", "."));
  }

  const gramsMatch = normalizedName.match(
    /(\d+(?:[.,]\d+)?)\s*(?:G|GR|GRAMOS?)\b/
  );

  if (gramsMatch) {
    return Number(gramsMatch[1].replace(",", ".")) / 1000;
  }

  return null;
};

export const getProductBaseName = (productName) => {
  return normalizeProductNameForSorting(productName)
    .replace(/\b\d+(?:[.,]\d+)?\s*KG\b/g, "")
    .replace(
      /\b\d+(?:[.,]\d+)?\s*(?:G|GR|GRAMOS?)\b/g,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
};

export const sortInventoryRows = (list) => {
  return [...(Array.isArray(list) ? list : [])].sort(
    (a, b) => {
      const aTracksInventory = a?.tracksInventory !== false;
      const bTracksInventory = b?.tracksInventory !== false;

      if (aTracksInventory !== bTracksInventory) {
        return aTracksInventory ? -1 : 1;
      }

      const aName = normalizeProductNameForSorting(a?.nombre);
      const bName = normalizeProductNameForSorting(b?.nombre);

      const aBaseName = getProductBaseName(aName);
      const bBaseName = getProductBaseName(bName);

      const byBaseName = aBaseName.localeCompare(
        bBaseName,
        "es",
        {
          sensitivity: "base",
          numeric: true,
        }
      );

      if (byBaseName !== 0) {
        return byBaseName;
      }

      const aWeight = getProductWeightInKg(aName);
      const bWeight = getProductWeightInKg(bName);

      if (
        aWeight !== null &&
        bWeight !== null &&
        aWeight !== bWeight
      ) {
        return aWeight - bWeight;
      }

      if (aWeight === null && bWeight !== null) {
        return -1;
      }

      if (aWeight !== null && bWeight === null) {
        return 1;
      }

      const byFullName = aName.localeCompare(bName, "es", {
        sensitivity: "base",
        numeric: true,
      });

      if (byFullName !== 0) {
        return byFullName;
      }

      const byDepartment = String(
        a?.depto || ""
      ).localeCompare(String(b?.depto || ""), "es", {
        sensitivity: "base",
        numeric: true,
      });

      if (byDepartment !== 0) {
        return byDepartment;
      }

      return String(a?.codigo || "").localeCompare(
        String(b?.codigo || ""),
        "es",
        {
          sensitivity: "base",
          numeric: true,
        }
      );
    }
  );
};

export const getStockStatus = (row) => {
  if (
    row?.tracksInventory === false ||
    row?.existencia === null ||
    row?.existencia === undefined
  ) {
    return {
      type: "notApplicable",
      label: "No aplica",
    };
  }

  const stock = Number(row.existencia ?? 0);
  const minimumStock = Number(row.min ?? 0);

  if (stock <= 0) {
    return {
      type: "outOfStock",
      label: "Agotado",
    };
  }

  if (minimumStock > 0 && stock <= minimumStock) {
    return {
      type: "lowStock",
      label: "Stock bajo",
    };
  }

  return {
    type: "available",
    label: "Disponible",
  };
};

export const getExistenceFilterLabel = (filterValue) => {
  if (
    String(filterValue).startsWith(QUANTITY_FILTER_PREFIX)
  ) {
    return `Cantidad: ${String(filterValue).replace(
      QUANTITY_FILTER_PREFIX,
      ""
    )}`;
  }

  const statusOption = STOCK_FILTER_OPTIONS.find(
    (option) => option.value === filterValue
  );

  return statusOption?.label || filterValue;
};

export const getSelectedBranchLabel = ({
  branchOptions = [],
  selectedBranchId = "",
}) => {
  const selectedBranch = branchOptions.find(
    (item) => item.id === selectedBranchId
  );

  if (!selectedBranch) {
    return selectedBranchId || "—";
  }

  if (selectedBranch.code) {
    return `${selectedBranch.name} (${selectedBranch.code})`;
  }

  return selectedBranch.name;
};

export const getActiveFilterCount = (facetFilters = {}) => {
  return Object.values(facetFilters).reduce(
    (total, values) => {
      return total + (Array.isArray(values) && values.length > 0 ? 1 : 0);
    },
    0
  );
};

export const filterInventoryRows = ({
  rows = [],
  facetFilters = INITIAL_FACET_FILTERS,
}) => {
  const filteredRows = rows.filter((row) => {
    if (
      facetFilters.nombre.length > 0 &&
      !facetFilters.nombre.includes(row.nombre || "")
    ) {
      return false;
    }

    if (
      facetFilters.depto.length > 0 &&
      !facetFilters.depto.includes(row.depto || "—")
    ) {
      return false;
    }

    if (facetFilters.existencia.length > 0) {
      const stockStatus = getStockStatus(row);

      const matchesExistenceFilter =
        facetFilters.existencia.some((filterValue) => {
          if (
            filterValue.startsWith(STOCK_FILTER_PREFIX)
          ) {
            const requiredStatus = filterValue.replace(
              STOCK_FILTER_PREFIX,
              ""
            );

            return stockStatus.type === requiredStatus;
          }

          if (
            filterValue.startsWith(QUANTITY_FILTER_PREFIX)
          ) {
            if (
              row.existencia === null ||
              row.existencia === undefined ||
              row.tracksInventory === false
            ) {
              return false;
            }

            const requiredQuantity = Number(
              filterValue.replace(
                QUANTITY_FILTER_PREFIX,
                ""
              )
            );

            return (
              Number(row.existencia) === requiredQuantity
            );
          }

          return false;
        });

      if (!matchesExistenceFilter) {
        return false;
      }
    }

    return true;
  });

  return sortInventoryRows(filteredRows);
};

export const getStockSummary = (rows = []) => {
  return rows.reduce(
    (summary, row) => {
      const status = getStockStatus(row);

      if (status.type === "outOfStock") {
        summary.outOfStock += 1;
      }

      if (status.type === "lowStock") {
        summary.lowStock += 1;
      }

      return summary;
    },
    {
      outOfStock: 0,
      lowStock: 0,
    }
  );
};

export const getStockStatusCounts = (rows = []) => {
  return rows.reduce(
    (counts, row) => {
      const status = getStockStatus(row);

      if (Object.prototype.hasOwnProperty.call(counts, status.type)) {
        counts[status.type] += 1;
      }

      return counts;
    },
    {
      outOfStock: 0,
      lowStock: 0,
      available: 0,
      notApplicable: 0,
    }
  );
};

export const buildFacetOptions = (rows = []) => {
  const counts = {
    nombre: new Map(),
    depto: new Map(),
  };

  rows.forEach((row) => {
    const name = String(row.nombre || "").trim() || "—";
    const department =
      String(row.depto || "").trim() || "—";

    counts.nombre.set(
      name,
      (counts.nombre.get(name) || 0) + 1
    );

    counts.depto.set(
      department,
      (counts.depto.get(department) || 0) + 1
    );
  });

  return {
    nombre: [...counts.nombre.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], "es"))
      .map(([value, count]) => ({
        value,
        label: value.toUpperCase(),
        count,
      })),

    depto: [...counts.depto.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], "es"))
      .map(([value, count]) => ({
        value,
        label: value.toUpperCase(),
        count,
      })),
  };
};

export const getVisibleFacetOptions = ({
  key,
  facetSearch = {},
  facetOptions = {},
}) => {
  const searchValue = String(facetSearch[key] || "")
    .trim()
    .toUpperCase();

  const options = facetOptions[key] || [];

  if (!searchValue) {
    return options;
  }

  return options.filter((item) =>
    item.label.toUpperCase().includes(searchValue)
  );
};