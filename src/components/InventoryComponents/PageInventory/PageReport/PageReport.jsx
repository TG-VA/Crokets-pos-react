import React, { useEffect, useMemo, useState } from "react";
import ExcelJS from "exceljs";
import { supabase } from "../../../../lib/supabaseClient";
import { useBranch } from "../../../../contexts/BranchContext";
import styles from "./PageReport.module.css";

const POLI_BRANCH_ID = "412f367f-7c86-45ca-9e91-b8fe6274b232";
const REFRESH_INTERVAL_MS = 2000;

const formatDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d);
};

const toUpperSafe = (value, fallback = "—") => {
  const normalized = (value ?? "").toString().trim();
  return (normalized || fallback).toUpperCase();
};

const formatInventoryValue = (value) =>
  value === null || value === undefined ? "—" : String(value);

const formatDateForFilename = (value = new Date()) => {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "00-00-00";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
};

const normalizeFilenameSegment = (value, fallback = "POLIGONO") => {
  const normalized = (value ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[^\w\s-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
  return normalized || fallback;
};

const sortInventoryRows = (list) =>
  [...(Array.isArray(list) ? list : [])].sort((a, b) => {
    const aTracks = a?.tracksInventory !== false;
    const bTracks = b?.tracksInventory !== false;
    if (aTracks !== bTracks) return aTracks ? -1 : 1;
    const byName = (a?.nombre || "").localeCompare(b?.nombre || "", "es", {
      sensitivity: "base",
    });
    if (byName !== 0) return byName;
    const byDept = (a?.depto || "").localeCompare(b?.depto || "", "es", {
      sensitivity: "base",
    });
    if (byDept !== 0) return byDept;
    return (a?.codigo || "").localeCompare(b?.codigo || "", "es", {
      sensitivity: "base",
    });
  });

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
  const [facetFilters, setFacetFilters] = useState({
    nombre: [],
    depto: [],
    existencia: [],
  });
  const [openFacet, setOpenFacet] = useState(null);
  const [facetSearch, setFacetSearch] = useState({});

  useEffect(() => {
    if (!openFacet) return;
    const key = openFacet;
    const onDown = (e) => {
      const pop = e.target?.closest?.(`[data-inv-filter-popover="${key}"]`);
      const btn = e.target?.closest?.(`[data-inv-filter-button="${key}"]`);
      if (pop || btn) return;
      setOpenFacet(null);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpenFacet(null);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [openFacet]);

  const setFacet = (key, values, { close = false } = {}) => {
    setFacetFilters((prev) => ({ ...prev, [key]: values }));
    if (close) setOpenFacet(null);
  };

  const toggleFacetValue = (key, value) => {
    setFacetFilters((prev) => {
      const current = Array.isArray(prev[key]) ? prev[key] : [];
      const exists = current.includes(value);
      return {
        ...prev,
        [key]: exists ? current.filter((x) => x !== value) : [...current, value],
      };
    });
    setOpenFacet(null);
  };

  const clearFacet = (key, options) => setFacet(key, [], options);

  const toggleFacet = (key) => {
    setOpenFacet((prev) => {
      const next = prev === key ? null : key;
      if (next) {
        setFacetSearch((s) => ({ ...s, [key]: s?.[key] ?? "" }));
      }
      return next;
    });
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
        const list = Array.isArray(data) ? data : [];
        const hasPoli = list.some((b) => b?.id === POLI_BRANCH_ID);
        setBranchOptions(
          hasPoli
            ? list
            : [
                ...list,
                { id: POLI_BRANCH_ID, name: "POLÍGONO", code: "" },
              ]
        );
      } catch (e) {
        const fallback = branch?.id
          ? [
              { id: POLI_BRANCH_ID, name: "POLÍGONO", code: "" },
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

    const loadInventoryByBranch = async ({ silent = false } = {}) => {
      if (!selectedBranchId) {
        setRows([]);
        setError("");
        return;
      }

      if (!silent) setLoading(true);
      setError("");

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

        let dataRows = [];
        let lastErr = null;

        for (const selectClause of selectCandidates) {
          const activeRes = await supabase
            .from("branch_inventory")
            .select(selectClause)
            .eq("branch_id", selectedBranchId)
            .eq("is_active", true)
            .order("created_at", { ascending: false });

          if (activeRes.error) {
            lastErr = activeRes.error;
            continue;
          }

          dataRows = activeRes.data ?? [];

          if (dataRows.length === 0) {
            const allRes = await supabase
              .from("branch_inventory")
              .select(selectClause)
              .eq("branch_id", selectedBranchId)
              .order("created_at", { ascending: false });

            if (allRes.error) {
              lastErr = allRes.error;
              continue;
            }
            dataRows = allRes.data ?? [];
          }

          lastErr = null;
          break;
        }

        if (lastErr) throw lastErr;

        const mappedInventory = dataRows.map((item) => {
          const p = item?.products ?? {};
          return {
            inventoryRowId: item?.id ?? null,
            productId: item?.product_id ?? null,
            codigo: (p?.barcode ?? "").toString(),
            nombre: (p?.name ?? "").toString(),
            depto: (p?.departments?.name ?? "").toString(),
            existencia: Number(item?.stock ?? 0) || 0,
            min: Number(item?.min_stock ?? 0) || 0,
            max: Number(item?.max_stock ?? 0) || 0,
            tracksInventory: !!p?.tracks_inventory,
            noStockProduct: false,
          };
        });

        const inventoryProductIds = new Set(
          mappedInventory.map((item) => item.productId).filter(Boolean)
        );

        const { data: noStockProducts, error: noStockError } = await supabase
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

        if (noStockError) throw noStockError;

        const mappedNoStock = (noStockProducts || [])
          .filter((item) => !inventoryProductIds.has(item.id))
          .map((item) => ({
            inventoryRowId: null,
            productId: item.id,
            codigo: (item?.barcode ?? "").toString(),
            nombre: (item?.name ?? "").toString(),
            depto: (item?.departments?.name ?? "").toString(),
            existencia: null,
            min: null,
            max: null,
            tracksInventory: false,
            noStockProduct: true,
          }));

        setRows(sortInventoryRows([...mappedInventory, ...mappedNoStock]));
      } catch (e) {
        setRows([]);
        setError("No se pudo cargar el reporte de inventario.");
      } finally {
        if (!silent) setLoading(false);
      }
    };

    loadInventoryByBranch();
    pollingId = window.setInterval(() => {
      loadInventoryByBranch({ silent: true });
    }, REFRESH_INTERVAL_MS);

    return () => {
      if (pollingId) window.clearInterval(pollingId);
    };
  }, [selectedBranchId]);

  const selectedBranchLabel = useMemo(() => {
    const current = branchOptions.find((b) => b.id === selectedBranchId);
    if (!current) return selectedBranchId || "—";
    if (current.code) return `${current.name} (${current.code})`;
    return current.name;
  }, [branchOptions, selectedBranchId]);

  const filteredRows = useMemo(() => {
    return sortInventoryRows(rows.filter((row) => {
      if (facetFilters.nombre.length > 0 && !facetFilters.nombre.includes(row.nombre || "")) {
        return false;
      }
      if (facetFilters.depto.length > 0 && !facetFilters.depto.includes(row.depto || "—")) {
        return false;
      }
      const existenciaValue =
        row.existencia === null || row.existencia === undefined
          ? "—"
          : String(Number(row.existencia ?? 0));
      if (facetFilters.existencia.length > 0 && !facetFilters.existencia.includes(existenciaValue)) {
        return false;
      }
      return true;
    }));
  }, [rows, facetFilters]);

  const handleExportInventory = async () => {
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
    titleCell.font = { bold: true, size: 18, name: "Arial" };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getRow(1).height = 28;

    const appliedNombre =
      facetFilters.nombre.length > 0
        ? facetFilters.nombre.map((value) => toUpperSafe(value)).join(", ")
        : "TODOS";
    const appliedDepto =
      facetFilters.depto.length > 0
        ? facetFilters.depto.map((value) => toUpperSafe(value)).join(", ")
        : "TODOS";
    const appliedExistencia =
      facetFilters.existencia.length > 0 ? facetFilters.existencia.join(", ") : "TODAS";

    const infoRows = [
      ["SUCURSAL", selectedBranchLabel],
      ["PRODUCTOS EXPORTADOS", String(filteredRows.length)],
      ["FILTRO NOMBRE", appliedNombre],
      ["FILTRO DEPARTAMENTO", appliedDepto],
      ["FILTRO EXISTENCIA", appliedExistencia],
      ["EXPORTADO", formatDateTime(new Date().toISOString())],
    ];

    const thinBorder = {
      top: { style: "thin", color: { argb: "FF000000" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "thin", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } },
    };

    infoRows.forEach(([label, value], index) => {
      const rowNumber = index + 2;
      const labelCell = worksheet.getCell(`A${rowNumber}`);
      const valueCell = worksheet.getCell(`B${rowNumber}`);
      labelCell.value = label;
      valueCell.value = value;
      labelCell.font = { bold: true, name: "Arial" };
      valueCell.font = { name: "Arial" };
      labelCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF3F3F3" },
      };
      valueCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF9F9F9" },
      };
      labelCell.border = thinBorder;
      valueCell.border = thinBorder;
      labelCell.alignment = { vertical: "middle" };
      valueCell.alignment = { vertical: "middle" };
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
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, name: "Arial" };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFC8913" },
      };
      cell.border = thinBorder;
      cell.alignment = { horizontal: "center", vertical: "middle" };
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

      for (let colNumber = 1; colNumber <= 6; colNumber += 1) {
        const cell = excelRow.getCell(colNumber);
        cell.font = { name: "Arial" };
        cell.border = thinBorder;
        cell.alignment =
          colNumber >= 4
            ? { horizontal: "center", vertical: "middle" }
            : { vertical: "middle" };
        if (index % 2 === 0) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFDF1E6" },
          };
        }
      }
    });

    worksheet.autoFilter = {
      from: { row: headerRowNumber, column: 1 },
      to: { row: headerRowNumber, column: 6 },
    };

    const branchNameForFile = normalizeFilenameSegment(selectedBranchLabel, "POLIGONO");
    const filename = `INVENTARIO ${branchNameForFile} ${formatDateForFilename()}.xlsx`;
    const out = await workbook.xlsx.writeBuffer();
    const blob = new Blob([out], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const facetOptions = useMemo(() => {
    const counts = {
      nombre: new Map(),
      depto: new Map(),
      existencia: new Map(),
    };

    rows.forEach((row) => {
      const nombre = (row.nombre || "").toString().trim() || "—";
      const depto = (row.depto || "").toString().trim() || "—";
      const existencia =
        row.existencia === null || row.existencia === undefined
          ? "—"
          : String(Number(row.existencia ?? 0));

      counts.nombre.set(nombre, (counts.nombre.get(nombre) || 0) + 1);
      counts.depto.set(depto, (counts.depto.get(depto) || 0) + 1);
      counts.existencia.set(existencia, (counts.existencia.get(existencia) || 0) + 1);
    });

    return {
      nombre: [...counts.nombre.entries()]
        .sort((a, b) => a[0].localeCompare(b[0], "es"))
        .map(([value, count]) => ({ value, label: value.toUpperCase(), count })),
      depto: [...counts.depto.entries()]
        .sort((a, b) => a[0].localeCompare(b[0], "es"))
        .map(([value, count]) => ({ value, label: value.toUpperCase(), count })),
      existencia: [...counts.existencia.entries()]
        .sort((a, b) => {
          if (a[0] === "—") return 1;
          if (b[0] === "—") return -1;
          return Number(a[0]) - Number(b[0]);
        })
        .map(([value, count]) => ({ value, label: value, count })),
    };
  }, [rows]);

  const getVisibleFacetOptions = (key) => {
    const search = (facetSearch[key] || "").trim().toUpperCase();
    const list = facetOptions[key] || [];
    if (!search) return list;
    return list.filter((item) => item.label.toUpperCase().includes(search));
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
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M3 5h18l-7 8v5l-4 1v-6L3 5z" />
        </svg>
        {selectedCount > 0 && <span className={styles.filterBadge}>{selectedCount}</span>}
      </button>
    );
  };

  const renderFacetPopover = (key) => {
    if (openFacet !== key) return null;
    const visibleOptions = getVisibleFacetOptions(key);
    const allValues = (facetOptions[key] || []).map((item) => item.value);

    return (
      <div className={styles.filterPopover} data-inv-filter-popover={key}>
        <div className={styles.filterPopoverHeader}>
          <input
            type="text"
            className={styles.filterSearch}
            placeholder="Buscar..."
            value={facetSearch[key] || ""}
            onChange={(e) =>
              setFacetSearch((prev) => ({ ...prev, [key]: e.target.value }))
            }
          />
        </div>
        <div className={styles.filterPopoverActions}>
          <button
            type="button"
            className={styles.filterMiniButton}
            onClick={() => setFacet(key, allValues, { close: true })}
          >
            Seleccionar todo
          </button>
          <button
            type="button"
            className={styles.filterMiniButton}
            onClick={() => clearFacet(key, { close: true })}
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
                <label key={`${key}-${item.value}`} className={styles.filterOption}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleFacetValue(key, item.value)}
                  />
                  <span className={styles.filterOptionLabel}>{item.label}</span>
                  <span className={styles.filterOptionCount}>{item.count}</span>
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
    if (otherStocksByProduct[productId] || loadingDetailsByProduct[productId]) return;

    setLoadingDetailsByProduct((prev) => ({ ...prev, [productId]: true }));
    setDetailsErrorByProduct((prev) => ({ ...prev, [productId]: "" }));

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

      let dataRows = [];
      let lastErr = null;

      for (const selectClause of selectCandidates) {
        const res = await supabase
          .from("branch_inventory")
          .select(selectClause)
          .eq("product_id", productId)
          .neq("branch_id", selectedBranchId)
          .order("created_at", { ascending: false });

        if (res.error) {
          lastErr = res.error;
          continue;
        }

        dataRows = res.data ?? [];
        lastErr = null;
        break;
      }

      if (lastErr) throw lastErr;

      setOtherStocksByProduct((prev) => ({ ...prev, [productId]: dataRows }));
    } catch (e) {
      setOtherStocksByProduct((prev) => ({ ...prev, [productId]: [] }));
      setDetailsErrorByProduct((prev) => ({
        ...prev,
        [productId]: "No se pudo cargar stock de otras sucursales.",
      }));
    } finally {
      setLoadingDetailsByProduct((prev) => ({ ...prev, [productId]: false }));
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>Reporte de inventario</h1>
          <div className={styles.controls}>
            <div className={styles.controlField}>
              <label className={styles.label}>Sucursal</label>
              <select
                className={styles.select}
                value={selectedBranchId}
                onChange={(e) => {
                  setExpandedProductId(null);
                  setSelectedBranchId(e.target.value);
                }}
              >
                {branchOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code ? `${b.name} (${b.code})` : b.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className={styles.exportButton}
              onClick={handleExportInventory}
            >
              Exportar inventario
            </button>
          </div>
        </div>

        <div className={styles.meta}>
          Sucursal seleccionada: {selectedBranchLabel} · {filteredRows.length} producto(s)
        </div>

        {loading && <div className={styles.info}>Cargando inventario...</div>}
        {!!error && <div className={styles.error}>{error}</div>}

        <div className={styles.tableWrap}>
          <table className={styles.table}>
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
                    <span className={styles.thLabel}>Depto</span>
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
                    No hay productos que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const isExpanded = expandedProductId === row.productId;
                  const detailRows = otherStocksByProduct[row.productId] || [];
                  const detailsLoading = !!loadingDetailsByProduct[row.productId];
                  const detailsError = detailsErrorByProduct[row.productId];

                  return (
                    <React.Fragment key={row.inventoryRowId ?? row.productId}>
                      <tr>
                        <td>{row.codigo}</td>
                        <td>{toUpperSafe(row.nombre)}</td>
                        <td>{toUpperSafe(row.depto)}</td>
                        <td>{row.existencia === null || row.existencia === undefined ? "—" : row.existencia}</td>
                        <td>{row.min === null || row.min === undefined ? "—" : row.min}</td>
                        <td>{row.max === null || row.max === undefined ? "—" : row.max}</td>
                        <td>
                          <button
                            type="button"
                            className={styles.linkButton}
                            onClick={() => handleToggleOtherStocks(row.productId)}
                          >
                            {isExpanded ? "Ocultar otras sucursales" : "Ver otras sucursales"}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className={styles.detailCell}>
                            {detailsLoading && (
                              <div className={styles.info}>Cargando otras sucursales...</div>
                            )}
                            {!detailsLoading && !!detailsError && (
                              <div className={styles.error}>{detailsError}</div>
                            )}
                            {!detailsLoading && !detailsError && detailRows.length === 0 && (
                              <div className={styles.info}>
                                No hay stock de este producto en otras sucursales.
                              </div>
                            )}
                            {!detailsLoading && !detailsError && detailRows.length > 0 && (
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
                                  {detailRows.map((d) => (
                                    <tr key={d.id}>
                                      <td>
                                        {d?.branches?.code
                                          ? `${d.branches.name} (${d.branches.code})`
                                          : d?.branches?.name || d?.branch_id}
                                      </td>
                                      <td>{Number(d?.stock ?? 0) || 0}</td>
                                      <td>{Number(d?.min_stock ?? 0) || 0}</td>
                                      <td>{Number(d?.max_stock ?? 0) || 0}</td>
                                      <td>{d?.is_active ? "Activo" : "Inactivo"}</td>
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
