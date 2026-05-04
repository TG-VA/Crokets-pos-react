import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";
import { useBranch } from "../../../../contexts/BranchContext";
import styles from "./PageMovementsReports.module.css";

const POLI_BRANCH_ID = "412f367f-7c86-45ca-9e91-b8fe6274b232";

const MOVEMENT_TYPE_LABELS = {
  sale: "Venta",
  return: "Devolución",
  canceled: "Cancelación",
  adjustment: "Ajuste",
  transfer: "Traspaso",
  purchase: "Compra",
};

const formatMovementType = (value) => {
  const key = (value ?? "").toString().trim().toLowerCase();
  if (!key) return "—";
  return MOVEMENT_TYPE_LABELS[key] ?? value;
};

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
    hour12: false,
  }).format(d);
};

const formatTicket = (value) => {
  const raw = (value ?? "").toString().trim();
  if (!raw) return "—";
  return raw.slice(0, 8);
};

const getSalesObj = (row) => {
  const s = row?.sales ?? row?.sale ?? {};
  if (Array.isArray(s)) return s[0] ?? {};
  return s ?? {};
};

const getLocalDateKey = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const COL_WIDTHS_STORAGE_KEY = "movementsReportColWidths_v2";
const MOVEMENTS_TABLE_OVERRIDE = import.meta.env.VITE_INVENTORY_MOVEMENTS_TABLE;
const MOVEMENTS_TABLE_SELECTED_KEY = "movementsReportSelectedTable_v1";
const MOVEMENTS_SALES_SELECT_KEY = "movementsReportSalesSelect_v1";
const MOVEMENTS_PRODUCTS_SELECT_KEY = "movementsReportProductsSelect_v1";
const MOVEMENTS_USERS_SELECT_KEY = "movementsReportUsersSelect_v1";
const FACET_FILTERS_STORAGE_KEY = "movementsReportFacetFilters_v1";

const buildRowView = (r) => {
  const p = r?.products ?? {};
  const s = getSalesObj(r);
  const u = r?.users ?? {};
  const ticketRaw =
    (s?.ticket_number ?? "").toString().trim() ||
    (s?.folio ?? "").toString().trim() ||
    (s?.ticket ?? "").toString().trim() ||
    (s?.receipt_number ?? "").toString().trim() ||
    (r?.sale_id ?? "").toString().trim() ||
    (r?.saleId ?? "").toString().trim() ||
    "";
  const ticket = formatTicket(ticketRaw);
  const soldAtValue = s?.created_at ?? r?.created_at;
  const soldAt = formatDateTime(soldAtValue);
  const productName =
    (p?.name ?? "").toString().trim() || (r?.product_id ?? "").toString() || "—";
  const username =
    (u?.username ?? "").toString().trim() || (r?.user_id ?? "").toString() || "—";
  const typeKey = (r?.movement_type ?? "").toString().trim().toLowerCase();
  const typeLabel = formatMovementType(typeKey || r?.movement_type);
  const reason = (r?.reason ?? "").toString() || "—";
  return {
    soldAtValue,
    soldAt,
    productName,
    ticketRaw,
    ticket,
    typeKey,
    typeLabel,
    qty: r?.quantity ?? 0,
    prev: r?.previous_stock ?? 0,
    next: r?.new_stock ?? 0,
    reason,
    username,
  };
};

