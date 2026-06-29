import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ExcelJS from "exceljs";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { supabase } from "../../../../lib/supabaseClient";
import { useBranch } from "../../../../contexts/BranchContext";
import styles from "./PageMovementsReports.module.css";

const POLI_BRANCH_ID = "412f367f-7c86-45ca-9e91-b8fe6274b232";
const INVENTORY_MOVEMENTS_TABLE = "inventory_movements";
const REFRESH_INTERVAL_MS = 2000;
const MAX_MOVEMENTS = 500;
const TIME_ZONE = "America/Cancun";

const MOVEMENT_TYPE_LABELS = {
  sale: "Venta",
  sale_redemption: "Venta/canje",
  return: "Devolución",
  canceled: "Cancelación",
  redemption: "Redención",
  adjustment: "Ajuste",
  transfer: "Traspaso",
  purchase: "Compra",
  inventory_add: "Alta inventario",
  inventory_activate: "Activar inventario",
  inventory_deactivate: "Desactivar inventario",
  product_create: "Alta producto",
  product_update: "Modificar producto",
  product_delete: "Eliminar producto",
};

const formatMovementType = (value) => {
  const key = (value ?? "").toString().trim().toLowerCase();
  if (!key) return "—";
  return MOVEMENT_TYPE_LABELS[key] ?? value;
};

const formatReason = (value) => {
  const raw = (value ?? "").toString().trim();
  if (!raw) return "—";
  const match = raw.match(/^([a-z_]+):\s*(.*)$/i);
  if (!match) return raw.toUpperCase();
  const key = (match[1] ?? "").toString().trim().toLowerCase();
  const rest = (match[2] ?? "").toString().trim();
  const label = MOVEMENT_TYPE_LABELS[key];
  if (!label) return raw.toUpperCase();
  if (!rest) return label.toUpperCase();
  return `${label.toUpperCase()}: ${rest.toUpperCase()}`;
};

const formatDateTime = (value, { useSystemTime = false } = {}) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const options = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };
  if (!useSystemTime) {
    options.timeZone = TIME_ZONE;
  }
  return new Intl.DateTimeFormat("es-MX", options).format(d);
};

const getDateParts = (value, { useSystemTime = false } = {}) => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  const options = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };
  if (!useSystemTime) {
    options.timeZone = TIME_ZONE;
  }

  const parts = new Intl.DateTimeFormat("en-CA", options).formatToParts(d);

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  if (!map.year || !map.month || !map.day) return null;
  return {
    year: map.year,
    month: map.month,
    day: map.day,
  };
};

