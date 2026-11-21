import { describe, expect, it } from "vitest";

import {
  DEFAULT_IN_FILTER_BATCH_SIZE,
  DEFAULT_PAGE_SIZE,
  fetchAllPages,
  fetchByIdsInBatches,
} from "./paginatedQuery";

/*
  Las consultas son dobles que responden como PostgREST: filtran por .gt e .in,
  ordenan por id y cortan en .limit. Un pageSize chico evita crear 1000 filas.
*/

const buildRows = (count, prefix = "r") =>
  Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${String(index).padStart(5, "0")}`,
  }));

const createSource = (getRows, { errorOnCall = null, error = null } = {}) => {
  const calls = [];

  const buildQuery = (batch = null) => {
    let cursor = null;
    const query = {
      order: () => query,
      gt: (_column, value) => {
        cursor = value;
        return query;
      },
      limit: (count) => {
        calls.push({ batch, cursor, count });
        if (calls.length === errorOnCall) {
          return Promise.resolve({ data: null, error });
        }
        const page = getRows()
          .filter((row) => batch === null || batch.includes(row.id))
          .filter((row) => cursor === null || row.id > cursor)
          .sort((left, right) =>
            String(left.id).localeCompare(String(right.id))
          )
          .slice(0, count);
        return Promise.resolve({ data: page, error: null });
      },
    };
    return query;
  };

  return { buildQuery, calls };
};

describe("fetchAllPages", () => {
  it("usa paginas de 1000 por defecto", async () => {
    const { buildQuery, calls } = createSource(() => buildRows(3));

    const result = await fetchAllPages(buildQuery);

    expect(DEFAULT_PAGE_SIZE).toBe(1000);
    expect(result).toEqual({ data: buildRows(3), error: null });
    expect(calls).toEqual([{ batch: null, cursor: null, count: 1000 }]);
  });

  it("pagina con cursor sobre id hasta una pagina incompleta", async () => {
    const { buildQuery, calls } = createSource(() => buildRows(5));

    const result = await fetchAllPages(buildQuery, { pageSize: 2 });

    expect(result.data).toEqual(buildRows(5));
    expect(calls.map((call) => call.cursor)).toEqual([
      null,
      "r-00001",
      "r-00003",
    ]);
  });

  it("devuelve el error sin filas parciales", async () => {
    const pageError = { message: "boom" };
    const { buildQuery } = createSource(() => buildRows(5), {
      errorOnCall: 2,
      error: pageError,
    });

    const result = await fetchAllPages(buildQuery, { pageSize: 2 });

    expect(result).toEqual({ data: null, error: pageError });
  });

  it("continua desde el ultimo id leido aunque se borren filas entre paginas", async () => {
    let dataset = buildRows(5);
    const { buildQuery, calls } = createSource(() => {
      if (calls.length === 2) {
        dataset = dataset.filter((row) => row.id !== "r-00000");
      }
      return dataset;
    });

    const result = await fetchAllPages(buildQuery, { pageSize: 2 });

    expect(result.error).toBeNull();
    expect(result.data.map((row) => row.id)).toEqual(
      buildRows(5).map((row) => row.id)
    );
  });

  it("devuelve error si la ultima fila de una pagina llena no trae id", async () => {
    const { buildQuery, calls } = createSource(() => [
      { id: "r-00000" },
      { name: "sin id" },
    ]);

    const result = await fetchAllPages(buildQuery, { pageSize: 2 });

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(calls).toHaveLength(1);
  });
});

describe("fetchByIdsInBatches", () => {
  it("parte los ids en lotes de 200 por defecto", async () => {
    const rows = buildRows(450);
    const { buildQuery, calls } = createSource(() => rows);

    const result = await fetchByIdsInBatches(
      rows.map((row) => row.id),
      buildQuery
    );

    expect(DEFAULT_IN_FILTER_BATCH_SIZE).toBe(200);
    expect(calls.map((call) => call.batch.length)).toEqual([200, 200, 50]);
    expect(result.data).toHaveLength(450);
  });

  it("pagina cada lote y une los resultados", async () => {
    const rows = buildRows(5);
    const { buildQuery, calls } = createSource(() => rows);

    const result = await fetchByIdsInBatches(
      rows.map((row) => row.id),
      buildQuery,
      { batchSize: 3, pageSize: 2 }
    );

    expect(result).toEqual({ data: rows, error: null });
    expect(calls).toHaveLength(4);
  });

  it("corta con el primer error de cualquier lote", async () => {
    const pageError = { message: "boom" };
    const rows = buildRows(4);
    const { buildQuery } = createSource(() => rows, {
      errorOnCall: 2,
      error: pageError,
    });

    const result = await fetchByIdsInBatches(
      rows.map((row) => row.id),
      buildQuery,
      { batchSize: 2 }
    );

    expect(result).toEqual({ data: null, error: pageError });
  });
});