const PageMovementsReport = () => {
  const { branch } = useBranch();
  const [branchOptions, setBranchOptions] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(POLI_BRANCH_ID);
  const [selectedDay, setSelectedDay] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isResizing, setIsResizing] = useState(false);
  const [colWidths, setColWidths] = useState(() => {
    const defaults = {
      date: 140,
      product: 280,
      ticket: 120,
      type: 160,
      qty: 90,
      prev: 110,
      next: 110,
      reason: 260,
      user: 70,
    };
    try {
      const rawV2 = localStorage.getItem(COL_WIDTHS_STORAGE_KEY);
      const rawV1 = localStorage.getItem("movementsReportColWidths");
      const raw = rawV2 || rawV1;
      if (!raw) return defaults;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return defaults;
      const next = { ...defaults };
      for (const k of Object.keys(defaults)) {
        const v = parsed[k];
        const n = typeof v === "number" ? v : Number(v);
        if (Number.isFinite(n) && n > 0) next[k] = n;
      }
      if (!rawV2 && typeof next.user === "number") {
        next.user = Math.max(60, next.user - 30);
      }
      return next;
    } catch (_e) {
      return defaults;
    }
  });
  const [facetFilters, setFacetFilters] = useState(() => {
    const defaults = { product: [], ticket: [], type: [], reason: [], user: [] };
    try {
      const raw = localStorage.getItem(FACET_FILTERS_STORAGE_KEY);
      if (!raw) return defaults;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return defaults;
      const next = { ...defaults };
      for (const k of Object.keys(defaults)) {
        const v = parsed[k];
        next[k] = Array.isArray(v) ? v.filter((x) => x !== null && x !== undefined) : [];
      }
      return next;
    } catch (_e) {
      return defaults;
    }
  });
  const [openFacet, setOpenFacet] = useState(null);
  const [facetSearch, setFacetSearch] = useState({});

  useEffect(() => {
    try {
      localStorage.setItem(FACET_FILTERS_STORAGE_KEY, JSON.stringify(facetFilters));
    } catch (_e) {}
  }, [facetFilters]);

  useEffect(() => {
    if (!openFacet) return;
    const key = openFacet;
    const onDown = (e) => {
      const pop = e.target?.closest?.(`[data-mov-filter-popover="${key}"]`);
      const btn = e.target?.closest?.(`[data-mov-filter-button="${key}"]`);
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

  const setFacet = (key, values) => {
    setFacetFilters((prev) => ({ ...prev, [key]: values }));
  };

  const toggleFacetValue = (key, value) => {
    setFacetFilters((prev) => {
      const current = Array.isArray(prev[key]) ? prev[key] : [];
      const exists = current.includes(value);
      return { ...prev, [key]: exists ? current.filter((x) => x !== value) : [...current, value] };
    });
  };

  const clearFacet = (key) => setFacet(key, []);

  const toggleFacet = (key) => {
    setOpenFacet((prev) => {
      const next = prev === key ? null : key;
      if (next) {
        setFacetSearch((s) => ({ ...s, [key]: s?.[key] ?? "" }));
      }
      return next;
    });
  };

  const filterableColumns = useMemo(() => new Set(["product", "ticket", "type", "reason", "user"]), []);

  const columns = useMemo(
    () => [
      { key: "date", label: "Fecha y hora", min: 120 },
      { key: "product", label: "Producto", min: 160 },
      { key: "ticket", label: "Ticket", min: 90 },
      { key: "type", label: "Tipo de movimiento", min: 140 },
      { key: "qty", label: "Cantidad", min: 70 },
      { key: "prev", label: "Stock anterior", min: 100 },
      { key: "next", label: "Nuevo stock", min: 100 },
      { key: "reason", label: "Motivo", min: 160 },
      { key: "user", label: "Usuario", min: 90 },
    ],
    []
  );

  useEffect(() => {
    try {
      localStorage.setItem(COL_WIDTHS_STORAGE_KEY, JSON.stringify(colWidths));
    } catch (_e) {}
  }, [colWidths]);

  const startResize = (key, min, e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = Number(colWidths[key] ?? 120);
    setIsResizing(true);

    const onMove = (ev) => {
      const delta = ev.clientX - startX;
      const nextWidth = Math.max(min ?? 60, Math.round(startWidth + delta));
      setColWidths((prev) => ({ ...prev, [key]: nextWidth }));
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setIsResizing(false);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

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
          hasPoli ? list : [...list, { id: POLI_BRANCH_ID, name: "POLÍGONO", code: "" }]
        );
      } catch (_e) {
        const fallback = branch?.id
          ? [
              { id: POLI_BRANCH_ID, name: "POLÍGONO", code: "" },
              { id: branch.id, name: branch?.name || "Sucursal actual", code: branch?.code || "" },
            ]
          : [{ id: POLI_BRANCH_ID, name: "POLÍGONO", code: "" }];
        setBranchOptions(fallback);
      }
    };

    loadBranches();
  }, [branch?.id, branch?.name, branch?.code]);

  useEffect(() => {
    const loadMovements = async () => {
      setLoading(true);
      setError("");
      setRows([]);

      const isMissingColumn = (err, col) => {
        const msg = (err?.message ?? err?.details ?? "").toString().toLowerCase();
        return msg.includes("column") && msg.includes(col.toLowerCase());
      };

      const isMissingTable = (err) => {
        const msg = (err?.message ?? err?.details ?? "").toString().toLowerCase();
        return msg.includes("does not exist") && (msg.includes("relation") || msg.includes("table"));
      };

      try {
        const getCached = (key) => {
          try {
            return localStorage.getItem(key);
          } catch (_e) {
            return null;
          }
        };

        const setCached = (key, value) => {
          try {
            localStorage.setItem(key, value);
          } catch (_e) {}
        };

        const tableCandidates = [
          MOVEMENTS_TABLE_OVERRIDE,
          "inventory_movements",
          "inventory_movement",
          "stock_movements",
          "inventory_movements_log",
        ].filter(Boolean);

        let table = null;
        const cachedTable = getCached(MOVEMENTS_TABLE_SELECTED_KEY);
        const candidatesOrdered = cachedTable
          ? [cachedTable, ...tableCandidates.filter((t) => t !== cachedTable)]
          : tableCandidates;

        for (const candidate of candidatesOrdered) {
          const probe = await supabase.from(candidate).select("id", { head: true }).limit(1);
          if (!probe.error) {
            table = candidate;
            setCached(MOVEMENTS_TABLE_SELECTED_KEY, candidate);
            break;
          }
          if (probe.error && isMissingTable(probe.error)) {
            if (candidate === cachedTable) {
              setCached(MOVEMENTS_TABLE_SELECTED_KEY, "");
            }
            continue;
          }
          table = candidate;
          setCached(MOVEMENTS_TABLE_SELECTED_KEY, candidate);
          break;
        }

        if (!table) {
          setError("No existe una tabla de movimientos en la BD.");
          return;
        }

        const baseSelect = `
          id,
          sale_id,
          branch_id,
          product_id,
          movement_type,
          quantity,
          previous_stock,
          new_stock,
          reason,
          user_id,
          created_at
        `;

        const runQuery = async ({ includeBranchFilter, includeOrder }) => {
          let q = supabase.from(table).select(baseSelect).limit(200);
          if (includeBranchFilter && selectedBranchId) {
            q = q.eq("branch_id", selectedBranchId);
          }
          if (includeOrder) {
            q = q.order("created_at", { ascending: false });
          }
          return await q;
        };

        let res = await runQuery({ includeBranchFilter: true, includeOrder: true });
        if (res.error && isMissingColumn(res.error, "created_at")) {
          res = await runQuery({ includeBranchFilter: true, includeOrder: false });
        }
        if (res.error && isMissingColumn(res.error, "branch_id")) {
          res = await runQuery({ includeBranchFilter: false, includeOrder: false });
        }

        if (res.error) {
          const msg = import.meta.env.DEV
            ? `No se pudo cargar el reporte de movimientos. ${res.error?.message || ""}`.trim()
            : "No se pudo cargar el reporte de movimientos.";
          setError(msg);
          return;
        }

        const baseRows = Array.isArray(res.data) ? res.data : [];
        if (baseRows.length === 0) {
          setRows([]);
          return;
        }

        const productIds = Array.from(
          new Set(baseRows.map((r) => r?.product_id).filter(Boolean))
        );
        const userIds = Array.from(new Set(baseRows.map((r) => r?.user_id).filter(Boolean)));
        const saleIdsRaw = Array.from(new Set(baseRows.map((r) => r?.sale_id).filter(Boolean)));
        const isUuid = (value) =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            (value ?? "").toString().trim()
          );
        const saleIds = saleIdsRaw.filter(isUuid);

        const loadProducts = async () => {
          if (!productIds.length) return { data: [], error: null };
          const cachedSelect = getCached(MOVEMENTS_PRODUCTS_SELECT_KEY);
          const candidates = [
            cachedSelect,
            "id, name, barcode",
            "id, name",
            "id",
          ].filter(Boolean);
          for (const sel of candidates) {
            const r = await supabase.from("products").select(sel).in("id", productIds);
            if (!r.error) {
              setCached(MOVEMENTS_PRODUCTS_SELECT_KEY, sel);
              return r;
            }
            const msg = (r.error?.message ?? r.error?.details ?? "").toString().toLowerCase();
            if (msg.includes("column")) continue;
            return { data: [], error: r.error };
          }
          return { data: [], error: null };
        };

        const loadUsers = async () => {
          if (!userIds.length) return { data: [], error: null };
          const cachedSelect = getCached(MOVEMENTS_USERS_SELECT_KEY);
          const candidates = [cachedSelect, "id, username", "id"].filter(Boolean);
          for (const sel of candidates) {
            const r = await supabase.from("users").select(sel).in("id", userIds);
            if (!r.error) {
              setCached(MOVEMENTS_USERS_SELECT_KEY, sel);
              return r;
            }
            const msg = (r.error?.message ?? r.error?.details ?? "").toString().toLowerCase();
            if (msg.includes("column")) continue;
            return { data: [], error: r.error };
          }
          return { data: [], error: null };
        };

        const loadSales = async () => {
          if (!saleIds.length) return { data: [], error: null };
          const cachedSelect = getCached(MOVEMENTS_SALES_SELECT_KEY);
          const candidates = [
            cachedSelect,
            "id, ticket_number, created_at",
            "id, folio, created_at",
            "id, ticket, created_at",
            "id, receipt_number, created_at",
            "id, created_at",
            "id",
          ].filter(Boolean);
          for (const sel of candidates) {
            const r = await supabase.from("sales").select(sel).in("id", saleIds);
            if (!r.error) {
              setCached(MOVEMENTS_SALES_SELECT_KEY, sel);
              return r;
            }
            const msg = (r.error?.message ?? r.error?.details ?? "").toString().toLowerCase();
            if (msg.includes("column")) continue;
            return { data: [], error: r.error };
          }
          return { data: [], error: null };
        };

        const [productsRes, usersRes, salesRes] = await Promise.all([
          loadProducts(),
          loadUsers(),
          loadSales(),
        ]);

        const productsById = new Map(
          (Array.isArray(productsRes.data) ? productsRes.data : []).map((p) => [p.id, p])
        );
        const usersById = new Map(
          (Array.isArray(usersRes.data) ? usersRes.data : []).map((u) => [u.id, u])
        );
        const salesById = new Map(
          (Array.isArray(salesRes.data) ? salesRes.data : []).map((s) => [s.id, s])
        );

        const hydrated = baseRows.map((r) => ({
          ...r,
          products: productsById.get(r?.product_id) ?? null,
          users: usersById.get(r?.user_id) ?? null,
          sales: salesById.get(r?.sale_id) ?? null,
        }));

        setRows(hydrated);
      } catch (_e) {
        setError("No se pudo cargar el reporte de movimientos.");
      } finally {
        setLoading(false);
      }
    };

    loadMovements();
  }, [selectedBranchId]);

  const selectedBranchLabel = useMemo(() => {
    const current = branchOptions.find((b) => b.id === selectedBranchId);
    if (!current) return selectedBranchId || "—";
    if (current.code) return `${current.name} (${current.code})`;
    return current.name;
  }, [branchOptions, selectedBranchId]);

  const rowsForFacets = useMemo(() => {
    const list = Array.isArray(rows) ? rows : [];
    if (!selectedDay) return list;
    return list.filter((r) => {
      const v = buildRowView(r);
      return getLocalDateKey(v.soldAtValue) === selectedDay;
    });
  }, [rows, selectedDay]);

  const facetOptions = useMemo(() => {
    const toKey = (v) => (v ?? "").toString().trim();
    const add = (map, value) => {
      const k = toKey(value);
      if (!k || k === "—") return;
      map.set(k, (map.get(k) ?? 0) + 1);
    };

    const product = new Map();
    const ticket = new Map();
    const type = new Map();
    const reason = new Map();
    const user = new Map();

    for (const r of rowsForFacets) {
      const v = buildRowView(r);
      add(product, v.productName);
      add(ticket, v.ticket);
      add(type, v.typeKey || v.typeLabel);
      add(reason, v.reason);
      add(user, v.username);
    }

    const toList = (map, labelMap) =>
      Array.from(map.entries())
        .map(([value, count]) => ({
          value,
          label: labelMap?.get?.(value) ?? value,
          count,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base" }));

    const typeLabels = new Map();
    for (const [key, label] of Object.entries(MOVEMENT_TYPE_LABELS)) typeLabels.set(key, label);

    return {
      product: toList(product),
      ticket: toList(ticket),
      type: toList(type, typeLabels),
      reason: toList(reason),
      user: toList(user),
    };
  }, [rowsForFacets]);

  const filteredRows = useMemo(() => {
    const includes = (arr, value) => !arr?.length || arr.includes(value);
    const typeIncludes = (arr, value, label) => {
      if (!arr?.length) return true;
      if (arr.includes(value)) return true;
      return !!label && arr.includes(label);
    };

    return rowsForFacets.filter((r) => {
      const v = buildRowView(r);
      if (!includes(facetFilters.product, v.productName)) return false;
      if (!includes(facetFilters.ticket, v.ticket)) return false;
      if (!typeIncludes(facetFilters.type, v.typeKey, v.typeLabel)) return false;
      if (!includes(facetFilters.reason, v.reason)) return false;
      if (!includes(facetFilters.user, v.username)) return false;
      return true;
    });
  }, [rowsForFacets, facetFilters]);

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>Reporte de movimientos</h1>
          <div className={styles.controls}>
            <div className={styles.controlGroup}>
              <label className={styles.label}>Día</label>
              <input
                className={styles.dateInput}
                type="date"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
              />
            </div>
            <div className={styles.controlGroup}>
              <label className={styles.label}>Sucursal</label>
              <select
                className={styles.select}
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
              >
                {branchOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code ? `${b.name} (${b.code})` : b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className={styles.meta}>Sucursal seleccionada: {selectedBranchLabel}</div>
        {loading && <div className={styles.info}>Cargando movimientos...</div>}
        {!!error && <div className={styles.error}>{error}</div>}

        <div className={`${styles.tableWrap} ${isResizing ? styles.resizing : ""}`}>
          <table className={styles.table}>
            <colgroup>
              <col className={styles.colDate} style={{ width: colWidths.date }} />
              <col className={styles.colProduct} style={{ width: colWidths.product }} />
              <col className={styles.colTicket} style={{ width: colWidths.ticket }} />
              <col className={styles.colType} style={{ width: colWidths.type }} />
              <col className={styles.colQty} style={{ width: colWidths.qty }} />
              <col className={styles.colPrev} style={{ width: colWidths.prev }} />
              <col className={styles.colNew} style={{ width: colWidths.next }} />
              <col className={styles.colReason} style={{ width: colWidths.reason }} />
              <col className={styles.colUser} style={{ width: colWidths.user }} />
            </colgroup>
            <thead>
              <tr>
                {columns.map((c, idx) => {
                  const showHandle = idx < columns.length - 1;
                  const isFilterable = filterableColumns.has(c.key);
                  const activeCount = Array.isArray(facetFilters[c.key]) ? facetFilters[c.key].length : 0;
                  const isOpen = openFacet === c.key;
                  return (
                    <th key={c.key}>
                      <div className={styles.thInner}>
                        <span className={styles.thLabel}>{c.label}</span>
                        {isFilterable && (
                          <button
                            type="button"
                            className={`${styles.filterButton} ${
                              activeCount ? styles.filterButtonActive : ""
                            } ${isOpen ? styles.filterButtonOpen : ""}`}
                            onClick={() => toggleFacet(c.key)}
                            data-mov-filter-button={c.key}
                            aria-label={`Filtrar ${c.label}`}
                          >
                            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                              <path
                                fill="currentColor"
                                d="M3 5h18v2l-7 7v6l-4-2v-4L3 7V5z"
                              />
                            </svg>
                            {activeCount ? (
                              <span className={styles.filterBadge}>{activeCount}</span>
                            ) : null}
                          </button>
                        )}
                        {isFilterable && isOpen ? (
                          <div
                            className={styles.filterPopover}
                            data-mov-filter-popover={c.key}
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            <div className={styles.filterPopoverHeader}>
                              <input
                                className={styles.filterSearch}
                                value={(facetSearch?.[c.key] ?? "").toString()}
                                onChange={(e) =>
                                  setFacetSearch((prev) => ({ ...prev, [c.key]: e.target.value }))
                                }
                                placeholder="Buscar..."
                              />
                              <button
                                type="button"
                                className={styles.filterMiniButton}
                                onClick={() => clearFacet(c.key)}
                              >
                                Limpiar
                              </button>
                            </div>
                            <div className={styles.filterPopoverActions}>
                              <button
                                type="button"
                                className={styles.filterMiniButton}
                                onClick={() =>
                                  setFacet(
                                    c.key,
                                    (facetOptions?.[c.key] ?? []).map((o) => o.value)
                                  )
                                }
                              >
                                Todo
                              </button>
                              <button
                                type="button"
                                className={styles.filterMiniButton}
                                onClick={() => clearFacet(c.key)}
                              >
                                Nada
                              </button>
                            </div>
                            <div className={styles.filterList}>
                              {(facetOptions?.[c.key] ?? [])
                                .filter((o) => {
                                  const q = (facetSearch?.[c.key] ?? "").toString().trim().toLowerCase();
                                  if (!q) return true;
                                  return o.label.toLowerCase().includes(q);
                                })
                                .map((o) => (
                                  <label key={o.value} className={styles.filterOption}>
                                    <input
                                      type="checkbox"
                                      checked={Array.isArray(facetFilters[c.key]) && facetFilters[c.key].includes(o.value)}
                                      onChange={() => toggleFacetValue(c.key, o.value)}
                                    />
                                    <span className={styles.filterOptionLabel}>{o.label}</span>
                                    <span className={styles.filterOptionCount}>{o.count}</span>
                                  </label>
                                ))}
                            </div>
                          </div>
                        ) : null}
                        {showHandle && (
                          <span
                            className={styles.resizeHandle}
                            onMouseDown={(e) => startResize(c.key, c.min, e)}
                          />
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {!loading && filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className={styles.empty}>
                    No hay movimientos para mostrar.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => {
                  const v = buildRowView(r);

                  return (
                    <tr key={r?.id ?? `${r?.product_id}-${r?.created_at}`}>
                      <td className={styles.dateCell}>{v.soldAt}</td>
                      <td className={styles.productCell}>{v.productName}</td>
                      <td className={styles.ticketCell}>{v.ticket}</td>
                      <td>{v.typeLabel}</td>
                      <td className={styles.center}>{v.qty}</td>
                      <td className={styles.center}>{v.prev}</td>
                      <td className={styles.center}>{v.next}</td>
                      <td>{v.reason}</td>
                      <td>{v.username}</td>
                    </tr>
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

export default PageMovementsReport;
