import { beforeEach, describe, expect, it, vi } from "vitest";

/*
  Contrato de lectura del periodo: cada consulta manda la ventana de fechas al
  servidor (.gte/.lt) y pagina con un cursor sobre id (.gt + .limit) hasta que
  una pagina llega incompleta, sin tope de filas.
*/

const { from, queries, pages } = vi.hoisted(() => {
  const queries = [];
  const pages = { current: [] };

  const createQuery = (table) => {
    const query = { table, calls: [] };

    ["select", "order", "eq", "gte", "lt", "gt", "in"].forEach((method) => {
      query[method] = vi.fn((...args) => {
        query.calls.push([method, ...args]);
        return query;
      });
    });

    query.limit = vi.fn((count) => {
      query.calls.push(["limit", count]);
      return Promise.resolve(
        pages.current.shift() ?? { data: [], error: null }
      );
    });

    queries.push(query);
    return query;
  };

  return { from: vi.fn(createQuery), queries, pages };
});

vi.mock("../../../../../lib/supabaseClient", () => ({
  supabase: { from },
}));

import {
  fetchAllPages,
  loadBaseMovements,
  loadMovementsReport,
  loadProducts,
  loadRewardRedemptions,
  loadSaleDetailsBySales,
  loadSales,
  loadSalesByBranch,
} from "./movementsReportService";
import {
  IN_FILTER_BATCH_SIZE,
  MOVEMENTS_PAGE_SIZE,
  MOVEMENTS_PRODUCTS_SELECT_KEY,
  MOVEMENTS_SALES_SELECT_KEY,
} from "./movementServiceConstants";

const buildIds = (count) =>
  Array.from({ length: count }, (_, index) => `id-${index}`);

const fullPage = (prefix) => ({
  data: Array.from({ length: MOVEMENTS_PAGE_SIZE }, (_, index) => ({
    id: `${prefix}-${index}`,
  })),
  error: null,
});

const callsOf = (query, method) =>
  query.calls.filter(([name]) => name === method);

const WINDOW = {
  startISO: "2026-01-01T06:00:00.000Z",
  endISO: "2026-03-01T06:00:00.000Z",
};

