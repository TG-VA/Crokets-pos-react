import React, { useEffect, useMemo, useState } from "react";
import ExcelJS from "exceljs";
import { supabase } from "../../../../lib/supabaseClient";
import { useBranch } from "../../../../contexts/BranchContext";
import styles from "./PageReport.module.css";

const POLI_BRANCH_ID = "412f367f-7c86-45ca-9e91-b8fe6274b232";
const REFRESH_INTERVAL_MS = 2000;

const STOCK_FILTER_PREFIX = "status:";
const QUANTITY_FILTER_PREFIX = "quantity:";

const STOCK_FILTER_OPTIONS = [
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

const INITIAL_FACET_FILTERS = {
  nombre: [],
  depto: [],
  existencia: [],
};

const formatDateTime = (value) => {
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

const toUpperSafe = (value, fallback = "—") => {
  const normalized = String(value ?? "").trim();

  return (normalized || fallback).toUpperCase();
};

const formatInventoryValue = (value) => {
  return value === null || value === undefined ? "—" : String(value);
};

const formatDateForFilename = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "00-00-00";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);

  return `${day}-${month}-${year}`;
};

const normalizeFilenameSegment = (value, fallback = "POLIGONO") => {
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

const normalizeProductNameForSorting = (value) => {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
};

const getProductWeightInKg = (productName) => {
  const normalizedName = normalizeProductNameForSorting(productName);

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

const getProductBaseName = (productName) => {
  return normalizeProductNameForSorting(productName)
    .replace(/\b\d+(?:[.,]\d+)?\s*KG\b/g, "")
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:G|GR|GRAMOS?)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

const sortInventoryRows = (list) => {
  return [...(Array.isArray(list) ? list : [])].sort((a, b) => {
    const aTracksInventory = a?.tracksInventory !== false;
    const bTracksInventory = b?.tracksInventory !== false;

    if (aTracksInventory !== bTracksInventory) {
      return aTracksInventory ? -1 : 1;
    }

    const aName = normalizeProductNameForSorting(a?.nombre);
    const bName = normalizeProductNameForSorting(b?.nombre);

    const aBaseName = getProductBaseName(aName);
    const bBaseName = getProductBaseName(bName);

    const byBaseName = aBaseName.localeCompare(bBaseName, "es", {
      sensitivity: "base",
      numeric: true,
    });

    if (byBaseName !== 0) {
      return byBaseName;
    }

    const aWeight = getProductWeightInKg(aName);
    const bWeight = getProductWeightInKg(bName);

    if (aWeight !== null && bWeight !== null && aWeight !== bWeight) {
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

    const byDepartment = String(a?.depto || "").localeCompare(
      String(b?.depto || ""),
      "es",
      {
        sensitivity: "base",
        numeric: true,
      }
    );

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
  });
};

const getStockStatus = (row) => {
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

const getExistenceFilterLabel = (filterValue) => {
  if (filterValue.startsWith(QUANTITY_FILTER_PREFIX)) {
    return `Cantidad: ${filterValue.replace(QUANTITY_FILTER_PREFIX, "")}`;
  }

  const statusOption = STOCK_FILTER_OPTIONS.find(
    (option) => option.value === filterValue
  );

  return statusOption?.label || filterValue;
};

const PageReport = () => {
  const { branch } = useBranch();

  const [branchOptions, setBranchOptions] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [expandedProductId, setExpandedProductId] = useState(null);
  const [otherStocksByProduct, setOtherStocksByProduct] = useState({});
  const [loadingDetailsByProduct, setLoadingDetailsByProduct] = useState({});
  const [detailsErrorByProduct, setDetailsErrorByProduct] = useState({});

  const [facetFilters, setFacetFilters] = useState(INITIAL_FACET_FILTERS);
  const [openFacet, setOpenFacet] = useState(null);
  const [facetSearch, setFacetSearch] = useState({});
  const [existenceQuantity, setExistenceQuantity] = useState("");

  useEffect(() => {
    if (!openFacet) return undefined;

    const key = openFacet;

    const handleMouseDown = (event) => {
      const popover = event.target?.closest?.(
        `[data-inv-filter-popover="${key}"]`
      );

      const button = event.target?.closest?.(
        `[data-inv-filter-button="${key}"]`
      );

      if (popover || button) return;

      setOpenFacet(null);
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpenFacet(null);
      }
    };

    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openFacet]);

  const setFacet = (key, values, { close = false } = {}) => {
    setFacetFilters((previous) => ({
      ...previous,
      [key]: values,
    }));

    if (close) {
      setOpenFacet(null);
    }
  };

  const toggleFacetValue = (key, value, { close = true } = {}) => {
    setFacetFilters((previous) => {
      const currentValues = Array.isArray(previous[key])
        ? previous[key]
        : [];

      const valueExists = currentValues.includes(value);

      return {
        ...previous,
        [key]: valueExists
          ? currentValues.filter((item) => item !== value)
          : [...currentValues, value],
      };
    });

    if (close) {
      setOpenFacet(null);
    }
  };

  const clearFacet = (key, options) => {
    setFacet(key, [], options);

    if (key === "existencia") {
      setExistenceQuantity("");
    }
  };

  const toggleFacet = (key) => {
    setOpenFacet((previous) => {
      const next = previous === key ? null : key;

      if (next && next !== "existencia") {
        setFacetSearch((current) => ({
          ...current,
          [key]: current?.[key] ?? "",
        }));
      }

      return next;
    });
  };

  const clearAllFilters = () => {
    setFacetFilters({
      nombre: [],
      depto: [],
      existencia: [],
    });

    setFacetSearch({});
    setExistenceQuantity("");
    setOpenFacet(null);
    setExpandedProductId(null);
  };

  const handleExistenceQuantityChange = (event) => {
    const value = event.target.value.replace(/\D/g, "");
    setExistenceQuantity(value);
  };

  const applyExistenceQuantityFilter = () => {
    const cleanQuantity = String(existenceQuantity || "").trim();

    if (!cleanQuantity) return;

    const normalizedQuantity = String(Number(cleanQuantity));
    const quantityFilter = `${QUANTITY_FILTER_PREFIX}${normalizedQuantity}`;

    setFacetFilters((previous) => {
      const currentValues = Array.isArray(previous.existencia)
        ? previous.existencia
        : [];

      const valuesWithoutPreviousQuantities = currentValues.filter(
        (value) => !value.startsWith(QUANTITY_FILTER_PREFIX)
      );

      return {
        ...previous,
        existencia: [
          ...valuesWithoutPreviousQuantities,
          quantityFilter,
        ],
      };
    });

    setExistenceQuantity(normalizedQuantity);
    setOpenFacet(null);
  };

  const removeExistenceQuantityFilter = () => {
    setFacetFilters((previous) => ({
      ...previous,
      existencia: previous.existencia.filter(
        (value) => !value.startsWith(QUANTITY_FILTER_PREFIX)
      ),
    }));

    setExistenceQuantity("");
  };

  useEffect(() => {
    if (selectedBranchId) return;

    if (branch?.id) {
      setSelectedBranchId(branch.id);
    }
  }, [branch?.id, selectedBranchId]);

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const { data, error: branchesError } = await supabase
          .from("branches")
          .select("id, name, code")
          .order("name", { ascending: true });

        if (branchesError) throw branchesError;

        const branchesList = Array.isArray(data) ? data : [];

        const includesPoligono = branchesList.some(
          (item) => item?.id === POLI_BRANCH_ID
        );

        setBranchOptions(
          includesPoligono
            ? branchesList
            : [
                ...branchesList,
                {
                  id: POLI_BRANCH_ID,
                  name: "POLÍGONO",
                  code: "",
                },
              ]
        );
      } catch (loadError) {
        console.error("Error cargando sucursales:", loadError);

        const fallback = branch?.id
          ? [
              {
                id: POLI_BRANCH_ID,
                name: "POLÍGONO",
                code: "",
              },
              {
                id: branch.id,
                name: branch?.name || "Sucursal actual",
                code: branch?.code || "",
              },
            ]
          : [];

        setBranchOptions(fallback);
      }
    };

    loadBranches();
  }, [branch?.id, branch?.name, branch?.code]);

  useEffect(() => {
    let pollingId = null;
    let isMounted = true;

    const loadInventoryByBranch = async ({ silent = false } = {}) => {
      if (!selectedBranchId) {
        if (isMounted) {
          setRows([]);
          setError("");
        }

        return;
      }

      if (!silent && isMounted) {
        setLoading(true);
      }

      if (isMounted) {
        setError("");
      }

      try {
        const selectCandidates = [
          `
            id,
            branch_id,
            product_id,
            stock,
            min_stock,
            max_stock,
            is_active,
            products:product_id(
              id,
              barcode,
              name,
              department_id,
              is_global,
              status,
              tracks_inventory,
              departments(
                name
              )
            )
          `,
          `
            id,
            branch_id,
            product_id,
            stock,
            min_stock,
            max_stock,
            is_active,
            products(
              id,
              barcode,
              name,
              department_id,
              is_global,
              status,
              tracks_inventory,
              departments(
                name
              )
            )
          `,
        ];

        let inventoryRows = [];
        let lastError = null;

        for (const selectClause of selectCandidates) {
          const result = await supabase
            .from("branch_inventory")
            .select(selectClause)
            .eq("branch_id", selectedBranchId)
            .eq("is_active", true)
            .order("created_at", { ascending: false });

          if (result.error) {
            lastError = result.error;
            continue;
          }

          inventoryRows = result.data ?? [];
          lastError = null;
          break;
        }

        if (lastError) throw lastError;

        const activeInventoryRows = inventoryRows.filter((item) => {
          const product = item?.products;

          if (!product?.id) return false;

          return product.status === true;
        });

        const mappedInventoryRows = activeInventoryRows.map((item) => {
          const product = item?.products ?? {};

          return {
            inventoryRowId: item?.id ?? null,
            productId: item?.product_id ?? product?.id ?? null,
            codigo: String(product?.barcode ?? ""),
            nombre: String(product?.name ?? ""),
            depto: String(product?.departments?.name ?? ""),
            existencia: Number(item?.stock ?? 0) || 0,
            min: Number(item?.min_stock ?? 0) || 0,
            max: Number(item?.max_stock ?? 0) || 0,
            tracksInventory: product?.tracks_inventory !== false,
            noStockProduct: false,
          };
        });

        const inventoryProductIds = new Set(
          mappedInventoryRows.map((item) => item.productId).filter(Boolean)
        );

        const { data: noStockProducts, error: noStockProductsError } =
          await supabase
            .from("products")
            .select(`
              id,
              barcode,
              name,
              department_id,
              is_global,
              status,
              tracks_inventory,
              departments(
                name
              )
            `)
            .eq("status", true)
            .eq("tracks_inventory", false)
            .order("created_at", { ascending: false });

        if (noStockProductsError) throw noStockProductsError;

        const mappedNoStockProducts = (noStockProducts || [])
          .filter((item) => !inventoryProductIds.has(item.id))
          .map((item) => ({
            inventoryRowId: null,
            productId: item.id,
            codigo: String(item?.barcode ?? ""),
            nombre: String(item?.name ?? ""),
            depto: String(item?.departments?.name ?? ""),
            existencia: null,
            min: null,
            max: null,
            tracksInventory: false,
            noStockProduct: true,
          }));

        if (isMounted) {
          setRows(
            sortInventoryRows([
              ...mappedInventoryRows,
              ...mappedNoStockProducts,
            ])
          );
        }
      } catch (loadError) {
        console.error("Error cargando reporte de inventario:", loadError);

        if (isMounted) {
          setRows([]);
          setError("No se pudo cargar el reporte de inventario.");
        }
      } finally {
        if (!silent && isMounted) {
          setLoading(false);
        }
      }
    };

    loadInventoryByBranch();

    pollingId = window.setInterval(() => {
      loadInventoryByBranch({ silent: true });
    }, REFRESH_INTERVAL_MS);

    return () => {
      isMounted = false;

      if (pollingId) {
        window.clearInterval(pollingId);
      }
    };
  }, [selectedBranchId]);

  const selectedBranchLabel = useMemo(() => {
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
  }, [branchOptions, selectedBranchId]);

  const activeFilterCount = useMemo(() => {
    return Object.values(facetFilters).reduce((total, values) => {
      return total + (values.length > 0 ? 1 : 0);
    }, 0);
  }, [facetFilters]);

  const filteredRows = useMemo(() => {
    return sortInventoryRows(
      rows.filter((row) => {
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

          const matchesExistenceFilter = facetFilters.existencia.some(
            (filterValue) => {
              if (filterValue.startsWith(STOCK_FILTER_PREFIX)) {
                const requiredStatus = filterValue.replace(
                  STOCK_FILTER_PREFIX,
                  ""
                );

                return stockStatus.type === requiredStatus;
              }

              if (filterValue.startsWith(QUANTITY_FILTER_PREFIX)) {
                if (
                  row.existencia === null ||
                  row.existencia === undefined ||
                  row.tracksInventory === false
                ) {
                  return false;
                }

                const requiredQuantity = Number(
                  filterValue.replace(QUANTITY_FILTER_PREFIX, "")
                );

                return Number(row.existencia) === requiredQuantity;
              }

              return false;
            }
          );

          if (!matchesExistenceFilter) {
            return false;
          }
        }

        return true;
      })
    );
  }, [rows, facetFilters]);

  const stockSummary = useMemo(() => {
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
  }, [rows]);

  const stockStatusCounts = useMemo(() => {
    return rows.reduce(
      (counts, row) => {
        const status = getStockStatus(row);
        counts[status.type] += 1;
        return counts;
      },
      {
        outOfStock: 0,
        lowStock: 0,
        available: 0,
        notApplicable: 0,
      }
    );
  }, [rows]);

  const handleExportInventory = async () => {
    if (loading || filteredRows.length === 0) {
      return;
    }

    const workbook = new ExcelJS.Workbook();

    const worksheet = workbook.addWorksheet("INVENTARIO", {
      views: [{ showGridLines: true }],
    });

    worksheet.columns = [
      { key: "codigo", width: 31 },
      { key: "nombre", width: 45 },
      { key: "depto", width: 24 },
      { key: "existencia", width: 17 },
      { key: "min", width: 12 },
      { key: "max", width: 12 },
    ];

    worksheet.mergeCells("A1:F1");

    const titleCell = worksheet.getCell("A1");

    titleCell.value = "REPORTE DE INVENTARIO";
    titleCell.font = {
      bold: true,
      size: 18,
      name: "Arial",
    };

    titleCell.alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    worksheet.getRow(1).height = 28;

    const appliedNameFilter =
      facetFilters.nombre.length > 0
        ? facetFilters.nombre.map((value) => toUpperSafe(value)).join(", ")
        : "TODOS";

    const appliedDepartmentFilter =
      facetFilters.depto.length > 0
        ? facetFilters.depto.map((value) => toUpperSafe(value)).join(", ")
        : "TODOS";

    const appliedInventoryFilter =
      facetFilters.existencia.length > 0
        ? facetFilters.existencia
            .map((value) => getExistenceFilterLabel(value).toUpperCase())
            .join(", ")
        : "TODAS";

    const informationRows = [
      ["SUCURSAL", selectedBranchLabel],
      ["PRODUCTOS EXPORTADOS", String(filteredRows.length)],
      ["FILTRO NOMBRE", appliedNameFilter],
      ["FILTRO DEPARTAMENTO", appliedDepartmentFilter],
      ["FILTRO EXISTENCIA", appliedInventoryFilter],
      ["EXPORTADO", formatDateTime(new Date().toISOString())],
    ];

    const thinBorder = {
      top: {
        style: "thin",
        color: { argb: "FF000000" },
      },
      left: {
        style: "thin",
        color: { argb: "FF000000" },
      },
      bottom: {
        style: "thin",
        color: { argb: "FF000000" },
      },
      right: {
        style: "thin",
        color: { argb: "FF000000" },
      },
    };

    informationRows.forEach(([label, value], index) => {
      const rowNumber = index + 2;
      const labelCell = worksheet.getCell(`A${rowNumber}`);
      const valueCell = worksheet.getCell(`B${rowNumber}`);

      labelCell.value = label;
      valueCell.value = value;

      labelCell.font = {
        bold: true,
        name: "Arial",
      };

      valueCell.font = {
        name: "Arial",
      };

      labelCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: "FFF3F3F3",
        },
      };

      valueCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: "FFF9F9F9",
        },
      };

      labelCell.border = thinBorder;
      valueCell.border = thinBorder;

      labelCell.alignment = {
        vertical: "middle",
      };

      valueCell.alignment = {
        vertical: "middle",
      };
    });

    const headerRowNumber = 10;
    const dataStartRow = headerRowNumber + 1;

    worksheet.getRow(headerRowNumber).values = [
      "CÓDIGO",
      "NOMBRE",
      "DEPARTAMENTO",
      "EXISTENCIA",
      "MÍNIMO",
      "MÁXIMO",
    ];

    worksheet.getRow(headerRowNumber).eachCell((cell) => {
      cell.font = {
        bold: true,
        color: {
          argb: "FFFFFFFF",
        },
        name: "Arial",
      };

      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: "FFFC8913",
        },
      };

      cell.border = thinBorder;

      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
      };
    });

    filteredRows.forEach((row, index) => {
      const excelRow = worksheet.getRow(dataStartRow + index);

      excelRow.values = [
        toUpperSafe(row.codigo),
        toUpperSafe(row.nombre),
        toUpperSafe(row.depto),
        formatInventoryValue(row.existencia),
        formatInventoryValue(row.min),
        formatInventoryValue(row.max),
      ];

      for (let columnNumber = 1; columnNumber <= 6; columnNumber += 1) {
        const cell = excelRow.getCell(columnNumber);

        cell.font = {
          name: "Arial",
        };

        cell.border = thinBorder;

        cell.alignment =
          columnNumber >= 4
            ? {
                horizontal: "center",
                vertical: "middle",
              }
            : {
                vertical: "middle",
              };

        if (index % 2 === 0) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: {
              argb: "FFFDF1E6",
            },
          };
        }
      }
    });

    worksheet.autoFilter = {
      from: {
        row: headerRowNumber,
        column: 1,
      },
      to: {
        row: headerRowNumber,
        column: 6,
      },
    };

    const branchNameForFile = normalizeFilenameSegment(
      selectedBranchLabel,
      "POLIGONO"
    );

    const filename = `INVENTARIO ${branchNameForFile} ${formatDateForFilename()}.xlsx`;

    const output = await workbook.xlsx.writeBuffer();

    const blob = new Blob([output], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = filename;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
  };

  const facetOptions = useMemo(() => {
    const counts = {
      nombre: new Map(),
      depto: new Map(),
    };

    rows.forEach((row) => {
      const name = String(row.nombre || "").trim() || "—";
      const department = String(row.depto || "").trim() || "—";

      counts.nombre.set(name, (counts.nombre.get(name) || 0) + 1);

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
  }, [rows]);

  const getVisibleFacetOptions = (key) => {
    const searchValue = String(facetSearch[key] || "")
      .trim()
      .toUpperCase();

    const options = facetOptions[key] || [];

    if (!searchValue) return options;

    return options.filter((item) =>
      item.label.toUpperCase().includes(searchValue)
    );
  };

  const renderFacetButton = (key) => {
    const selectedCount = facetFilters[key]?.length || 0;
    const isOpen = openFacet === key;

    return (
      <button
        type="button"
        className={`${styles.filterButton} ${
          selectedCount > 0 ? styles.filterButtonActive : ""
        } ${isOpen ? styles.filterButtonOpen : ""}`}
        onClick={() => toggleFacet(key)}
        data-inv-filter-button={key}
        aria-label={`Filtrar ${key}`}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M3 5h18l-7 8v5l-4 1v-6L3 5z" />
        </svg>

        {selectedCount > 0 && (
          <span className={styles.filterBadge}>{selectedCount}</span>
        )}
      </button>
    );
  };

  const renderExistencePopover = () => {
    if (openFacet !== "existencia") return null;

    const activeQuantityFilter = facetFilters.existencia.find((value) =>
      value.startsWith(QUANTITY_FILTER_PREFIX)
    );

    return (
      <div
        className={`${styles.filterPopover} ${styles.existencePopover}`}
        data-inv-filter-popover="existencia"
      >
        <div className={styles.existenceSection}>
          <span className={styles.existenceSectionTitle}>
            Buscar cantidad exacta
          </span>

          <div className={styles.quantityFilterRow}>
            <input
              type="text"
              inputMode="numeric"
              className={styles.quantityFilterInput}
              placeholder="Ej. 7"
              value={existenceQuantity}
              onChange={handleExistenceQuantityChange}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyExistenceQuantityFilter();
                }
              }}
            />

            <button
              type="button"
              className={styles.quantityApplyButton}
              onClick={applyExistenceQuantityFilter}
              disabled={!existenceQuantity.trim()}
            >
              Aplicar
            </button>
          </div>

          {activeQuantityFilter && (
            <div className={styles.activeQuantityFilter}>
              <span>
                Cantidad:{" "}
                <strong>
                  {activeQuantityFilter.replace(
                    QUANTITY_FILTER_PREFIX,
                    ""
                  )}
                </strong>
              </span>

              <button
                type="button"
                className={styles.removeQuantityButton}
                onClick={removeExistenceQuantityFilter}
                aria-label="Eliminar filtro de cantidad"
              >
                ×
              </button>
            </div>
          )}
        </div>

        <div className={styles.existenceDivider} />

        <div className={styles.existenceSection}>
          <span className={styles.existenceSectionTitle}>
            Estado del inventario
          </span>

          <div className={styles.stockStatusOptions}>
            {STOCK_FILTER_OPTIONS.map((option) => {
              const checked = facetFilters.existencia.includes(option.value);

              return (
                <label
                  key={option.value}
                  className={`${styles.stockStatusOption} ${
                    checked ? styles.stockStatusOptionActive : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      toggleFacetValue("existencia", option.value, {
                        close: false,
                      })
                    }
                  />

                  <span
                    className={`${styles.stockStatusDot} ${
                      styles[`${option.statusType}Dot`]
                    }`}
                  />

                  <span className={styles.stockStatusLabel}>
                    {option.label}
                  </span>

                  <span className={styles.stockStatusCount}>
                    {stockStatusCounts[option.statusType] || 0}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div className={styles.existenceFooter}>
          <button
            type="button"
            className={styles.filterMiniButton}
            onClick={() =>
              clearFacet("existencia", {
                close: true,
              })
            }
          >
            Limpiar
          </button>

          <button
            type="button"
            className={styles.existenceDoneButton}
            onClick={() => setOpenFacet(null)}
          >
            Listo
          </button>
        </div>
      </div>
    );
  };

  const renderFacetPopover = (key) => {
    if (key === "existencia") {
      return renderExistencePopover();
    }

    if (openFacet !== key) return null;

    const visibleOptions = getVisibleFacetOptions(key);

    const allValues = (facetOptions[key] || []).map((item) => item.value);

    return (
      <div
        className={styles.filterPopover}
        data-inv-filter-popover={key}
      >
        <div className={styles.filterPopoverHeader}>
          <input
            type="text"
            className={styles.filterSearch}
            placeholder="Buscar..."
            value={facetSearch[key] || ""}
            onChange={(event) =>
              setFacetSearch((previous) => ({
                ...previous,
                [key]: event.target.value,
              }))
            }
          />
        </div>

        <div className={styles.filterPopoverActions}>
          <button
            type="button"
            className={styles.filterMiniButton}
            onClick={() =>
              setFacet(key, allValues, {
                close: true,
              })
            }
          >
            Seleccionar todo
          </button>

          <button
            type="button"
            className={styles.filterMiniButton}
            onClick={() =>
              clearFacet(key, {
                close: true,
              })
            }
          >
            Limpiar
          </button>
        </div>

        <div className={styles.filterList}>
          {visibleOptions.length === 0 ? (
            <div className={styles.filterEmpty}>Sin coincidencias</div>
          ) : (
            visibleOptions.map((item) => {
              const checked = facetFilters[key]?.includes(item.value);

              return (
                <label
                  key={`${key}-${item.value}`}
                  className={styles.filterOption}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleFacetValue(key, item.value)}
                  />

                  <span className={styles.filterOptionLabel}>
                    {item.label}
                  </span>

                  <span className={styles.filterOptionCount}>
                    {item.count}
                  </span>
                </label>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const handleToggleOtherStocks = async (productId) => {
    if (!productId) return;

    if (expandedProductId === productId) {
      setExpandedProductId(null);
      return;
    }

    setExpandedProductId(productId);

    if (
      otherStocksByProduct[productId] ||
      loadingDetailsByProduct[productId]
    ) {
      return;
    }

    setLoadingDetailsByProduct((previous) => ({
      ...previous,
      [productId]: true,
    }));

    setDetailsErrorByProduct((previous) => ({
      ...previous,
      [productId]: "",
    }));

    try {
      const selectCandidates = [
        `
          id,
          branch_id,
          stock,
          min_stock,
          max_stock,
          is_active,
          branches:branch_id(
            id,
            name,
            code
          )
        `,
        `
          id,
          branch_id,
          stock,
          min_stock,
          max_stock,
          is_active,
          branches(
            id,
            name,
            code
          )
        `,
      ];

      let detailRows = [];
      let lastError = null;

      for (const selectClause of selectCandidates) {
        const result = await supabase
          .from("branch_inventory")
          .select(selectClause)
          .eq("product_id", productId)
          .neq("branch_id", selectedBranchId)
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (result.error) {
          lastError = result.error;
          continue;
        }

        detailRows = result.data ?? [];
        lastError = null;
        break;
      }

      if (lastError) throw lastError;

      setOtherStocksByProduct((previous) => ({
        ...previous,
        [productId]: detailRows,
      }));
    } catch (detailsError) {
      console.error("Error cargando otras sucursales:", detailsError);

      setOtherStocksByProduct((previous) => ({
        ...previous,
        [productId]: [],
      }));

      setDetailsErrorByProduct((previous) => ({
        ...previous,
        [productId]: "No se pudo cargar stock de otras sucursales.",
      }));
    } finally {
      setLoadingDetailsByProduct((previous) => ({
        ...previous,
        [productId]: false,
      }));
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.headingBlock}>
            <h1 className={styles.title}>Reporte de inventario</h1>

            <p className={styles.subtitle}>
              Consulta existencias, niveles mínimos y máximos por sucursal.
            </p>
          </div>

          <div className={styles.controls}>
            <div className={styles.controlField}>
              <label className={styles.label}>Sucursal</label>

              <select
                className={styles.select}
                value={selectedBranchId}
                onChange={(event) => {
                  setExpandedProductId(null);
                  setSelectedBranchId(event.target.value);
                }}
              >
                {branchOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code
                      ? `${item.name} (${item.code})`
                      : item.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className={styles.exportButton}
              onClick={handleExportInventory}
              disabled={loading || filteredRows.length === 0}
              title={
                loading
                  ? "Espera a que termine de cargar el inventario"
                  : filteredRows.length === 0
                    ? "No hay resultados para exportar"
                    : "Exportar los resultados mostrados"
              }
            >
              Exportar inventario
            </button>
          </div>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.filterSummary}>
            <span
              className={`${styles.filterStatusBadge} ${
                activeFilterCount > 0
                  ? styles.filterStatusBadgeActive
                  : ""
              }`}
            >
              {activeFilterCount === 0
                ? "Sin filtros activos"
                : `${activeFilterCount} ${
                    activeFilterCount === 1
                      ? "filtro activo"
                      : "filtros activos"
                  }`}
            </span>

            <button
              type="button"
              className={styles.clearFiltersButton}
              onClick={clearAllFilters}
              disabled={activeFilterCount === 0}
            >
              Limpiar filtros
            </button>
          </div>

          <div className={styles.stockSummary}>
            <span className={styles.summaryItem}>
              <span className={styles.summaryDotOut} />
              Agotados: {stockSummary.outOfStock}
            </span>

            <span className={styles.summaryItem}>
              <span className={styles.summaryDotLow} />
              Stock bajo: {stockSummary.lowStock}
            </span>
          </div>
        </div>

        <div className={styles.meta}>
          <span>
            Sucursal seleccionada:{" "}
            <strong>{selectedBranchLabel}</strong>
          </span>

          <span className={styles.metaDivider}>·</span>

          <span>
            Mostrando <strong>{filteredRows.length}</strong> de{" "}
            <strong>{rows.length}</strong> producto(s)
          </span>
        </div>

        {loading && (
          <div className={styles.info}>Cargando inventario...</div>
        )}

        {!!error && <div className={styles.error}>{error}</div>}

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <colgroup>
              <col className={styles.codeColumn} />
              <col className={styles.nameColumn} />
              <col className={styles.departmentColumn} />
              <col className={styles.existenceColumn} />
              <col className={styles.minimumColumn} />
              <col className={styles.maximumColumn} />
              <col className={styles.detailColumn} />
            </colgroup>

            <thead>
              <tr>
                <th>Código</th>

                <th>
                  <div className={styles.thInner}>
                    <span className={styles.thLabel}>Nombre</span>
                    {renderFacetButton("nombre")}
                    {renderFacetPopover("nombre")}
                  </div>
                </th>

                <th>
                  <div className={styles.thInner}>
                    <span className={styles.thLabel}>Departamento</span>
                    {renderFacetButton("depto")}
                    {renderFacetPopover("depto")}
                  </div>
                </th>

                <th>
                  <div className={styles.thInner}>
                    <span className={styles.thLabel}>Existencia</span>
                    {renderFacetButton("existencia")}
                    {renderFacetPopover("existencia")}
                  </div>
                </th>

                <th>Mín</th>
                <th>Máx</th>
                <th>Detalle</th>
              </tr>
            </thead>

            <tbody>
              {!loading && filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.empty}>
                    No hay productos que coincidan con los filtros
                    seleccionados.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const isExpanded =
                    expandedProductId === row.productId;

                  const detailRows =
                    otherStocksByProduct[row.productId] || [];

                  const detailsLoading =
                    !!loadingDetailsByProduct[row.productId];

                  const detailsError =
                    detailsErrorByProduct[row.productId];

                  const stockStatus = getStockStatus(row);

                  const rowClassName =
                    stockStatus.type === "outOfStock"
                      ? styles.outOfStockRow
                      : stockStatus.type === "lowStock"
                        ? styles.lowStockRow
                        : stockStatus.type === "notApplicable"
                          ? styles.notApplicableRow
                          : "";

                  return (
                    <React.Fragment
                      key={row.inventoryRowId ?? row.productId}
                    >
                      <tr className={rowClassName}>
                        <td className={styles.codeCell}>
                          {row.codigo || "—"}
                        </td>

                        <td className={styles.nameCell}>
                          {toUpperSafe(row.nombre)}
                        </td>

                        <td>{toUpperSafe(row.depto)}</td>

                        <td>
                          <div
                            className={`${styles.stockCell} ${
                              styles[stockStatus.type]
                            }`}
                          >
                            <span className={styles.stockValue}>
                              {row.existencia === null ||
                              row.existencia === undefined
                                ? "—"
                                : row.existencia}
                            </span>

                            <span className={styles.stockBadge}>
                              {stockStatus.label}
                            </span>
                          </div>
                        </td>

                        <td>
                          {row.min === null || row.min === undefined
                            ? "—"
                            : row.min}
                        </td>

                        <td>
                          {row.max === null || row.max === undefined
                            ? "—"
                            : row.max}
                        </td>

                        <td>
                          {row.tracksInventory === false ? (
                            <span className={styles.notApplicableText}>
                              No aplica
                            </span>
                          ) : (
                            <button
                              type="button"
                              className={styles.linkButton}
                              onClick={() =>
                                handleToggleOtherStocks(row.productId)
                              }
                              title={
                                isExpanded
                                  ? "Ocultar existencias de otras sucursales"
                                  : "Consultar existencias de este producto en otras sucursales"
                              }
                              aria-expanded={isExpanded}
                            >
                              {isExpanded
                                ? "Ocultar otras sucursales"
                                : "Ver otras sucursales"}
                            </button>
                          )}
                        </td>
                      </tr>

                      {isExpanded &&
                        row.tracksInventory !== false && (
                          <tr>
                            <td
                              colSpan={7}
                              className={styles.detailCell}
                            >
                              {detailsLoading && (
                                <div className={styles.info}>
                                  Cargando otras sucursales...
                                </div>
                              )}

                              {!detailsLoading && !!detailsError && (
                                <div className={styles.error}>
                                  {detailsError}
                                </div>
                              )}

                              {!detailsLoading &&
                                !detailsError &&
                                detailRows.length === 0 && (
                                  <div className={styles.info}>
                                    No hay stock de este producto en otras
                                    sucursales.
                                  </div>
                                )}

                              {!detailsLoading &&
                                !detailsError &&
                                detailRows.length > 0 && (
                                  <table className={styles.nestedTable}>
                                    <thead>
                                      <tr>
                                        <th>Sucursal</th>
                                        <th>Existencia</th>
                                        <th>Mín</th>
                                        <th>Máx</th>
                                        <th>Estatus</th>
                                      </tr>
                                    </thead>

                                    <tbody>
                                      {detailRows.map((detail) => (
                                        <tr key={detail.id}>
                                          <td>
                                            {detail?.branches?.code
                                              ? `${detail.branches.name} (${detail.branches.code})`
                                              : detail?.branches?.name ||
                                                detail?.branch_id}
                                          </td>

                                          <td>
                                            {Number(detail?.stock ?? 0) || 0}
                                          </td>

                                          <td>
                                            {Number(
                                              detail?.min_stock ?? 0
                                            ) || 0}
                                          </td>

                                          <td>
                                            {Number(
                                              detail?.max_stock ?? 0
                                            ) || 0}
                                          </td>

                                          <td>
                                            {detail?.is_active
                                              ? "Activo"
                                              : "Inactivo"}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                            </td>
                          </tr>
                        )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PageReport;