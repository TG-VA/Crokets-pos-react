import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ExcelJS from "exceljs";
import { useProducts } from "../../../../contexts/ProductsContext";
import { useBranch } from "../../../../contexts/BranchContext";
import { supabase } from "../../../../lib/supabaseClient";
import InventorySearchModal from "../../Modals/InventorySearchModal/InventorySearchModal";
import styles from "./PageKardex.module.css";

const POLI_BRANCH_ID = "412f367f-7c86-45ca-9e91-b8fe6274b232";

const MOVEMENTS_TABLE_CACHE_KEY = "kardexInventoryMovementsTable_v1";

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

const formatCurrency = (value) => {
  return `$${Number(value || 0).toFixed(2)}`;
};

const buildIsoRange = (from, to) => {
  const range = {};

  if (from) {
    const start = new Date(`${from}T00:00:00`);
    if (!Number.isNaN(start.getTime())) range.fromIso = start.toISOString();
  }

  if (to) {
    const end = new Date(`${to}T23:59:59.999`);
    if (!Number.isNaN(end.getTime())) range.toIso = end.toISOString();
  }

  return range;
};

const computeRowsWithRunningStock = (
  movements,
  finalStock,
  { tracksInventory = true } = {}
) => {
  if (!movements?.length) return [];

  const rows = [...movements].reverse();
  let running = Number(finalStock || 0);

  return rows.map((row) => {
    const qty = Number(row.quantity ?? 0);
    const type = (row.movement_type ?? "").toLowerCase();

    let entryQty = 0;
    let exitQty = 0;

    if (type === "sale" || type === "canceled") {
      exitQty = Math.abs(qty);
    } else if (type === "return") {
      entryQty = Math.abs(qty);
    } else if (
      type === "inventory_add" ||
      type === "adjustment" ||
      type === "purchase" ||
      type === "transfer_in"
    ) {
      entryQty = Math.abs(qty);
    } else if (type === "inventory_activate") {
      entryQty = Math.abs(qty);
    }

    if (tracksInventory) {
      running = running - entryQty + exitQty;
    }

    return {
      ...row,
      entryQty,
      exitQty,
      runningStock: tracksInventory ? running : null,
    };
  });
};

const getMovementDescription = (row) => {
  const type = (row.movement_type ?? "").toLowerCase();
  const reason = (row.reason ?? "").toString();
  const saleId = row.sale_id;

  switch (type) {
    case "sale":
      return saleId
        ? `VENTA ${saleId.slice(0, 8).toUpperCase()}${reason ? ` — ${reason}` : ""}`
        : "VENTA";
    case "return":
      return `DEVOLUCIÓN${reason ? ` — ${reason}` : ""}`;
    case "canceled":
      return `CANCELACIÓN${reason ? ` — ${reason}` : ""}`;
    case "inventory_add":
      return `ALTA A INVENTARIO${reason ? ` — ${reason}` : ""}`;
    case "adjustment":
      return `AJUSTE${reason ? ` — ${reason}` : ""}`;
    case "purchase":
      return `COMPRA${reason ? ` — ${reason}` : ""}`;
    case "transfer_in":
      return `TRASPASO ENTRADA${reason ? ` — ${reason}` : ""}`;
    case "transfer_out":
      return `TRASPASO SALIDA${reason ? ` — ${reason}` : ""}`;
    case "inventory_activate":
      return `ACTIVACIÓN DE INVENTARIO${reason ? ` — ${reason}` : ""}`;
    case "inventory_deactivate":
      return `DESACTIVACIÓN DE INVENTARIO${reason ? ` — ${reason}` : ""}`;
    case "product_create":
      return `ALTA DE PRODUCTO${reason ? ` — ${reason}` : ""}`;
    case "product_update":
      return `MODIFICACIÓN DE PRODUCTO${reason ? ` — ${reason}` : ""}`;
    case "product_delete":
      return `ELIMINACIÓN DE PRODUCTO${reason ? ` — ${reason}` : ""}`;
    default:
      return reason || type.toUpperCase() || "—";
  }
};