describe("movementsReportService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queries.length = 0;
    pages.current = [];
    window.localStorage.clear();
  });

  it("pagina hasta una pagina incompleta, sin tope de filas", async () => {
    pages.current = [
      fullPage("a"),
      fullPage("b"),
      { data: [{ id: "c-0" }], error: null },
    ];

    const rows = await loadBaseMovements({ branchId: "b1", ...WINDOW });

    expect(rows).toHaveLength(MOVEMENTS_PAGE_SIZE * 2 + 1);
    expect(queries.map((query) => callsOf(query, "gt"))).toEqual([
      [],
      [["gt", "id", `a-${MOVEMENTS_PAGE_SIZE - 1}`]],
      [["gt", "id", `b-${MOVEMENTS_PAGE_SIZE - 1}`]],
    ]);
    expect(
      queries.every(
        (query) =>
          callsOf(query, "limit")[0][1] === MOVEMENTS_PAGE_SIZE &&
          callsOf(query, "order")[0][1] === "id"
      )
    ).toBe(true);
  });

  it("manda la ventana de fechas y la sucursal al servidor", async () => {
    await loadBaseMovements({ branchId: "b1", ...WINDOW });

    const [query] = queries;
    expect(query.table).toBe("inventory_movements");
    expect(callsOf(query, "gte")).toEqual([
      ["gte", "created_at", WINDOW.startISO],
    ]);
    expect(callsOf(query, "lt")).toEqual([["lt", "created_at", WINDOW.endISO]]);
    expect(callsOf(query, "eq")).toEqual([["eq", "branch_id", "b1"]]);
  });

  it("filtra canjes por created_at y ventas por sale_date", async () => {
    await loadRewardRedemptions({ branchId: "b1", ...WINDOW });
    await loadSalesByBranch({ branchId: "b1", ...WINDOW });

    expect(callsOf(queries[0], "gte")[0]).toEqual([
      "gte",
      "created_at",
      WINDOW.startISO,
    ]);
    expect(queries[1].table).toBe("sales");
    expect(callsOf(queries[1], "lt")[0]).toEqual([
      "lt",
      "sale_date",
      WINDOW.endISO,
    ]);
  });

  it("propaga el error de cualquier pagina", async () => {
    const pageError = { message: "boom" };
    pages.current = [fullPage("a"), { data: null, error: pageError }];

    await expect(loadBaseMovements({ branchId: "b1", ...WINDOW })).rejects.toBe(
      pageError
    );
  });

  it("fetchAllPages devuelve el error sin filas parciales", async () => {
    const pageError = { message: "boom" };
    pages.current = [fullPage("a"), { data: null, error: pageError }];

    const result = await fetchAllPages(() => from("x"));

    expect(result).toEqual({ data: null, error: pageError });
  });

  it("parte los ids del .in() en lotes", async () => {
    const ids = buildIds(IN_FILTER_BATCH_SIZE * 2 + 50);

    await loadProducts(ids);

    const batchSizes = queries.map(
      (query) => callsOf(query, "in")[0][2].length
    );
    expect(batchSizes).toEqual([
      IN_FILTER_BATCH_SIZE,
      IN_FILTER_BATCH_SIZE,
      50,
    ]);
    expect(queries.flatMap((query) => callsOf(query, "in")[0][2])).toEqual(ids);
  });

  it("pagina un lote con mas de 1000 coincidencias", async () => {
    pages.current = [fullPage("a"), { data: [{ id: "b-0" }], error: null }];

    const rows = await loadSaleDetailsBySales(["s1"]);

    expect(rows).toHaveLength(MOVEMENTS_PAGE_SIZE + 1);
    expect(
      queries.every((query) => callsOf(query, "in")[0][1] === "sale_id")
    ).toBe(true);
  });

  it("cae al siguiente select ante columna faltante y lo guarda en cache", async () => {
    pages.current = [
      {
        data: null,
        error: { message: "column products.is_kit does not exist" },
      },
      { data: [{ id: "p1" }], error: null },
    ];

    const rows = await loadProducts(["p1"]);

    expect(rows).toEqual([{ id: "p1" }]);
    expect(window.localStorage.getItem(MOVEMENTS_PRODUCTS_SELECT_KEY)).toBe(
      "id, name, barcode, tracks_inventory"
    );
  });

  it("usa primero el select guardado en cache", async () => {
    window.localStorage.setItem(MOVEMENTS_PRODUCTS_SELECT_KEY, "id, name");

    await loadProducts(["p1"]);

    expect(callsOf(queries[0], "select")[0][1]).toBe("id, name");
  });

  it("continua desde el ultimo id leido aunque se borren filas entre paginas", async () => {
    // Dataset que responde como PostgREST: filtra por .gt sobre id, ordena y
    // corta en .limit. Tras servir la primera pagina se borra una fila ya leida.
    const total = MOVEMENTS_PAGE_SIZE * 2 + 1;
    let dataset = Array.from({ length: total }, (_, index) => ({
      id: `r-${String(index).padStart(5, "0")}`,
    }));
    const deletedId = dataset[500].id;
    let served = 0;

    const buildQuery = () => {
      let cursor = null;
      const serve = (page) => {
        served += 1;
        if (served === 1) {
          dataset = dataset.filter((row) => row.id !== deletedId);
        }
        return Promise.resolve({ data: page, error: null });
      };
      const query = {
        order: () => query,
        // Paginacion por offset, para que el test distinga cursor de .range().
        range: (start, end) => serve(dataset.slice(start, end + 1)),
        gt: (_column, value) => {
          cursor = value;
          return query;
        },
        limit: (count) => {
          const page = dataset
            .filter((row) => cursor === null || row.id > cursor)
            .sort((left, right) => left.id.localeCompare(right.id))
            .slice(0, count);
          return serve(page);
        },
      };
      return query;
    };

    const result = await fetchAllPages(buildQuery);

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(total);
    expect(new Set(result.data.map((row) => row.id)).size).toBe(total);
  });

  it("devuelve error si la ultima fila de una pagina llena no trae id", async () => {
    const page = fullPage("a");
    page.data[MOVEMENTS_PAGE_SIZE - 1] = { name: "sin id" };
    pages.current = [page];

    const result = await fetchAllPages(() => from("x"));

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(queries).toHaveLength(1);
  });

  it("no consulta sin una ventana de fechas valida", async () => {
    const rows = await loadMovementsReport({
      branchId: "b1",
      startDateKey: "no-es-fecha",
      endDateKey: "tampoco",
    });

    expect(rows).toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });

  it("guarda en cache el select de ventas que funciono y lo reusa", async () => {
    pages.current = [
      {
        data: null,
        error: { message: "column sales.folio does not exist" },
      },
      { data: [{ id: "s1" }], error: null },
    ];

    await loadSales(["s1"]);

    const workingSelect = callsOf(queries[1], "select")[0][1];
    expect(window.localStorage.getItem(MOVEMENTS_SALES_SELECT_KEY)).toBe(
      workingSelect
    );

    queries.length = 0;
    await loadSales(["s1"]);

    expect(callsOf(queries[0], "select")[0][1]).toBe(workingSelect);
  });
});
