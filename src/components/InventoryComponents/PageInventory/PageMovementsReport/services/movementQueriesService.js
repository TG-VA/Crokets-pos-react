import { supabase } from "../../../../../lib/supabaseClient";
import {
  fetchOperationalBranches,
  isOperationalBranch,
} from "../../../../../services/branchScopeService";

import {
  INVENTORY_MOVEMENTS_TABLE,
  MOVEMENTS_PAGE_SIZE,
  MOVEMENTS_CANCELED_SALES_SELECT_KEY,
  MOVEMENTS_PRODUCTS_SELECT_KEY,
  MOVEMENTS_REDEMPTIONS_SELECT_KEY,
  MOVEMENTS_RETURN_ITEMS_SELECT_KEY,
  MOVEMENTS_REWARDS_SELECT_KEY,
  MOVEMENTS_SALE_DETAILS_SELECT_KEY,
  MOVEMENTS_SALE_RETURNS_SELECT_KEY,
  MOVEMENTS_SALES_SELECT_KEY,
  MOVEMENTS_USERS_SELECT_KEY,
  POLI_BRANCH_ID,
  REWARD_REDEMPTIONS_TABLE,
} from "./movementServiceConstants";

import {
  getCachedValue,
  isMissingColumnError,
  isMissingRelationError,
  setCachedValue,
} from "./movementServiceUtils";

// PostgREST corta cada respuesta en 1000 filas sin devolver error. Las
// consultas del periodo se leen por paginas con .range() hasta que una pagina
// llega incompleta, sin tope total: el rango de fechas ya acota el volumen.
export const fetchAllPages = async (buildQuery) => {
  const rows = [];

  for (let from = 0; ; from += MOVEMENTS_PAGE_SIZE) {
    const to = from + MOVEMENTS_PAGE_SIZE - 1;
    const { data, error } = await buildQuery().range(from, to);

    if (error) {
      return { data: null, error };
    }

    const page = Array.isArray(data) ? data : [];
    rows.push(...page);

    if (page.length < MOVEMENTS_PAGE_SIZE) {
      return { data: rows, error: null };
    }
  }
};

const applyDateWindow = (query, column, { startISO, endISO } = {}) => {
  let nextQuery = query;

  if (startISO) {
    nextQuery = nextQuery.gte(column, startISO);
  }

  if (endISO) {
    nextQuery = nextQuery.lt(column, endISO);
  }

  return nextQuery;
};

const buildFallbackBranches = (currentBranch) => {
  const fallbackBranches = [
    {
      id: POLI_BRANCH_ID,
      name: "POLÍGONO",
      code: "",
    },
  ];

  if (
    currentBranch?.id &&
    currentBranch.id !== POLI_BRANCH_ID &&
    isOperationalBranch(currentBranch)
  ) {
    fallbackBranches.push({
      id: currentBranch.id,
      name: currentBranch.name || "Sucursal actual",
      code: currentBranch.code || "",
    });
  }

  return fallbackBranches;
};

export const loadMovementBranches = async ({ currentBranch = null } = {}) => {
  try {
    const { data, error } = await fetchOperationalBranches();

    if (error) {
      throw error;
    }

    const branches = Array.isArray(data) ? data : [];

    const containsPoligono = branches.some(
      (branch) => branch?.id === POLI_BRANCH_ID
    );

    if (containsPoligono) {
      return branches;
    }

    return [
      ...branches,
      {
        id: POLI_BRANCH_ID,
        name: "POLÍGONO",
        code: "",
      },
    ];
  } catch (error) {
    console.error("Error cargando sucursales para movimientos:", error);

    return buildFallbackBranches(currentBranch);
  }
};

export const loadBaseMovements = async ({ branchId, startISO, endISO }) => {
  const buildQuery = () => {
    let query = supabase
      .from(INVENTORY_MOVEMENTS_TABLE)
      .select(
        `
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
      `
      )
      .order("created_at", {
        ascending: false,
      })
      .order("id", {
        ascending: false,
      });

    if (branchId) {
      query = query.eq("branch_id", branchId);
    }

    return applyDateWindow(query, "created_at", { startISO, endISO });
  };

  const response = await fetchAllPages(buildQuery);

  if (response.error) {
    throw response.error;
  }

  return Array.isArray(response.data) ? response.data : [];
};