const PageKardex = () => {
  const { products } = useProducts();
  const { branch } = useBranch();

  const [selectedProducts, setSelectedProducts] = useState([null, null]);
  const [modalTargetSlot, setModalTargetSlot] = useState(0);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [movementsState, setMovementsState] = useState([
    { movements: [], loading: false, error: "" },
    { movements: [], loading: false, error: "" },
  ]);

  const barcodeInputRef = useRef(null);
  const pollingIdsRef = useRef([null, null]);
  const inFlightRef = useRef([false, false]);

  // Efecto para F10
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "F10") {
        e.preventDefault();
        const nextSlot = selectedProducts[0] ? (selectedProducts[1] ? 1 : 1) : 0;
        setModalTargetSlot(nextSlot);
        setSearchModalOpen(true);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selectedProducts]);

  // Detectar tabla de movimientos
  const detectMovementsTable = async () => {
    const cached = localStorage.getItem(MOVEMENTS_TABLE_CACHE_KEY);
    if (cached) return cached;

    const candidates = [
      import.meta.env.VITE_INVENTORY_MOVEMENTS_TABLE,
      "inventory_movements",
      "inventory_movement",
      "stock_movements",
      "inventory_movements_log",
    ].filter(Boolean);

    for (const table of candidates) {
      try {
        const { error } = await supabase.from(table).select("id", { head: true }).limit(1);
        if (!error) {
          localStorage.setItem(MOVEMENTS_TABLE_CACHE_KEY, table);
          return table;
        }
      } catch (_err) {}
    }
    return null;
  };

  // Cargar movimientos del producto seleccionado
  const loadMovements = useCallback(
    async (slot, productId, { from, to, silent } = {}) => {
      if (!productId) return;
      if (inFlightRef.current[slot]) return;
      inFlightRef.current[slot] = true;

      if (!silent) {
        setMovementsState((prev) => {
          const next = [...prev];
          next[slot] = { movements: [], loading: true, error: "" };
          return next;
        });
      }

      try {
        const table = await detectMovementsTable();
        if (!table) {
          if (!silent) {
            setMovementsState((prev) => {
              const next = [...prev];
              next[slot] = {
                movements: [],
                loading: false,
                error: "No se encontró tabla de movimientos en la BD.",
              };
              return next;
            });
          }
          return;
        }

        const branchId = branch?.id || POLI_BRANCH_ID;

        let query = supabase
          .from(table)
          .select("*")
          .eq("product_id", productId)
          .eq("branch_id", branchId);

        const { fromIso, toIso } = buildIsoRange(from, to);
        if (fromIso) query = query.gte("created_at", fromIso);
        if (toIso) query = query.lte("created_at", toIso);

        const { data, error } = await query.order("created_at", {
          ascending: true,
        });

        if (error) throw error;

        setMovementsState((prev) => {
          const next = [...prev];
          const prevRow = next[slot] || { movements: [], loading: false, error: "" };
          next[slot] = { ...prevRow, movements: data || [], loading: false, error: "" };
          return next;
        });
      } catch (err) {
        console.error("Error cargando movimientos:", err);
        if (!silent) {
          setMovementsState((prev) => {
            const next = [...prev];
            const prevRow = next[slot] || { movements: [], loading: false, error: "" };
            next[slot] = {
              ...prevRow,
              movements: [],
              loading: false,
              error: "Error al cargar movimientos del kardex.",
            };
            return next;
          });
        }
      } finally {
        if (silent) {
          setMovementsState((prev) => {
            const next = [...prev];
            if (next[slot]) next[slot] = { ...next[slot], loading: false };
            return next;
          });
        }
        inFlightRef.current[slot] = false;
      }
    },
    [branch?.id]
  );

  // Al seleccionar producto del modal
  const handleSelectProduct = (product) => {
    const slot = modalTargetSlot === 1 ? 1 : 0;
    setSelectedProducts((prev) => {
      const next = [...prev];
      next[slot] = product;
      return next;
    });
    setBarcode("");
    loadMovements(slot, product.id || product.product_id, {
      from: dateFrom,
      to: dateTo,
    });
  };

  useEffect(() => {
    const clearSlot = (slot) => {
      const id = pollingIdsRef.current[slot];
      if (id) {
        window.clearInterval(id);
        pollingIdsRef.current[slot] = null;
      }
    };

    for (let slot = 0; slot < 2; slot += 1) {
      clearSlot(slot);
      const product = selectedProducts[slot];
      if (!product) continue;

      const productId = product.id || product.product_id;
      loadMovements(slot, productId, { from: dateFrom, to: dateTo });
      pollingIdsRef.current[slot] = window.setInterval(() => {
        loadMovements(slot, productId, { from: dateFrom, to: dateTo, silent: true });
      }, 2000);
    }

    return () => {
      clearSlot(0);
      clearSlot(1);
    };
  }, [selectedProducts, dateFrom, dateTo, loadMovements]);

  // Búsqueda por código de barras
  const handleBarcodeSearch = () => {
    const clean = (barcode || "").trim();
    if (!clean) return;
    const found = products.find(
      (p) => (p.codigo || "").trim() === clean
    );
    if (found) {
      const nextSlot = selectedProducts[0] ? (selectedProducts[1] ? 0 : 1) : 0;
      setModalTargetSlot(nextSlot);
      setSelectedProducts((prev) => {
        const next = [...prev];
        next[nextSlot] = found;
        return next;
      });
      loadMovements(nextSlot, found.id || found.product_id, { from: dateFrom, to: dateTo });
    } else {
      const nextSlot = selectedProducts[0] ? (selectedProducts[1] ? 1 : 1) : 0;
      setModalTargetSlot(nextSlot);
      setSearchModalOpen(true);
    }
  };

  const rowsBySlot = useMemo(() => {
    return [0, 1].map((slot) => {
      const product = selectedProducts[slot];
      const finalStock = Number(product?.existencia ?? 0);
      return computeRowsWithRunningStock(movementsState[slot]?.movements, finalStock, {
        tracksInventory: !!product?.tracks_inventory,
      });
    });
  }, [movementsState, selectedProducts]);

  const handleApplyDateFilter = () => {
    for (let slot = 0; slot < 2; slot += 1) {
      const product = selectedProducts[slot];
      if (!product) continue;
      loadMovements(slot, product.id || product.product_id, { from: dateFrom, to: dateTo });
    }
  };

  const handleExport = async (slot) => {
    const product = selectedProducts[slot];
    if (!product) return;

    const currentStockNum = Number(product?.existencia ?? 0);
    const minStock = Number(product?.minimo ?? 0);
    const maxStock = Number(product?.maximo ?? 0);

    const rangeText =
      dateFrom || dateTo ? `${dateFrom || "INICIO"} A ${dateTo || "HOY"}` : "TODAS LAS FECHAS";

    const rowsWithRunningStock = rowsBySlot[slot] || [];

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("KARDEX", {
      views: [{ showGridLines: true }],
    });

    worksheet.columns = [
      { key: "fecha", width: 20 },
      { key: "descripcion", width: 60 },
      { key: "entradas", width: 12 },
      { key: "salidas", width: 12 },
      { key: "existencia", width: 14 },
    ];

    worksheet.mergeCells("A1:E1");
    const titleCell = worksheet.getCell("A1");
    titleCell.value = "KARDEX";
    titleCell.font = { bold: true, size: 18, name: "Arial" };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getRow(1).height = 28;

    const infoRows = [
      ["PRODUCTO", ((product.descripcion ?? "—").toString() || "—").toUpperCase()],
      ["CÓDIGO", ((product.codigo ?? "—").toString() || "—").toUpperCase()],
      ["DEPARTAMENTO", ((product.departamento ?? "—").toString() || "—").toUpperCase()],
      ["EXISTENCIA ACTUAL", currentStockNum],
      ["MÍNIMO", minStock],
      ["MÁXIMO", maxStock],
      ["RANGO", rangeText],
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

    const headerRowNumber = 11;
    const dataStartRow = headerRowNumber + 1;
    const headerLabels = ["FECHA", "DESCRIPCIÓN / MOTIVO", "ENTRADAS", "SALIDAS", "EXISTENCIA"];
    worksheet.getRow(headerRowNumber).values = headerLabels;

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

    rowsWithRunningStock.forEach((row, index) => {
      const excelRow = worksheet.getRow(dataStartRow + index);
      excelRow.values = [
        formatDateTime(row.created_at),
        getMovementDescription(row),
        row.entryQty > 0 ? row.entryQty : null,
        row.exitQty > 0 ? -row.exitQty : null,
        row.runningStock ?? "—",
      ];

      for (let colNumber = 1; colNumber <= 5; colNumber += 1) {
        const cell = excelRow.getCell(colNumber);
        cell.font = { name: "Arial" };
        cell.border = thinBorder;
        cell.alignment =
          colNumber >= 3
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
      to: { row: headerRowNumber, column: 5 },
    };

    worksheet.getColumn(3).numFmt = '+0;-0;';
    worksheet.getColumn(4).numFmt = '0;-0;';
    worksheet.getColumn(5).numFmt = "0";

    const rangeLabel =
      dateFrom || dateTo ? `_${dateFrom || "INICIO"}-${dateTo || "HOY"}` : "";
    const code = (product.codigo || "SIN_CODIGO").toString().replace(/\s+/g, "_");
    const filename = `KARDEX_${code}${rangeLabel}.xlsx`;

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

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Kardex</h1>
        </div>

        {/* Barra de búsqueda */}
        <div className={styles.searchSection}>
          <div className={styles.searchRow}>
            <div className={styles.searchGroup}>
              <label className={styles.searchLabel}>Código de barras</label>
              <input
                ref={barcodeInputRef}
                className={styles.searchInput}
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleBarcodeSearch();
                  }
                }}
                placeholder="Escanea o escribe el código y presiona Enter"
                autoFocus
              />
            </div>
            <div className={styles.dateGroup}>
              <label className={styles.searchLabel}>Desde</label>
              <input
                className={styles.dateInput}
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className={styles.dateGroup}>
              <label className={styles.searchLabel}>Hasta</label>
              <input
                className={styles.dateInput}
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <button
              type="button"
              className={styles.filterButton}
              onClick={handleApplyDateFilter}
              disabled={!selectedProducts[0]}
            >
              Filtrar
            </button>
            <button
              type="button"
              className={styles.searchButton}
              onClick={() => {
                const nextSlot = selectedProducts[0] ? (selectedProducts[1] ? 1 : 1) : 0;
                setModalTargetSlot(nextSlot);
                setSearchModalOpen(true);
              }}
            >
              F10 — Buscar producto
            </button>
          </div>
        </div>

        {/* Info del producto seleccionado */}
        {selectedProducts[0] && (
          <div
            className={`${styles.panelsGrid} ${
              selectedProducts[1] ? styles.twoCols : styles.oneCol
            }`}
          >
            {[0, 1].map((slot) => {
              const product = selectedProducts[slot];
              if (!product) return null;

              const rows = rowsBySlot[slot] || [];
              const loading = !!movementsState[slot]?.loading;
              const error = movementsState[slot]?.error || "";

              const currentStockNum = Number(product?.existencia ?? 0);
              const minStock = Number(product?.minimo ?? 0);
              const maxStock = Number(product?.maximo ?? 0);
              const stockStatus =
                currentStockNum <= minStock
                  ? "AGOTADO"
                  : currentStockNum <= minStock * 1.5
                    ? "POR AGOTARSE"
                    : "DISPONIBLE";

              return (
                <div key={slot} className={styles.panel}>
                  <div className={styles.productCard}>
                    <div className={styles.productMain}>
                      <div className={styles.productName}>
                        {product.descripcion || "—"}
                      </div>
                      <div className={styles.productMeta}>
                        <span className={styles.metaBadge}>
                          CÓDIGO: {product.codigo || "SIN CÓDIGO"}
                        </span>
                        <span className={styles.metaBadge}>
                          DPTO: {product.departamento || "—"}
                        </span>
                      </div>
                    </div>

                    <div className={styles.inventoryStats}>
                      <div className={styles.statBox}>
                        <div className={styles.statLabel}>EXISTENCIA ACTUAL</div>
                        <div className={styles.statValue}>{currentStockNum}</div>
                      </div>
                      <div className={styles.statBox}>
                        <div className={styles.statLabel}>MÍNIMO</div>
                        <div className={styles.statValue}>{minStock}</div>
                      </div>
                      <div className={styles.statBox}>
                        <div className={styles.statLabel}>MÁXIMO</div>
                        <div className={styles.statValue}>{maxStock}</div>
                      </div>
                      <div
                        className={`${styles.statBox} ${
                          styles[`stat${stockStatus.replace(/\s/g, "")}`]
                        }`}
                      >
                        <div className={styles.statLabel}>ESTADO</div>
                        <div className={styles.statValue}>{stockStatus}</div>
                      </div>
                      <div className={styles.statBox}>
                        <div className={styles.statLabel}>PRECIO VENTA</div>
                        <div className={styles.statValue}>
                          {formatCurrency(product.precio)}
                        </div>
                      </div>
                    </div>

                    <div className={styles.productActions}>
                      {slot === 0 && (
                        <button
                          type="button"
                          className={styles.changeButton}
                          onClick={() => {
                            if (selectedProducts[1]) {
                              const confirmed = window.confirm(
                                "Ya hay un segundo producto. ¿Deseas reemplazarlo?"
                              );
                              if (!confirmed) return;
                            }
                            setModalTargetSlot(1);
                            setSearchModalOpen(true);
                          }}
                        >
                          Agregar producto
                        </button>
                      )}
                      <button
                        type="button"
                        className={styles.exportButton}
                        onClick={() => handleExport(slot)}
                        disabled={!product}
                      >
                        Exportar
                      </button>
                    </div>
                  </div>

                  <div className={styles.movementsSection}>
                    <div className={styles.movementsHeader}>
                      <h2 className={styles.movementsTitle}>
                        Movimientos del producto
                      </h2>
                      <span className={styles.movementsCount}>
                        {rows.length} movimiento(s)
                      </span>
                    </div>

                    {loading && (
                      <div className={styles.movementsLoading}>
                        Cargando movimientos...
                      </div>
                    )}

                    {!!error && <div className={styles.movementsError}>{error}</div>}

                    {!loading && !error && rows.length === 0 && (
                      <div className={styles.movementsEmpty}>
                        No hay movimientos registrados para este producto.
                      </div>
                    )}

                    {!loading && rows.length > 0 && (
                      <div className={styles.tableWrap}>
                        <table className={styles.table}>
                          <thead>
                            <tr>
                              <th className={styles.colFecha}>FECHA</th>
                              <th className={styles.colDescripcion}>
                                DESCRIPCIÓN / MOTIVO
                              </th>
                              <th className={styles.colEntradas}>ENTRADAS</th>
                              <th className={styles.colSalidas}>SALIDAS</th>
                              <th className={styles.colExistencia}>EXISTENCIA</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row, idx) => (
                              <tr
                                key={row.id || idx}
                                className={
                                  styles[
                                    `row${((row.movement_type ?? "").toUpperCase())}`
                                  ]
                                }
                              >
                                <td className={styles.cellFecha}>
                                  {formatDateTime(row.created_at)}
                                </td>
                                <td className={styles.cellDescripcion}>
                                  {getMovementDescription(row)}
                                </td>
                                <td
                                  className={`${styles.cellEntradas} ${
                                    row.entryQty > 0 ? styles.positive : ""
                                  }`}
                                >
                                  {row.entryQty > 0 ? `+${row.entryQty}` : "—"}
                                </td>
                                <td
                                  className={`${styles.cellSalidas} ${
                                    row.exitQty > 0 ? styles.negative : ""
                                  }`}
                                >
                                  {row.exitQty > 0 ? `-${row.exitQty}` : "—"}
                                </td>
                                <td
                                  className={`${styles.cellExistencia} ${
                                    row.runningStock !== null &&
                                    row.runningStock !== undefined &&
                                    row.runningStock < Number(product?.minimo ?? 0)
                                      ? styles.lowStock
                                      : ""
                                  }`}
                                >
                                  {row.runningStock ?? "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!selectedProducts[0] && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
              </svg>
            </div>
            <div className={styles.emptyTitle}>Selecciona un producto</div>
            <div className={styles.emptySubtitle}>
              Escanea un código de barras o presiona <strong>F10</strong> para buscar un producto y ver su kardex.
            </div>
          </div>
        )}
      </div>

      {/* Modal F10 */}
      <InventorySearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        products={products}
        onSelect={handleSelectProduct}
      />
    </div>
  );
};

export default PageKardex;
