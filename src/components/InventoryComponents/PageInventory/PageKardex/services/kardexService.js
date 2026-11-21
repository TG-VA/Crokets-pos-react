import { supabase } from "../../../../../lib/supabaseClient";
import {
  DEFAULT_PAGE_SIZE,
  fetchAllPages,
} from "../../../../../services/supabase/paginatedQuery";
import { sortKardexMovementsByDateDesc } from "../utils/kardexMovementUtils";

export const KARDEX_MOVEMENTS_TABLE = "inventory_movements";

const normalizeDateKey = (value) => {
  const normalizedValue = String(value ?? "").trim();

  return /^\d{4}-\d{2}-\d{2}$/.test(normalizedValue) ? normalizedValue : "";
};

export const buildKardexIsoRange = ({ dateFrom, dateTo } = {}) => {
  const normalizedFrom = normalizeDateKey(dateFrom);

  const normalizedTo = normalizeDateKey(dateTo);

  const range = {};

  if (normalizedFrom) {
    const startDate = new Date(`${normalizedFrom}T00:00:00`);

    if (!Number.isNaN(startDate.getTime())) {
      range.fromIso = startDate.toISOString();
    }
  }

  if (normalizedTo) {
    const endDate = new Date(`${normalizedTo}T23:59:59.999`);

    if (!Number.isNaN(endDate.getTime())) {
      range.toIso = endDate.toISOString();
    }
  }

  return range;
};

export const validateKardexDateRange = ({ dateFrom, dateTo } = {}) => {
  const normalizedFrom = normalizeDateKey(dateFrom);

  const normalizedTo = normalizeDateKey(dateTo);

  if (normalizedFrom && normalizedTo && normalizedFrom > normalizedTo) {
    return {
      valid: false,
      message: "La fecha Desde no puede ser posterior a la fecha Hasta.",
    };
  }

  return {
    valid: true,
    message: "",
  };
};

const KARDEX_MOVEMENT_COLUMNS = [
  "id",
  "product_id",
  "movement_type",
  "quantity",
  "previous_stock",
  "new_stock",
  "reason",
  "sale_id",
  "user_id",
  "branch_id",
  "related_branch_id",
];

const KARDEX_COST_COLUMNS = ["unit_cost", "total_cost"];

/* Codigo de Postgres para undefined_column (42P01 es undefined_table). */
const KARDEX_UNDEFINED_COLUMN_ERROR_CODE = "42703";

/**
 * Arma el select de movimientos. Las columnas de valuacion se pueden omitir
 * para el reintento que degrada la vista a un kardex sin costos.
 */
const buildKardexMovementsSelect = (includeCostColumns) => {
  const columns = [
    ...KARDEX_MOVEMENT_COLUMNS,
    ...(includeCostColumns ? KARDEX_COST_COLUMNS : []),
    "created_at",
  ];

  return columns.map((column) => `        ${column}`).join(",\n");
};

/**
 * Detecta el fallo de una base sin las columnas de valuacion. Cubre el codigo
 * de Postgres y el texto del mensaje, igual que hace la escritura de
 * movimientos en inventoryMovements.js.
 */
const isMissingCostColumnError = (error) => {
  if (!error) {
    return false;
  }

  if (error.code === KARDEX_UNDEFINED_COLUMN_ERROR_CODE) {
    return true;
  }

  const message = String(error.message ?? "").toLowerCase();

  return (
    message.includes("column") &&
    (message.includes("does not exist") || message.includes("not found"))
  );
};

const mapRowsWithoutCostColumns = (data) =>
  (Array.isArray(data) ? data : []).map((row) => ({
    ...row,
    unit_cost: null,
    total_cost: null,
  }));

/**
 * Lee todos los movimientos del producto en la sucursal. PostgREST corta cada
 * respuesta en 1000 filas, asi que la consulta se pagina con un cursor sobre id;
 * el orden por fecha se aplica en memoria al terminar.
 */
const runKardexMovementsQuery = async ({
  productId,
  branchId,
  dateFrom,
  dateTo,
  pageSize,
  includeCostColumns,
}) => {
  const { fromIso, toIso } = buildKardexIsoRange({
    dateFrom,
    dateTo,
  });

  const buildQuery = () => {
    let query = supabase
      .from(KARDEX_MOVEMENTS_TABLE)
      .select(buildKardexMovementsSelect(includeCostColumns))
      .eq("product_id", productId)
      .eq("branch_id", branchId);

    if (fromIso) {
      query = query.gte("created_at", fromIso);
    }

    if (toIso) {
      query = query.lte("created_at", toIso);
    }

    return query;
  };

  return fetchAllPages(buildQuery, { pageSize });
};

export const loadKardexMovements = async ({
  productId,
  branchId,
  dateFrom = "",
  dateTo = "",
  pageSize = DEFAULT_PAGE_SIZE,
}) => {
  if (!productId) {
    return [];
  }

  if (!branchId) {
    throw new Error("No se pudo identificar la sucursal del kardex.");
  }

  const rangeValidation = validateKardexDateRange({
    dateFrom,
    dateTo,
  });

  if (!rangeValidation.valid) {
    throw new Error(rangeValidation.message);
  }

  const queryArgs = { productId, branchId, dateFrom, dateTo, pageSize };

  const { data, error } = await runKardexMovementsQuery({
    ...queryArgs,
    includeCostColumns: true,
  });

  if (!error) {
    return sortKardexMovementsByDateDesc(data);
  }

  if (!isMissingCostColumnError(error)) {
    throw error;
  }

  /*
   * La base no tiene las columnas de valuacion: se reintenta sin ellas para no
   * perder el resto del kardex. Los costos se fuerzan a null para que la tabla
   * y el exportador los representen con el guion largo en lugar de tratar un
   * dato ausente como un costo real.
   */
  console.error(
    "kardex: unit_cost/total_cost no existen en inventory_movements, se reintenta sin valuacion:",
    error
  );

  const retry = await runKardexMovementsQuery({
    ...queryArgs,
    includeCostColumns: false,
  });

  if (retry.error) {
    throw retry.error;
  }

  return sortKardexMovementsByDateDesc(mapRowsWithoutCostColumns(retry.data));
};
