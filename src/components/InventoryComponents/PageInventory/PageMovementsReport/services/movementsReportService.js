import { supabase } from "../../../../../lib/supabaseClient";
import {
  fetchOperationalBranches,
  isOperationalBranch,
} from "../../../../../services/branchScopeService";

import {
  IN_FILTER_BATCH_SIZE,
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
  createEntityMap,
  getCachedValue,
  getUniqueIds,
  isMissingColumnError,
  isMissingRelationError,
  setCachedValue,
  sortMovementsByDate,
} from "./movementServiceUtils";

import { getServerDateWindow } from "../utils/movementDateUtils";

import {
  buildNoStockRows,
  hydrateBaseMovements,
  hydrateMissingRedemptions,
} from "./movementsCalculationService";

// PostgREST corta cada respuesta en 1000 filas sin devolver error. Las
// consultas se leen por paginas con un cursor sobre id (keyset): cada pagina
// pide las filas con id mayor al ultimo leido, hasta que una llega incompleta.
// A diferencia de .range(), un insert o un borrado entre paginas no repite ni
// salta filas. El orden de lectura no importa: el reporte se ordena al final.
export const fetchAllPages = async (buildQuery) => {
  const rows = [];
  let lastId = null;

  for (;;) {
    let query = buildQuery().order("id", { ascending: true });

    if (lastId !== null) {
      query = query.gt("id", lastId);
    }

    const { data, error } = await query.limit(MOVEMENTS_PAGE_SIZE);

    if (error) {
      return { data: null, error };
    }

    const page = Array.isArray(data) ? data : [];
    rows.push(...page);

    const nextId = page[page.length - 1]?.id;

    if (page.length < MOVEMENTS_PAGE_SIZE) {
      return { data: rows, error: null };
    }

    // Sin id no hay cursor: cortar aqui devolveria datos truncados como exito.
    if (nextId === undefined || nextId === null) {
      return {
        data: null,
        error: new Error("fetchAllPages: fila sin id, no se puede paginar"),
      };
    }

    lastId = nextId;
  }
};

// Un .in() con miles de UUID rebasa el largo maximo de URL, y un lote con mas
// de 1000 coincidencias choca con el tope de filas. Los ids se parten en lotes
// y cada lote se pagina; el primer error corta la lectura completa.
export const fetchByIdsInBatches = async (values, buildQuery) => {
  const batches = [];

  for (let start = 0; start < values.length; start += IN_FILTER_BATCH_SIZE) {
    batches.push(values.slice(start, start + IN_FILTER_BATCH_SIZE));
  }

  const results = await Promise.all(
    batches.map((batch) => fetchAllPages(() => buildQuery(batch)))
  );

  const failed = results.find((result) => result.error);

  if (failed) {
    return { data: null, error: failed.error };
  }

  return { data: results.flatMap((result) => result.data), error: null };
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
    let query = supabase.from(INVENTORY_MOVEMENTS_TABLE).select(
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
    );

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
      let query = supabase.from(REWARD_REDEMPTIONS_TABLE).select(selectFields);

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
    const response = await fetchByIdsInBatches(productIds, (batch) =>
      supabase.from("products").select(selectFields).in("id", batch)
    );

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
    const response = await fetchByIdsInBatches(userIds, (batch) =>
      supabase.from("users").select(selectFields).in("id", batch)
    );

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
    const response = await fetchByIdsInBatches(saleIds, (batch) =>
      supabase.from("sales").select(selectFields).in("id", batch)
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
    const response = await fetchByIdsInBatches(values, (batch) =>
      supabase.from(table).select(selectFields).in(column, batch)
    );

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
        supabase.from("sales").select(selectFields).eq("branch_id", branchId),
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
    const response = await fetchByIdsInBatches(rewardIds, (batch) =>
      supabase.from("rewards").select(selectFields).in("id", batch)
    );

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

export const loadMovementsReport = async ({
  branchId,
  startDateKey,
  endDateKey,
}) => {
  const dateWindow = getServerDateWindow(startDateKey, endDateKey);

  // Sin ventana valida no se consulta: leer sin filtro traeria todo el historial.
  if (!dateWindow) {
    return [];
  }

  const [baseRows, rewardRows, standaloneSales] = await Promise.all([
    loadBaseMovements({
      branchId,
      ...dateWindow,
    }),

    loadRewardRedemptions({
      branchId,
      ...dateWindow,
    }),

    loadSalesByBranch({
      branchId,
      ...dateWindow,
    }),
  ]);

  const allRows = [...baseRows, ...rewardRows];

  const userIds = Array.from(
    new Set([
      ...getUniqueIds(allRows, "user_id"),
      ...getUniqueIds(standaloneSales, "user_id"),
    ])
  );

  const saleIds = Array.from(
    new Set([
      ...getUniqueIds(allRows, "sale_id"),
      ...getUniqueIds(standaloneSales, "id"),
    ])
  );

  const rewardIds = getUniqueIds(rewardRows, "reward_id");

  const saleDetails = await loadSaleDetailsBySales(saleIds);

  const productIds = Array.from(
    new Set([
      ...getUniqueIds(allRows, "product_id"),
      ...getUniqueIds(saleDetails, "product_id"),
    ])
  );

  const [products, users, sales, rewards, canceledSales, saleReturns] =
    await Promise.all([
      loadProducts(productIds),
      loadUsers(userIds),
      loadSales(saleIds),
      loadRewards(rewardIds),
      loadCanceledSalesBySales(saleIds),
      loadSaleReturnsBySales(saleIds),
    ]);

  const returnItems = await loadReturnItemsByReturns(
    getUniqueIds(saleReturns, "id")
  );

  const productsById = createEntityMap(products);

  const usersById = createEntityMap(users);

  const salesById = createEntityMap(sales);

  const rewardsById = createEntityMap(rewards);

  const hydratedMovements = hydrateBaseMovements({
    baseRows,
    rewardRows,
    productsById,
    usersById,
    salesById,
    rewardsById,
  });

  const hydratedRedemptions = hydrateMissingRedemptions({
    baseRows,
    rewardRows,
    productsById,
    usersById,
    salesById,
    rewardsById,
  });

  const existingSaleProductKeys = new Set(
    baseRows
      .filter(
        (row) => String(row?.movement_type ?? "").toLowerCase() === "sale"
      )
      .map((row) => `${row?.sale_id}::${row?.product_id}`)
  );

  const noStockRows = buildNoStockRows({
    saleDetails,
    canceledSales,
    saleReturns,
    returnItems,
    productsById,
    usersById,
    salesById,
    existingSaleProductKeys,
  });

  return sortMovementsByDate([
    ...hydratedMovements,
    ...hydratedRedemptions,
    ...noStockRows,
  ]);
};
