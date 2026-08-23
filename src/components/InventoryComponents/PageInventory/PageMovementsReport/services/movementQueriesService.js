import { supabase } from "../../../../../lib/supabaseClient";

import {
  INVENTORY_MOVEMENTS_TABLE,
  MOVEMENTS_PRODUCTS_SELECT_KEY,
  MOVEMENTS_REDEMPTIONS_SELECT_KEY,
  MOVEMENTS_REWARDS_SELECT_KEY,
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

const buildFallbackBranches = (
  currentBranch
) => {
  const fallbackBranches = [
    {
      id: POLI_BRANCH_ID,
      name: "POLÍGONO",
      code: "",
    },
  ];

  if (
    currentBranch?.id &&
    currentBranch.id !== POLI_BRANCH_ID
  ) {
    fallbackBranches.push({
      id: currentBranch.id,
      name:
        currentBranch.name ||
        "Sucursal actual",
      code:
        currentBranch.code || "",
    });
  }

  return fallbackBranches;
};

export const loadMovementBranches =
  async ({
    currentBranch = null,
  } = {}) => {
    try {
      const { data, error } =
        await supabase
          .from("branches")
          .select("id, name, code")
          .order("name", {
            ascending: true,
          });

      if (error) {
        throw error;
      }

      const branches =
        Array.isArray(data)
          ? data
          : [];

      const containsPoligono =
        branches.some(
          (branch) =>
            branch?.id ===
            POLI_BRANCH_ID
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
      console.error(
        "Error cargando sucursales para movimientos:",
        error
      );

      return buildFallbackBranches(
        currentBranch
      );
    }
  };

const INVENTORY_MOVEMENTS_TABLE_CANDIDATES = [
  "inventory_movements",
  "inventory_movement",
  "stock_movements",
  "inventory_movements_log",
];

const buildBaseMovementsQuery = (tableName, { branchId, maxMovements }) => {
  let query = supabase
    .from(tableName)
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
    .order("created_at", {
      ascending: false,
    })
    .limit(maxMovements);

  if (branchId) {
    query = query.eq("branch_id", branchId);
  }

  return query;
};

export const loadBaseMovements =
  async ({
    branchId,
    maxMovements,
  }) => {
    let lastError = null;

    for (const tableName of INVENTORY_MOVEMENTS_TABLE_CANDIDATES) {
      try {
        const query = buildBaseMovementsQuery(tableName, {
          branchId,
          maxMovements,
        });

        const response = await query;

        if (response && response.error) {
          if (isMissingRelationError(response.error, tableName)) {
            lastError = response.error;
            continue;
          }
          throw response.error;
        }

        return Array.isArray(response?.data) ? response.data : [];
      } catch (err) {
        if (isMissingRelationError(err, tableName)) {
          lastError = err;
          continue;
        }
        throw err;
      }
    }

    if (lastError) {
      throw lastError;
    }

    return [];
  };

export const loadRewardRedemptions =
  async ({
    branchId,
    maxMovements,
  }) => {
    const cachedSelect =
      getCachedValue(
        MOVEMENTS_REDEMPTIONS_SELECT_KEY
      );

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

      [
        "id",
        "sale_id",
        "reward_id",
        "product_id",
        "branch_id",
        "user_id",
      ].join(", "),
    ].filter(Boolean);

    for (
      const selectFields of candidates
    ) {
      let query = supabase
        .from(
          REWARD_REDEMPTIONS_TABLE
        )
        .select(selectFields)
        .order("created_at", {
          ascending: false,
        })
        .limit(maxMovements);

      if (branchId) {
        query = query.eq(
          "branch_id",
          branchId
        );
      }

      const response = await query;

      if (!response.error) {
        setCachedValue(
          MOVEMENTS_REDEMPTIONS_SELECT_KEY,
          selectFields
        );

        return Array.isArray(
          response.data
        )
          ? response.data
          : [];
      }

      if (
        isMissingColumnError(
          response.error
        )
      ) {
        continue;
      }

      if (
        isMissingRelationError(
          response.error
        )
      ) {
        return [];
      }

      throw response.error;
    }

    return [];
  };

export const loadProducts = async (
  productIds
) => {
  if (
    !Array.isArray(productIds) ||
    productIds.length === 0
  ) {
    return [];
  }

  const cachedSelect =
    getCachedValue(
      MOVEMENTS_PRODUCTS_SELECT_KEY
    );

  const candidates = [
    cachedSelect,
    "id, name, barcode",
    "id, name",
    "id",
  ].filter(Boolean);

  for (
    const selectFields of candidates
  ) {
    const response = await supabase
      .from("products")
      .select(selectFields)
      .in("id", productIds);

    if (!response.error) {
      setCachedValue(
        MOVEMENTS_PRODUCTS_SELECT_KEY,
        selectFields
      );

      return Array.isArray(
        response.data
      )
        ? response.data
        : [];
    }

    if (
      isMissingColumnError(
        response.error
      )
    ) {
      continue;
    }

    throw response.error;
  }

  return [];
};

export const loadUsers = async (
  userIds
) => {
  if (
    !Array.isArray(userIds) ||
    userIds.length === 0
  ) {
    return [];
  }

  const cachedSelect =
    getCachedValue(
      MOVEMENTS_USERS_SELECT_KEY
    );

  const candidates = [
    cachedSelect,
    "id, username",
    "id",
  ].filter(Boolean);

  for (
    const selectFields of candidates
  ) {
    const response = await supabase
      .from("users")
      .select(selectFields)
      .in("id", userIds);

    if (!response.error) {
      setCachedValue(
        MOVEMENTS_USERS_SELECT_KEY,
        selectFields
      );

      return Array.isArray(
        response.data
      )
        ? response.data
        : [];
    }

    if (
      isMissingColumnError(
        response.error
      )
    ) {
      continue;
    }

    throw response.error;
  }

  return [];
};

export const loadSales = async (
  saleIds
) => {
  if (
    !Array.isArray(saleIds) ||
    saleIds.length === 0
  ) {
    return [];
  }

  const cachedSelect =
    getCachedValue(
      MOVEMENTS_SALES_SELECT_KEY
    );

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

  for (
    const selectFields of candidates
  ) {
    const response = await supabase
      .from("sales")
      .select(selectFields)
      .in("id", saleIds);

    if (!response.error) {
      setCachedValue(
        MOVEMENTS_SALES_SELECT_KEY,
        selectFields
      );

      return Array.isArray(
        response.data
      )
        ? response.data
        : [];
    }

    if (
      isMissingColumnError(
        response.error
      )
    ) {
      continue;
    }

    throw response.error;
  }

  return [];
};

export const loadRewards = async (
  rewardIds
) => {
  if (
    !Array.isArray(rewardIds) ||
    rewardIds.length === 0
  ) {
    return [];
  }

  const cachedSelect =
    getCachedValue(
      MOVEMENTS_REWARDS_SELECT_KEY
    );

  const candidates = [
    cachedSelect,
    "id, name",
    "id, title",
    "id, reward_name",
    "id, description",
    "id",
  ].filter(Boolean);

  for (
    const selectFields of candidates
  ) {
    const response = await supabase
      .from("rewards")
      .select(selectFields)
      .in("id", rewardIds);

    if (!response.error) {
      setCachedValue(
        MOVEMENTS_REWARDS_SELECT_KEY,
        selectFields
      );

      return Array.isArray(
        response.data
      )
        ? response.data
        : [];
    }

    if (
      isMissingColumnError(
        response.error
      )
    ) {
      continue;
    }

    if (
      isMissingRelationError(
        response.error
      )
    ) {
      return [];
    }

    throw response.error;
  }

  return [];
};