export const loadRewardRedemptions = async ({ branchId, startISO, endISO }) => {
  const cachedSelect = getCachedValue(MOVEMENTS_REDEMPTIONS_SELECT_KEY);

  const candidates = [
    cachedSelect,

    [
      "id",
      "sale_id",
      "sale_detail_id",
      "customer_id",
      "reward_id",
      "product_id",
      "branch_id",
      "user_id",
      "quantity",
      "points_used",
      "created_at",
    ].join(", "),

    [
      "id",
      "sale_id",
      "sale_detail_id",
      "customer_id",
      "reward_id",
      "product_id",
      "branch_id",
      "user_id",
      "qty",
      "points_used",
      "created_at",
    ].join(", "),

    [
      "id",
      "sale_id",
      "sale_detail_id",
      "customer_id",
      "reward_id",
      "product_id",
      "branch_id",
      "user_id",
      "quantity",
      "redeemed_points",
      "created_at",
    ].join(", "),

    [
      "id",
      "sale_id",
      "sale_detail_id",
      "customer_id",
      "reward_id",
      "product_id",
      "branch_id",
      "user_id",
      "quantity",
      "points_redeemed",
      "created_at",
    ].join(", "),

    [
      "id",
      "sale_id",
      "reward_id",
      "product_id",
      "branch_id",
      "user_id",
      "quantity",
      "created_at",
    ].join(", "),

    [
      "id",
      "sale_id",
      "reward_id",
      "product_id",
      "branch_id",
      "user_id",
      "created_at",
    ].join(", "),

    ["id", "sale_id", "reward_id", "product_id", "branch_id", "user_id"].join(
      ", "
    ),
  ].filter(Boolean);

  for (const selectFields of candidates) {
    const buildQuery = () => {
      let query = supabase
        .from(REWARD_REDEMPTIONS_TABLE)
        .select(selectFields)
        .order("created_at", {
          ascending: false,
        })
        .order("id", {
          ascending: false,
        });

      if (branchId) {
        query = query.eq("branch_id", branchId);
      }

      return applyDateWindow(query, "created_at", { startISO, endISO });
    };

    const response = await fetchAllPages(buildQuery);

    if (!response.error) {
      setCachedValue(MOVEMENTS_REDEMPTIONS_SELECT_KEY, selectFields);

      return Array.isArray(response.data) ? response.data : [];
    }

    if (isMissingColumnError(response.error)) {
      continue;
    }

    if (isMissingRelationError(response.error)) {
      return [];
    }

    throw response.error;
  }

  return [];
};

export const loadProducts = async (productIds) => {
  if (!Array.isArray(productIds) || productIds.length === 0) {
    return [];
  }

  const cachedSelect = getCachedValue(MOVEMENTS_PRODUCTS_SELECT_KEY);

  const candidates = [
    cachedSelect,
    "id, name, barcode, tracks_inventory, is_kit",
    "id, name, barcode, tracks_inventory",
    "id, name, barcode",
    "id, name",
    "id",
  ].filter(Boolean);

  for (const selectFields of candidates) {
    const response = await supabase
      .from("products")
      .select(selectFields)
      .in("id", productIds);

    if (!response.error) {
      setCachedValue(MOVEMENTS_PRODUCTS_SELECT_KEY, selectFields);

      return Array.isArray(response.data) ? response.data : [];
    }

    if (isMissingColumnError(response.error)) {
      continue;
    }

    throw response.error;
  }

  return [];
};

export const loadUsers = async (userIds) => {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return [];
  }

  const cachedSelect = getCachedValue(MOVEMENTS_USERS_SELECT_KEY);

  const candidates = [cachedSelect, "id, username", "id"].filter(Boolean);

  for (const selectFields of candidates) {
    const response = await supabase
      .from("users")
      .select(selectFields)
      .in("id", userIds);

    if (!response.error) {
      setCachedValue(MOVEMENTS_USERS_SELECT_KEY, selectFields);

      return Array.isArray(response.data) ? response.data : [];
    }

    if (isMissingColumnError(response.error)) {
      continue;
    }

    throw response.error;
  }

  return [];
};

