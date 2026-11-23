import { describe, expect, it } from "vitest";

import {
  DEFAULT_BATCH_CONCURRENCY,
  DEFAULT_IN_FILTER_BATCH_SIZE,
  DEFAULT_PAGE_SIZE,
  fetchAllPages,
  fetchAllRpcPages,
  fetchByIdsInBatches,
} from "./paginatedQuery";
import { createFakePostgrest } from "./fakePostgrest.testUtils";

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

  it("pagina sobre cursorColumn en tablas sin id", async () => {
    const claves = ["10101500", "10101501", "10101502"].map((clave) => ({
      clave,
    }));
    const fake = createFakePostgrest({ sat: claves });

    const result = await fetchAllPages(() => fake.from("sat").select("clave"), {
      pageSize: 2,
      cursorColumn: "clave",
    });

    expect(result).toEqual({ data: claves, error: null });
    expect(fake.calls[0].orders).toEqual([
      { column: "clave", ascending: true },
    ]);
    expect(fake.calls[1].filters).toEqual([
      expect.objectContaining({ column: "clave", value: "10101501" }),
    ]);
  });
});

describe("fetchByIdsInBatches", () => {
  it("pasa cursorColumn a la paginacion de cada lote", async () => {
    const claves = ["a", "b", "c", "d", "e"].map((clave) => ({ clave }));
    const fake = createFakePostgrest({ sat: claves });

    const result = await fetchByIdsInBatches(
      ["a", "b", "c", "e"],
      (batch) => fake.from("sat").select("clave").in("clave", batch),
      { batchSize: 2, pageSize: 2, cursorColumn: "clave" }
    );

    expect(result.data.map((row) => row.clave)).toEqual(["a", "b", "c", "e"]);
    expect(fake.calls.every((call) => call.orders[0].column === "clave")).toBe(
      true
    );
  });

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

  it("no tiene mas de 4 lotes en vuelo por defecto", async () => {
    const rows = buildRows(20);
    let inFlight = 0;
    let maxInFlight = 0;

    const buildQuery = (batch) => {
      const query = {
        order: () => query,
        gt: () => query,
        limit: async () => {
          inFlight += 1;
          maxInFlight = Math.max(maxInFlight, inFlight);
          await new Promise((resolve) => setTimeout(resolve, 0));
          inFlight -= 1;
          return {
            data: rows.filter((row) => batch.includes(row.id)),
            error: null,
          };
        },
      };
      return query;
    };

    const result = await fetchByIdsInBatches(
      rows.map((row) => row.id),
      buildQuery,
      { batchSize: 2 }
    );

    expect(DEFAULT_BATCH_CONCURRENCY).toBe(4);
    expect(maxInFlight).toBe(4);
    expect(result).toEqual({ data: rows, error: null });
  });

  it("no lanza mas tandas despues de un error", async () => {
    const pageError = { message: "boom" };
    const rows = buildRows(8);
    const { buildQuery, calls } = createSource(() => rows, {
      errorOnCall: 1,
      error: pageError,
    });

    const result = await fetchByIdsInBatches(
      rows.map((row) => row.id),
      buildQuery,
      { batchSize: 2, concurrency: 2 }
    );

    expect(result).toEqual({ data: null, error: pageError });
    expect(calls).toHaveLength(2);
  });
});

const createRpcSource = (rows, { errorOnCall = null, error = null } = {}) => {
  const ranges = [];

  const buildRpc = () => ({
    range: (from, to) => {
      ranges.push([from, to]);
      if (ranges.length === errorOnCall) {
        return Promise.resolve({ data: null, error });
      }
      return Promise.resolve({ data: rows.slice(from, to + 1), error: null });
    },
  });

  return { buildRpc, ranges };
};

describe("fetchAllRpcPages", () => {
  it("lee una sola pagina incompleta", async () => {
    const { buildRpc, ranges } = createRpcSource(buildRows(3));

    const result = await fetchAllRpcPages(buildRpc);

    expect(result).toEqual({ data: buildRows(3), error: null });
    expect(ranges).toEqual([[0, 999]]);
  });

  it("pide paginas con .range() hasta una pagina incompleta", async () => {
    const { buildRpc, ranges } = createRpcSource(buildRows(5));

    const result = await fetchAllRpcPages(buildRpc, { pageSize: 2 });

    expect(result).toEqual({ data: buildRows(5), error: null });
    expect(ranges).toEqual([
      [0, 1],
      [2, 3],
      [4, 5],
    ]);
  });

  it("corta con el error de la segunda pagina sin filas parciales", async () => {
    const pageError = { message: "boom" };
    const { buildRpc, ranges } = createRpcSource(buildRows(5), {
      errorOnCall: 2,
      error: pageError,
    });

    const result = await fetchAllRpcPages(buildRpc, { pageSize: 2 });

    expect(result).toEqual({ data: null, error: pageError });
    expect(ranges).toHaveLength(2);
  });
});