const formatDateKeyLabel = (value) => {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return "—";
  return `${day}/${month}/${year}`;
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

const getRowMovementTypeKey = (row) =>
  (row?.movement_type ?? "").toString().trim().toLowerCase();

const getRowTypeInfo = (row) => {
  const rawTypeKey = getRowMovementTypeKey(row);
  const isMixedSaleRedemption =
    row?.has_sale_redemption === true &&
    (rawTypeKey === "sale" || rawTypeKey === "redemption");

  if (isMixedSaleRedemption) {
    return {
      typeKey: "sale_redemption",
      typeLabel: formatMovementType("sale_redemption"),
      typeFilterKeys: ["sale_redemption", "sale", "redemption"],
      rawTypeKey,
    };
  }

  return {
    typeKey: rawTypeKey,
    typeLabel: formatMovementType(rawTypeKey || row?.movement_type),
    typeFilterKeys: rawTypeKey ? [rawTypeKey] : [],
    rawTypeKey,
  };
};

const getTodayDateKey = () => {
  const parts = getDateParts(new Date());
  if (!parts) return "0000-00-00";
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const getDateKeyFromValue = (value, options) => {
  const parts = getDateParts(value, options);
  if (!parts) return null;
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const dateKeyToDate = (value) => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, (month || 1) - 1, day || 1);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

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

const toUpperSafe = (value, fallback = "—") => {
  const normalized = (value ?? "").toString().trim();
  return (normalized || fallback).toUpperCase();
};

const getDateRangeForPreset = (dateKey, preset) => {
  const baseKey = dateKey || getTodayDateKey();
  const [year, month, day] = baseKey.split("-").map(Number);
  const baseDate = new Date(year, (month || 1) - 1, day || 1);
  if (Number.isNaN(baseDate.getTime())) return null;

  if (preset === "month") {
    const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    const end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
    return {
      start,
      end,
      startKey: getDateKeyFromValue(start),
      endKey: getDateKeyFromValue(end),
    };
  }

  if (preset === "week") {
    const start = new Date(baseDate);
    const dayOfWeek = start.getDay();
    const delta = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    start.setDate(start.getDate() - delta);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return {
      start,
      end,
      startKey: getDateKeyFromValue(start),
      endKey: getDateKeyFromValue(end),
    };
  }

  return {
    start: baseDate,
    end: baseDate,
    startKey: getDateKeyFromValue(baseDate),
    endKey: getDateKeyFromValue(baseDate),
  };
};

const COL_WIDTHS_STORAGE_KEY = "movementsReportColWidths_v2";
const MOVEMENTS_SALES_SELECT_KEY = "movementsReportSalesSelect_v2";
const MOVEMENTS_PRODUCTS_SELECT_KEY = "movementsReportProductsSelect_v1";
const MOVEMENTS_USERS_SELECT_KEY = "movementsReportUsersSelect_v1";
const MOVEMENTS_REDEMPTIONS_SELECT_KEY = "movementsReportRedemptionsSelect_v1";
const MOVEMENTS_REWARDS_SELECT_KEY = "movementsReportRewardsSelect_v1";
const REWARD_REDEMPTIONS_TABLE = "sale_reward_redemptions";
const buildSaleProductKey = (saleId, productId) => {
  const saleKey = (saleId ?? "").toString().trim();
  const productKey = (productId ?? "").toString().trim();
  if (!saleKey || !productKey) return null;
  return `${saleKey}::${productKey}`;
};

const buildRedemptionReason = (rewardLabel, pointsValue) => {
  const reasonParts = [];
  if (rewardLabel) reasonParts.push(rewardLabel);
  if (pointsValue !== null && pointsValue !== undefined && pointsValue !== "") {
    reasonParts.push(`${pointsValue} PTS`);
  }
  return reasonParts.length > 0 ? `redemption: ${reasonParts.join(" - ")}` : "redemption";
};

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
  const useSystemTime = !s?.sale_date;
  const soldAtValue = s?.sale_date ?? r?.created_at ?? s?.created_at;
  const soldAt = formatDateTime(soldAtValue, { useSystemTime });
  const soldAtDateKey = getDateKeyFromValue(soldAtValue, { useSystemTime });
  const productName =
    ((r?.display_product_name ?? "").toString().trim() ||
      (p?.name ?? "").toString().trim() ||
      (r?.product_id ?? "").toString() ||
      "—").toUpperCase();
  const username =
    ((u?.username ?? "").toString().trim() ||
      (r?.user_id ?? "").toString() ||
      "—").toUpperCase();
  const { rawTypeKey, typeKey, typeLabel, typeFilterKeys } = getRowTypeInfo(r);
  const reason = formatReason(r?.reason);
  const shouldForceZeroQty =
    typeKey === "product_update" || typeKey === "product_delete";
  return {
    soldAtValue,
    soldAt,
    soldAtDateKey,
    productName,
    ticketRaw,
    ticket,
    typeKey,
    rawTypeKey,
    typeLabel,
    typeFilterKeys,
    qty: shouldForceZeroQty ? 0 : r?.quantity ?? 0,
    prev: r?.previous_stock ?? null,
    next: r?.new_stock ?? null,
    reason,
    username,
  };
};

const PageMovementsReport = () => {
  const { branch } = useBranch();
  const [branchOptions, setBranchOptions] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedDay, setSelectedDay] = useState(getTodayDateKey);
  const [datePreset, setDatePreset] = useState("day");
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
  const [facetFilters, setFacetFilters] = useState({
    product: [],
    ticket: [],
    type: [],
    reason: [],
    user: [],
  });
  const [openFacet, setOpenFacet] = useState(null);
  const [facetSearch, setFacetSearch] = useState({});
  const realtimeRefreshTimerRef = useRef(null);
  const pollingIntervalRef = useRef(null);

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

  const setFacet = (key, values, { close = false } = {}) => {
    setFacetFilters((prev) => ({ ...prev, [key]: values }));
    if (close) setOpenFacet(null);
  };

  const toggleFacetValue = (key, value) => {
    setFacetFilters((prev) => {
      const current = Array.isArray(prev[key]) ? prev[key] : [];
      const exists = current.includes(value);
      return { ...prev, [key]: exists ? current.filter((x) => x !== value) : [...current, value] };
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
    if (branch?.id && (!selectedBranchId || selectedBranchId === POLI_BRANCH_ID)) {
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
        const nextOptions = hasPoli ? list : [...list, { id: POLI_BRANCH_ID, name: "POLÍGONO", code: "" }];
        setBranchOptions(nextOptions);
        setSelectedBranchId((prev) => {
          if (branch?.id && nextOptions.some((item) => item?.id === branch.id)) return branch.id;
          if (prev && nextOptions.some((item) => item?.id === prev)) return prev;
          return nextOptions[0]?.id || "";
        });
      } catch (_e) {
        const fallback = branch?.id
          ? [
              { id: POLI_BRANCH_ID, name: "POLÍGONO", code: "" },
              { id: branch.id, name: branch?.name || "Sucursal actual", code: branch?.code || "" },
            ]
          : [{ id: POLI_BRANCH_ID, name: "POLÍGONO", code: "" }];
        setBranchOptions(fallback);
        setSelectedBranchId((prev) => prev || branch?.id || fallback[0]?.id || "");
      }
    };

    loadBranches();
  }, [branch?.id, branch?.name, branch?.code]);

  const loadMovements = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError("");
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

      let query = supabase
        .from(INVENTORY_MOVEMENTS_TABLE)
        .select(`
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
        `)
        .order("created_at", { ascending: false })
        .limit(MAX_MOVEMENTS);

      if (selectedBranchId) {
        query = query.eq("branch_id", selectedBranchId);
      }

      const res = await query;
      if (res.error) {
        const msg = import.meta.env.DEV
          ? `No se pudo cargar inventory_movements. ${res.error?.message || ""}`.trim()
          : "No se pudo cargar el reporte de movimientos.";
        setError(msg);
        setRows([]);
        return;
      }

      const baseRows = Array.isArray(res.data) ? res.data : [];
      const loadRewardRedemptions = async () => {
        const cachedSelect = getCached(MOVEMENTS_REDEMPTIONS_SELECT_KEY);
        const candidates = [
          cachedSelect,
          "id, sale_id, sale_detail_id, customer_id, reward_id, product_id, branch_id, user_id, quantity, points_used, created_at",
          "id, sale_id, sale_detail_id, customer_id, reward_id, product_id, branch_id, user_id, qty, points_used, created_at",
          "id, sale_id, sale_detail_id, customer_id, reward_id, product_id, branch_id, user_id, quantity, redeemed_points, created_at",
          "id, sale_id, sale_detail_id, customer_id, reward_id, product_id, branch_id, user_id, quantity, points_redeemed, created_at",
          "id, sale_id, reward_id, product_id, branch_id, user_id, quantity, created_at",
          "id, sale_id, reward_id, product_id, branch_id, user_id, created_at",
          "id, sale_id, reward_id, product_id, branch_id, user_id",
        ].filter(Boolean);

        for (const sel of candidates) {
          let query = supabase
            .from(REWARD_REDEMPTIONS_TABLE)
            .select(sel)
            .order("created_at", { ascending: false })
            .limit(MAX_MOVEMENTS);

          if (selectedBranchId) {
            query = query.eq("branch_id", selectedBranchId);
          }

          const r = await query;
          if (!r.error) {
            setCached(MOVEMENTS_REDEMPTIONS_SELECT_KEY, sel);
            return r;
          }
          const msg = (r.error?.message ?? r.error?.details ?? "").toString().toLowerCase();
          if (msg.includes("column")) continue;
          if (msg.includes("relation") || msg.includes("does not exist")) {
            return { data: [], error: null };
          }
          return { data: [], error: r.error };
        }
        return { data: [], error: null };
      };

      const rewardRedemptionsRes = await loadRewardRedemptions();
      const rewardRows = Array.isArray(rewardRedemptionsRes.data) ? rewardRedemptionsRes.data : [];
      const allRows = [...baseRows, ...rewardRows];
      const productIds = Array.from(new Set(allRows.map((r) => r?.product_id).filter(Boolean)));
      const userIds = Array.from(new Set(allRows.map((r) => r?.user_id).filter(Boolean)));
      const saleIds = Array.from(new Set(allRows.map((r) => r?.sale_id).filter(Boolean)));
      const rewardIds = Array.from(new Set(rewardRows.map((r) => r?.reward_id).filter(Boolean)));

      const loadProducts = async () => {
        if (!productIds.length) return { data: [], error: null };
        const cachedSelect = getCached(MOVEMENTS_PRODUCTS_SELECT_KEY);
        const candidates = [cachedSelect, "id, name, barcode", "id, name", "id"].filter(Boolean);
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
          "id, sale_date, ticket_number, created_at",
          "id, sale_date, folio, created_at",
          "id, sale_date, ticket, created_at",
          "id, sale_date, receipt_number, created_at",
          "id, sale_date, created_at",
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

      const loadRewards = async () => {
        if (!rewardIds.length) return { data: [], error: null };
        const cachedSelect = getCached(MOVEMENTS_REWARDS_SELECT_KEY);
        const candidates = [
          cachedSelect,
          "id, name",
          "id, title",
          "id, reward_name",
          "id, description",
          "id",
        ].filter(Boolean);
        for (const sel of candidates) {
          const r = await supabase.from("rewards").select(sel).in("id", rewardIds);
          if (!r.error) {
            setCached(MOVEMENTS_REWARDS_SELECT_KEY, sel);
            return r;
          }
          const msg = (r.error?.message ?? r.error?.details ?? "").toString().toLowerCase();
          if (msg.includes("column")) continue;
          if (msg.includes("relation") || msg.includes("does not exist")) {
            return { data: [], error: null };
          }
          return { data: [], error: r.error };
        }
        return { data: [], error: null };
      };

      const [productsRes, usersRes, salesRes, rewardsRes] = await Promise.all([
        loadProducts(),
        loadUsers(),
        loadSales(),
        loadRewards(),
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
      const rewardsById = new Map(
        (Array.isArray(rewardsRes.data) ? rewardsRes.data : []).map((reward) => [reward.id, reward])
      );
      const redemptionSaleIds = new Set(rewardRows.map((r) => r?.sale_id).filter(Boolean));
      const rewardRowsBySaleProduct = new Map();

      rewardRows.forEach((r) => {
        const key = buildSaleProductKey(r?.sale_id, r?.product_id);
        if (!key || rewardRowsBySaleProduct.has(key)) return;
        rewardRowsBySaleProduct.set(key, r);
      });

      const hydrated = baseRows.map((r) => {
        const saleObj = salesById.get(r?.sale_id) ?? null;
        const matchedRewardRow = rewardRowsBySaleProduct.get(buildSaleProductKey(r?.sale_id, r?.product_id)) ?? null;
        const matchedRewardObj = matchedRewardRow
          ? rewardsById.get(matchedRewardRow?.reward_id) ?? null
          : null;
        const matchedRewardLabel =
          (
            matchedRewardObj?.name ??
            matchedRewardObj?.title ??
            matchedRewardObj?.reward_name ??
            matchedRewardObj?.description ??
            ""
          )
            .toString()
            .trim();
        const matchedPointsValue = matchedRewardRow
          ? matchedRewardRow?.points_used ??
            matchedRewardRow?.redeemed_points ??
            matchedRewardRow?.points_redeemed ??
            matchedRewardRow?.points ??
            null
          : null;

        return {
          ...r,
          row_key: `movement-${r?.id ?? `${r?.product_id}-${r?.created_at}`}`,
          has_sale_redemption: redemptionSaleIds.has(r?.sale_id),
          report_sort_at: saleObj?.sale_date ?? r?.created_at ?? saleObj?.created_at ?? null,
          reason:
            matchedRewardRow && getRowMovementTypeKey(r) === "sale"
              ? buildRedemptionReason(matchedRewardLabel, matchedPointsValue)
              : r?.reason,
          products: productsById.get(r?.product_id) ?? null,
          users: usersById.get(r?.user_id) ?? null,
          sales: saleObj,
        };
      });

      const hydratedRedemptions = rewardRows
        .filter((r) => {
          const key = buildSaleProductKey(r?.sale_id, r?.product_id);
          if (!key) return true;
          return !baseRows.some(
            (baseRow) =>
              getRowMovementTypeKey(baseRow) === "sale" &&
              buildSaleProductKey(baseRow?.sale_id, baseRow?.product_id) === key
          );
        })
        .map((r) => {
        const saleObj = salesById.get(r?.sale_id) ?? null;
        const redeemedProduct = productsById.get(r?.product_id) ?? null;
        const rewardObj = rewardsById.get(r?.reward_id) ?? null;
        const rewardLabel =
          (rewardObj?.name ?? rewardObj?.title ?? rewardObj?.reward_name ?? rewardObj?.description ?? "")
            .toString()
            .trim();
        const pointsValue =
          r?.points_used ?? r?.redeemed_points ?? r?.points_redeemed ?? r?.points ?? null;
        const rawQty = Number(r?.quantity ?? r?.qty ?? r?.pieces ?? r?.pieces_delivered ?? 1);
        const qty = Number.isFinite(rawQty) && rawQty !== 0 ? -Math.abs(rawQty) : -1;

        return {
          ...r,
          row_key: `redemption-${r?.id ?? `${r?.sale_id}-${r?.product_id}-${r?.created_at}`}`,
          has_sale_redemption: redemptionSaleIds.has(r?.sale_id),
          report_sort_at: saleObj?.sale_date ?? r?.created_at ?? saleObj?.created_at ?? null,
          movement_type: "redemption",
          quantity: qty,
          previous_stock: null,
          new_stock: null,
          reason: buildRedemptionReason(rewardLabel, pointsValue),
          products: redeemedProduct,
          display_product_name: redeemedProduct?.name ? null : rewardLabel || null,
          users: usersById.get(r?.user_id) ?? null,
          sales: saleObj,
        };
      });

      setRows(
        [...hydrated, ...hydratedRedemptions].sort(
          (a, b) =>
            new Date(b?.report_sort_at ?? b?.created_at ?? 0).getTime() -
            new Date(a?.report_sort_at ?? a?.created_at ?? 0).getTime()
        )
      );
    } catch (_e) {
      setError("No se pudo cargar el reporte de movimientos.");
      setRows([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    if (!selectedBranchId) return;
    loadMovements();
  }, [selectedBranchId, loadMovements]);

  useEffect(() => {
    let channel = null;
    if (!selectedBranchId) return undefined;

    const queueRefresh = () => {
      if (realtimeRefreshTimerRef.current) {
        window.clearTimeout(realtimeRefreshTimerRef.current);
      }
      realtimeRefreshTimerRef.current = window.setTimeout(() => {
        loadMovements({ silent: true });
      }, 500);
    };

    channel = supabase
      .channel(`movements-report-realtime-${selectedBranchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: INVENTORY_MOVEMENTS_TABLE,
          filter: `branch_id=eq.${selectedBranchId}`,
        },
        queueRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: REWARD_REDEMPTIONS_TABLE,
          filter: `branch_id=eq.${selectedBranchId}`,
        },
        queueRefresh
      )
      .subscribe();

    pollingIntervalRef.current = window.setInterval(() => {
      loadMovements({ silent: true });
    }, REFRESH_INTERVAL_MS);

    return () => {
      if (realtimeRefreshTimerRef.current) {
        window.clearTimeout(realtimeRefreshTimerRef.current);
        realtimeRefreshTimerRef.current = null;
      }
      if (pollingIntervalRef.current) {
        window.clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [selectedBranchId, loadMovements]);

  const selectedBranchLabel = useMemo(() => {
    const current = branchOptions.find((b) => b.id === selectedBranchId);
    if (!current) return selectedBranchId || "—";
    if (current.code) return `${current.name} (${current.code})`;
    return current.name;
  }, [branchOptions, selectedBranchId]);

  const selectedDateValue = useMemo(() => dateKeyToDate(selectedDay), [selectedDay]);
  const currentRange = useMemo(
    () => getDateRangeForPreset(selectedDay, datePreset),
    [selectedDay, datePreset]
  );
  const toggleDatePreset = (preset) => {
    setDatePreset((prev) => (prev === preset ? "day" : preset));
  };

  const rowsForFacets = useMemo(() => {
    const list = Array.isArray(rows) ? rows : [];
    const range = getDateRangeForPreset(selectedDay, datePreset);
    if (!range) return list;
    return list.filter((r) => {
      const v = buildRowView(r);
      const currentKey = v.soldAtDateKey;
      if (!currentKey) return false;
      return currentKey >= range.startKey && currentKey <= range.endKey;
    });
  }, [rows, selectedDay, datePreset]);

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
      const typeValues =
        Array.isArray(v.typeFilterKeys) && v.typeFilterKeys.length > 0
          ? Array.from(new Set(v.typeFilterKeys))
          : [v.typeKey || v.typeLabel];
      typeValues.forEach((typeValue) => add(type, typeValue));
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
    const typeIncludes = (arr, value, label, aliases = []) => {
      if (!arr?.length) return true;
      const candidates = Array.from(new Set([value, label, ...(Array.isArray(aliases) ? aliases : [])]))
        .filter(Boolean);
      return candidates.some((candidate) => arr.includes(candidate));
    };

    return rowsForFacets.filter((r) => {
      const v = buildRowView(r);
      if (!includes(facetFilters.product, v.productName)) return false;
      if (!includes(facetFilters.ticket, v.ticket)) return false;
      if (!typeIncludes(facetFilters.type, v.typeKey, v.typeLabel, v.typeFilterKeys)) return false;
      if (!includes(facetFilters.reason, v.reason)) return false;
      if (!includes(facetFilters.user, v.username)) return false;
      return true;
    });
  }, [rowsForFacets, facetFilters]);

  const handleExportMovements = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("MOVIMIENTOS", {
      views: [{ showGridLines: true }],
    });

    worksheet.columns = [
      { key: "fecha", width: 20 },
      { key: "producto", width: 34 },
      { key: "ticket", width: 14 },
      { key: "tipo", width: 18 },
      { key: "cantidad", width: 12 },
      { key: "anterior", width: 14 },
      { key: "nuevo", width: 14 },
      { key: "motivo", width: 42 },
      { key: "usuario", width: 16 },
    ];

    worksheet.mergeCells("A1:I1");
    const titleCell = worksheet.getCell("A1");
    titleCell.value = "REPORTE DE MOVIMIENTOS";
    titleCell.font = { bold: true, size: 18, name: "Arial" };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getRow(1).height = 28;

    const filterSummary = (values, mapper = (v) => v) =>
      Array.isArray(values) && values.length > 0
        ? values.map(mapper).join(", ")
        : "TODOS";

    const rangeLabel = currentRange
      ? `${formatDateKeyLabel(currentRange.startKey)} - ${formatDateKeyLabel(currentRange.endKey)}`
      : "—";

    const infoRows = [
      ["SUCURSAL", selectedBranchLabel],
      ["MOVIMIENTOS EXPORTADOS", String(filteredRows.length)],
      ["PERIODO", datePreset === "day" ? "DIA" : datePreset === "week" ? "SEMANA" : "MES"],
      ["RANGO", rangeLabel],
      ["FILTRO PRODUCTO", filterSummary(facetFilters.product, (v) => toUpperSafe(v))],
      ["FILTRO TICKET", filterSummary(facetFilters.ticket, (v) => toUpperSafe(v))],
      ["FILTRO TIPO", filterSummary(facetFilters.type, (v) => toUpperSafe(formatMovementType(v)))],
      ["FILTRO MOTIVO", filterSummary(facetFilters.reason, (v) => toUpperSafe(v))],
      ["FILTRO USUARIO", filterSummary(facetFilters.user, (v) => toUpperSafe(v))],
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

    const headerRowNumber = 14;
    const dataStartRow = headerRowNumber + 1;
    worksheet.getRow(headerRowNumber).values = [
      "FECHA",
      "PRODUCTO",
      "TICKET",
      "TIPO",
      "CANTIDAD",
      "STOCK ANTERIOR",
      "NUEVO STOCK",
      "MOTIVO",
      "USUARIO",
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
      const v = buildRowView(row);
      const excelRow = worksheet.getRow(dataStartRow + index);
      const isNoStock = String(v.reason || "").includes("(SIN STOCK)");
      excelRow.values = [
        v.soldAt,
        v.productName,
        v.ticket,
        v.typeLabel,
        v.qty,
        isNoStock || v.prev === null || v.prev === undefined ? "—" : v.prev,
        isNoStock || v.next === null || v.next === undefined ? "—" : v.next,
        v.reason,
        v.username,
      ];

      for (let colNumber = 1; colNumber <= 9; colNumber += 1) {
        const cell = excelRow.getCell(colNumber);
        cell.font = { name: "Arial" };
        cell.border = thinBorder;
        cell.alignment =
          colNumber >= 5 && colNumber <= 7
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
      to: { row: headerRowNumber, column: 9 },
    };

    const branchNameForFile = normalizeFilenameSegment(selectedBranchLabel, "POLIGONO");
    const filename = `MOVIMIENTOS ${branchNameForFile} ${formatDateForFilename()}.xlsx`;
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
        <div className={styles.header}>
          <h1 className={styles.title}>Reporte de movimientos</h1>
          <div className={styles.controls}>
            <div className={styles.controlGroup}>
              <label className={styles.label}>Día</label>
              <div className={styles.dateControls}>
                <DatePicker
                  selected={selectedDateValue}
                  onChange={(date) => {
                    const nextDate = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
                    setSelectedDay(
                      `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}-${String(
                        nextDate.getDate()
                      ).padStart(2, "0")}`
                    );
                    setDatePreset("day");
                  }}
                  dateFormat="dd/MM/yyyy"
                  className={styles.dateInput}
                  calendarClassName={styles.datePickerCalendar}
                  popperClassName={styles.datePickerPopper}
                  wrapperClassName={styles.datePickerWrapper}
                  showPopperArrow={false}
                />
                <div className={styles.quickActions}>
                  <button
                    type="button"
                    className={`${styles.quickButton} ${
                      datePreset === "week" ? styles.quickButtonActive : ""
                    }`}
                    onClick={() => toggleDatePreset("week")}
                  >
                    Semana
                  </button>
                  <button
                    type="button"
                    className={`${styles.quickButton} ${
                      datePreset === "month" ? styles.quickButtonActive : ""
                    }`}
                    onClick={() => toggleDatePreset("month")}
                  >
                    Mes
                  </button>
                </div>
              </div>
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
            <button
              type="button"
              className={styles.exportButton}
              onClick={handleExportMovements}
            >
              Exportar movimientos
            </button>
          </div>
        </div>

        <div className={styles.meta}>Sucursal seleccionada: {selectedBranchLabel}</div>
        {loading && rows.length === 0 ? (
          <div className={styles.info}>Cargando movimientos...</div>
        ) : null}
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
                                    (facetOptions?.[c.key] ?? []).map((o) => o.value),
                                    { close: true }
                                  )
                                }
                              >
                                Todo
                              </button>
                              <button
                                type="button"
                                className={styles.filterMiniButton}
                                onClick={() => clearFacet(c.key, { close: true })}
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
                    <tr key={r?.row_key ?? r?.id ?? `${r?.product_id}-${r?.created_at}`}>
                      <td className={styles.dateCell}>{v.soldAt}</td>
                      <td className={styles.productCell}>{v.productName}</td>
                      <td className={styles.ticketCell}>{v.ticket}</td>
                      <td>{v.typeLabel}</td>
                      <td className={styles.center}>{v.qty}</td>
                      <td className={styles.center}>
                        {String(v.reason || "").includes("(SIN STOCK)") ? "—" : v.prev === null || v.prev === undefined ? "—" : v.prev}
                      </td>
                      <td className={styles.center}>
                        {String(v.reason || "").includes("(SIN STOCK)") ? "—" : v.next === null || v.next === undefined ? "—" : v.next}
                      </td>
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