const getSalesSelectCandidates = (cachedSelect) => {
  return [
    cachedSelect,
    "id, sale_date, created_at, total, user_id, status",
    "id, sale_date, created_at, total",
    "id, sale_date, ticket_number, created_at, total, user_id, status",
    "id, sale_date, ticket_number, created_at, total",
    "id, sale_date, ticket_number, created_at",
    "id, sale_date, folio, created_at, total",
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
};

export const loadSales = async (saleIds) => {
  if (!Array.isArray(saleIds) || saleIds.length === 0) {
    return [];
  }

  const cachedSelect = getCachedValue(MOVEMENTS_SALES_SELECT_KEY);

  const candidates = getSalesSelectCandidates(cachedSelect);

  for (const selectFields of candidates) {
    const response = await supabase
      .from("sales")
      .select(selectFields)
      .in("id", saleIds);

    if (!response.error) {
      setCachedValue(MOVEMENTS_SALES_SELECT_KEY, selectFields);

      return Array.isArray(response.data) ? response.data : [];
    }

    if (isMissingColumnError(response.error)) {
      continue;
    }

    throw response.error;
  }

  return [];
};

const loadRowsByColumn = async ({
  table,
  selectKey,
  column,
  values,
  candidates,
}) => {
  if (!Array.isArray(values) || values.length === 0) {
    return [];
  }

  const cachedSelect = getCachedValue(selectKey);

  const selectCandidates = [cachedSelect, ...candidates].filter(Boolean);

  for (const selectFields of selectCandidates) {
    const response = await supabase
      .from(table)
      .select(selectFields)
      .in(column, values);

    if (!response.error) {
      setCachedValue(selectKey, selectFields);

      return Array.isArray(response.data) ? response.data : [];
    }

    if (isMissingColumnError(response.error)) {
      continue;
    }

    if (isMissingRelationError(response.error)) {
      return [];
    }

    throw response.error;
  }

  return [];
};

export const loadSalesByBranch = async ({ branchId, startISO, endISO }) => {
  if (!branchId) {
    return [];
  }

  const cachedSelect = getCachedValue(MOVEMENTS_SALES_SELECT_KEY);
  const candidates = getSalesSelectCandidates(cachedSelect);

  for (const selectFields of candidates) {
    const response = await fetchAllPages(() =>
      applyDateWindow(
        supabase
          .from("sales")
          .select(selectFields)
          .eq("branch_id", branchId)
          .order("sale_date", { ascending: false })
          .order("id", { ascending: false }),
        "sale_date",
        { startISO, endISO }
      )
    );

    if (!response.error) {
      setCachedValue(MOVEMENTS_SALES_SELECT_KEY, selectFields);
      return Array.isArray(response.data) ? response.data : [];
    }

    if (isMissingColumnError(response.error)) {
      continue;
    }

    throw response.error;
  }

  return [];
};

export const loadSaleDetailsBySales = (saleIds) =>
  loadRowsByColumn({
    table: "sale_details",
    selectKey: MOVEMENTS_SALE_DETAILS_SELECT_KEY,
    column: "sale_id",
    values: saleIds,
    candidates: ["id, sale_id, product_id, branch_id, quantity"],
  });

export const loadCanceledSalesBySales = (saleIds) =>
  loadRowsByColumn({
    table: "canceled_sales",
    selectKey: MOVEMENTS_CANCELED_SALES_SELECT_KEY,
    column: "sale_id",
    values: saleIds,
    candidates: [
      "id, sale_id, user_id, branch_id, cancel_reason, canceled_at, created_at",
      "id, sale_id, user_id, cancel_reason, created_at",
      "id, sale_id, created_at",
    ],
  });

export const loadSaleReturnsBySales = (saleIds) =>
  loadRowsByColumn({
    table: "sale_returns",
    selectKey: MOVEMENTS_SALE_RETURNS_SELECT_KEY,
    column: "sale_id",
    values: saleIds,
    candidates: [
      "id, sale_id, user_id, branch_id, return_reason, created_at",
      "id, sale_id, created_at",
      "id, sale_id",
    ],
  });

export const loadReturnItemsByReturns = (returnIds) =>
  loadRowsByColumn({
    table: "sale_return_items",
    selectKey: MOVEMENTS_RETURN_ITEMS_SELECT_KEY,
    column: "return_id",
    values: returnIds,
    candidates: [
      "id, return_id, sale_detail_id, product_id, quantity, created_at",
      "id, return_id, product_id, quantity",
    ],
  });

export const loadRewards = async (rewardIds) => {
  if (!Array.isArray(rewardIds) || rewardIds.length === 0) {
    return [];
  }

  const cachedSelect = getCachedValue(MOVEMENTS_REWARDS_SELECT_KEY);

  const candidates = [
    cachedSelect,
    "id, name",
    "id, title",
    "id, reward_name",
    "id, description",
    "id",
  ].filter(Boolean);

  for (const selectFields of candidates) {
    const response = await supabase
      .from("rewards")
      .select(selectFields)
      .in("id", rewardIds);

    if (!response.error) {
      setCachedValue(MOVEMENTS_REWARDS_SELECT_KEY, selectFields);

      return Array.isArray(response.data) ? response.data : [];
    }

    if (isMissingColumnError(response.error)) {
      continue;
    }

    if (isMissingRelationError(response.error)) {
      return [];
    }

    throw response.error;
  }

  return [];
};
