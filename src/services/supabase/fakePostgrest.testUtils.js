import { vi } from "vitest";

/*
  Doble de supabase.from() para tests de paginacion. Responde como PostgREST:
  aplica eq/in/gte/lte/gt, ordena por los .order() en el orden recibido y corta
  cada respuesta en maxRows aunque se pida un .limit() mayor. Los filtros con
  punto ("products.status") se resuelven sobre el embed de la fila.
*/

const readPath = (row, column) =>
  column.split(".").reduce((value, key) => value?.[key], row);

const compareValues = (left, right) => {
  if (left === right) return 0;
  if (left === null || left === undefined) return 1;
  if (right === null || right === undefined) return -1;
  return left < right ? -1 : 1;
};

const createQuery = (rows, { maxRows, calls, table }) => {
  const filters = [];
  const orders = [];
  const call = { table, select: null, filters, orders, limit: null };
  let limit = null;

  const addFilter = (test) => (column, value) => {
    filters.push({ column, value, test });
    return query;
  };

  const run = () => {
    calls.push(call);

    const matches = rows
      .filter((row) =>
        filters.every(({ column, value, test }) =>
          test(readPath(row, column), value)
        )
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

    return Promise.resolve({ data: matches.slice(0, cap), error: null });
  };

  const query = {
    select: (columns) => {
      call.select = columns;
      return query;
    },
    eq: addFilter((actual, expected) => actual === expected),
    in: addFilter((actual, expected) => expected.includes(actual)),
    gte: addFilter((actual, expected) => actual >= expected),
    lte: addFilter((actual, expected) => actual <= expected),
    gt: addFilter((actual, expected) => actual > expected),
    order: (column, { ascending = true } = {}) => {
      orders.push({ column, ascending });
      return query;
    },
    limit: (count) => {
      limit = count;
      call.limit = count;
      return query;
    },
    single: () =>
      run().then(({ data }) => ({ data: data[0] ?? null, error: null })),
    then: (onFulfilled, onRejected) => run().then(onFulfilled, onRejected),
  };

  return query;
};

export const createFakePostgrest = (tables, { maxRows = 2 } = {}) => {
  const calls = [];

  const from = vi.fn((table) => {
    if (!tables[table]) {
      throw new Error(`Tabla inesperada: ${table}`);
    }
    return createQuery(tables[table], { maxRows, calls, table });
  });

  return { from, calls };
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
  fetchByIdsInBatches: (values, buildQuery, options = {}) =>
    actual.fetchByIdsInBatches(values, buildQuery, {
      ...options,
      pageSize: size,
      batchSize: size,
    }),
});
