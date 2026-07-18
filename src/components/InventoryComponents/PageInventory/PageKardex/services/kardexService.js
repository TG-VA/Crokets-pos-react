import { supabase } from "../../../../../lib/supabaseClient";

export const KARDEX_MOVEMENTS_TABLE =
  "inventory_movements";

export const DEFAULT_KARDEX_LIMIT =
  1000;

const normalizeDateKey = (
  value
) => {
  const normalizedValue =
    String(value ?? "").trim();

  return /^\d{4}-\d{2}-\d{2}$/.test(
    normalizedValue
  )
    ? normalizedValue
    : "";
};

export const buildKardexIsoRange = ({
  dateFrom,
  dateTo,
} = {}) => {
  const normalizedFrom =
    normalizeDateKey(
      dateFrom
    );

  const normalizedTo =
    normalizeDateKey(
      dateTo
    );

  const range = {};

  if (normalizedFrom) {
    const startDate =
      new Date(
        `${normalizedFrom}T00:00:00`
      );

    if (
      !Number.isNaN(
        startDate.getTime()
      )
    ) {
      range.fromIso =
        startDate.toISOString();
    }
  }

  if (normalizedTo) {
    const endDate =
      new Date(
        `${normalizedTo}T23:59:59.999`
      );

    if (
      !Number.isNaN(
        endDate.getTime()
      )
    ) {
      range.toIso =
        endDate.toISOString();
    }
  }

  return range;
};

export const validateKardexDateRange = ({
  dateFrom,
  dateTo,
} = {}) => {
  const normalizedFrom =
    normalizeDateKey(
      dateFrom
    );

  const normalizedTo =
    normalizeDateKey(
      dateTo
    );

  if (
    normalizedFrom &&
    normalizedTo &&
    normalizedFrom >
      normalizedTo
  ) {
    return {
      valid: false,
      message:
        "La fecha Desde no puede ser posterior a la fecha Hasta.",
    };
  }

  return {
    valid: true,
    message: "",
  };
};

export const loadKardexMovements =
  async ({
    productId,
    branchId,
    dateFrom = "",
    dateTo = "",
    limit =
      DEFAULT_KARDEX_LIMIT,
  }) => {
    if (!productId) {
      return [];
    }

    if (!branchId) {
      throw new Error(
        "No se pudo identificar la sucursal del kardex."
      );
    }

    const rangeValidation =
      validateKardexDateRange({
        dateFrom,
        dateTo,
      });

    if (!rangeValidation.valid) {
      throw new Error(
        rangeValidation.message
      );
    }

    let query = supabase
      .from(
        KARDEX_MOVEMENTS_TABLE
      )
      .select(`
        id,
        product_id,
        movement_type,
        quantity,
        previous_stock,
        new_stock,
        reason,
        sale_id,
        user_id,
        branch_id,
        related_branch_id,
        created_at
      `)
      .eq(
        "product_id",
        productId
      )
      .eq(
        "branch_id",
        branchId
      )
      .order(
        "created_at",
        {
          ascending: false,
          nullsFirst: false,
        }
      )
      .limit(limit);

    const {
      fromIso,
      toIso,
    } = buildKardexIsoRange({
      dateFrom,
      dateTo,
    });

    if (fromIso) {
      query = query.gte(
        "created_at",
        fromIso
      );
    }

    if (toIso) {
      query = query.lte(
        "created_at",
        toIso
      );
    }

    const {
      data,
      error,
    } = await query;

    if (error) {
      throw error;
    }

    return Array.isArray(data)
      ? data
      : [];
  };