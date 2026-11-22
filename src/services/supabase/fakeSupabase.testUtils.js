import { vi } from "vitest";

/*
  Doble de supabase para tests de paginacion de reportes. Responde como
  PostgREST: aplica los filtros, ordena por los .order() en el orden recibido y
  corta cada respuesta en maxRows aunque se pida un .limit() mayor. Los filtros
  con punto ("sales.status") se resuelven sobre el embed de la fila. Las RPC
  devuelven sus filas fijas y admiten .order() y .range() como una tabla.
*/

const readPath = (row, column) =>
  column.split(".").reduce((value, key) => value?.[key], row);

const compareValues = (left, right) => {
  if (left === right) return 0;
  if (left === null || left === undefined) return 1;
  if (right === null || right === undefined) return -1;
  return left < right ? -1 : 1;
};

// Convierte '("a","b")' de .not(col, "in", ...) en ["a", "b"].
const parseInList = (value) =>
  String(value)
    .replace(/^\(|\)$/g, "")
    .split(",")
    .map((item) => item.trim().replace(/^"|"$/g, ""));

const testOperator = (operator, actual, expected) => {
  switch (operator) {
    case "eq":
      return actual === expected;
    case "neq":
      return actual !== expected;
    case "in":
      return expected.includes(actual);
    case "gt":
      return actual > expected;
    case "gte":
      return actual >= expected;
    case "lt":
      return actual < expected;
    case "lte":
      return actual <= expected;
    case "is":
      return expected === null
        ? actual === null || actual === undefined
        : actual === expected;
    case "ilike": {
      const pattern = String(expected).toLowerCase().replaceAll("%", "");
      return String(actual ?? "")
        .toLowerCase()
        .includes(pattern);
    }
    default:
      throw new Error(`Operador no soportado en el doble: ${operator}`);
  }
};

const createQuery = (rows, { maxRows, calls, name }) => {
  const filters = [];
  const orders = [];
  const call = { name, select: null, args: null, filters, orders, limit: null };
  let limit = null;
  let offset = 0;

  const addFilter =
    (operator, negate = false) =>
    (column, value) => {
      filters.push({ column, operator, value, negate });
      return query;
    };

  const run = () => {
    calls.push(call);

    const matches = rows
      .filter((row) =>
        filters.every(({ column, operator, value, negate }) => {
          const result = testOperator(operator, readPath(row, column), value);
          return negate ? !result : result;
        })
      )
      .sort((left, right) => {
        for (const { column, ascending } of orders) {
          const result = compareValues(
            readPath(left, column),
            readPath(right, column)
          );
          if (result !== 0) return ascending ? result : -result;
        }
        return 0;
      });

    const cap = Math.min(limit ?? Infinity, maxRows);

    return Promise.resolve({
      data: matches.slice(offset, offset + cap),
      error: null,
    });
  };

  const query = {
    select: (columns) => {
      call.select = columns;
      return query;
    },
    eq: addFilter("eq"),
    neq: addFilter("neq"),
    in: addFilter("in"),
    gt: addFilter("gt"),
    gte: addFilter("gte"),
    lt: addFilter("lt"),
    lte: addFilter("lte"),
    is: addFilter("is"),
    ilike: addFilter("ilike"),
    not: (column, operator, value) =>
      addFilter(operator, true)(
        column,
        operator === "in" ? parseInList(value) : value
      ),
    order: (column, { ascending = true } = {}) => {
      orders.push({ column, ascending });
      return query;
    },
    limit: (count) => {
      limit = count;
      call.limit = count;
      return query;
    },
    range: (from, to) => {
      offset = from;
      limit = to - from + 1;
      call.range = [from, to];
      return query;
    },
    then: (onFulfilled, onRejected) => run().then(onFulfilled, onRejected),
  };

  return { query, call };
};

export const createFakeSupabase = (
  { tables = {}, rpcs = {} } = {},
  { maxRows = 2 } = {}
) => {
  const calls = [];

  const from = vi.fn((table) => {
    if (!tables[table]) {
      throw new Error(`Tabla inesperada: ${table}`);
    }
    return createQuery(tables[table], { maxRows, calls, name: table }).query;
  });

  const rpc = vi.fn((name, args) => {
    if (!rpcs[name]) {
      throw new Error(`RPC inesperada: ${name}`);
    }
    const { query, call } = createQuery(rpcs[name], {
      maxRows,
      calls,
      name,
    });
    call.args = args;
    return query;
  });

  return { from, rpc, calls };
};

// Ids con relleno para que el orden de texto coincida con el numerico.
export const buildId = (prefix, index) =>
  `${prefix}-${String(index).padStart(4, "0")}`;

// Para vi.mock de paginatedQuery: fuerza paginas y lotes chicos que coincidan
// con el maxRows del doble, asi pocas filas simulan varias paginas.
export const withSmallPages = (actual, size = 2) => ({
  ...actual,
  fetchAllPages: (buildQuery, options = {}) =>
    actual.fetchAllPages(buildQuery, { ...options, pageSize: size }),
  fetchAllRpcPages: (buildRpc, options = {}) =>
    actual.fetchAllRpcPages(buildRpc, { ...options, pageSize: size }),
  fetchByIdsInBatches: (values, buildQuery, options = {}) =>
    actual.fetchByIdsInBatches(values, buildQuery, {
      ...options,
      pageSize: size,
      batchSize: size,
    }),
});
