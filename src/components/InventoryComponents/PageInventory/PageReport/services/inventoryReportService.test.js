import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../../lib/supabaseClient", () => ({
  supabase: { from: vi.fn() },
}));

vi.mock("../../../../../services/branchScopeService", () => ({
  fetchOperationalBranches: vi.fn(),
  isOperationalBranch: (branch) => branch?.branch_type === "operational",
}));

import { supabase } from "../../../../../lib/supabaseClient";
import { fetchOperationalBranches } from "../../../../../services/branchScopeService";
import {
  INVENTORY_REPORT_PAGE_SIZE,
  MAX_INVENTORY_REPORT_ROWS,
  fetchBranchOptions,
  fetchInventoryReportRows,
  getBranchOptionsFallback,
} from "./inventoryReportService";

/*
  Simula PostgREST: cada tabla responde a `range(from, to)` con el segmento
  correspondiente de su arreglo, y nunca mas de 1000 filas por respuesta.
*/
const POSTGREST_MAX_ROWS = 1000;

const mockTables = (tables) => {
  const calls = [];

  supabase.from.mockImplementation((table) => {
    const call = { table, filters: [], ranges: [] };
    calls.push(call);

    const query = {
      select: vi.fn(() => query),
      eq: vi.fn((column, value) => {
        call.filters.push([column, value]);
        return query;
      }),
      order: vi.fn(() => query),
      range: vi.fn((from, to) => {
        call.ranges.push([from, to]);
        const source = tables[table];

        if (source instanceof Error) {
          return Promise.resolve({ data: null, error: source });
        }

        const rows =
          (typeof source === "function" ? source(call) : source) ?? [];
        const end = Math.min(to + 1, from + POSTGREST_MAX_ROWS);
        return Promise.resolve({ data: rows.slice(from, end), error: null });
      }),
    };

    return query;
  });

  return calls;
};

const buildInventoryRows = (count) =>
  Array.from({ length: count }, (_, index) => ({
    id: `inv-${index}`,
    product_id: `p-${index}`,
    stock: 5,
    min_stock: 1,
    max_stock: 10,
    is_active: true,
    products: {
      id: `p-${index}`,
      barcode: `C${index}`,
      name: `PRODUCTO ${index}`,
      status: true,
      tracks_inventory: true,
      departments: { name: "ALIMENTO" },
    },
  }));

describe("fetchInventoryReportRows: limite de filas de Supabase", () => {
  beforeEach(() => {
    supabase.from.mockReset();
  });

  it("lee todas las paginas cuando el inventario supera las 1000 filas", async () => {
    mockTables({
      branch_inventory: buildInventoryRows(2500),
      products: [],
    });

    const rows = await fetchInventoryReportRows("b1");

    expect(rows).toHaveLength(2500);
  });

  it("pide paginas consecutivas del tamano fijado", async () => {
    const calls = mockTables({
      branch_inventory: buildInventoryRows(1500),
      products: [],
    });

    await fetchInventoryReportRows("b1");

    const inventoryRanges = calls
      .filter((call) => call.table === "branch_inventory")
      .flatMap((call) => call.ranges);
    expect(INVENTORY_REPORT_PAGE_SIZE).toBe(1000);
    expect(inventoryRanges).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  it("se detiene en el tope explicito de filas", async () => {
    mockTables({
      branch_inventory: buildInventoryRows(MAX_INVENTORY_REPORT_ROWS + 500),
      products: [],
    });

    const rows = await fetchInventoryReportRows("b1");

    expect(MAX_INVENTORY_REPORT_ROWS).toBe(10000);
    expect(rows).toHaveLength(10000);
  });

  it("pagina tambien la consulta de productos sin control de inventario", async () => {
    const products = Array.from({ length: 1200 }, (_, index) => ({
      id: `s-${index}`,
      barcode: `S${index}`,
      name: `SERVICIO ${index}`,
      status: true,
      tracks_inventory: false,
    }));
    mockTables({ branch_inventory: [], products });

    const rows = await fetchInventoryReportRows("b1");

    expect(rows).toHaveLength(1200);
  });
});

describe("fetchBranchOptions: solo sucursales operativas", () => {
  beforeEach(() => {
    fetchOperationalBranches.mockReset();
  });

  it("devuelve tal cual las sucursales operativas, sin inyectar otras", async () => {
    const branches = [
      { id: "b1", name: "Centro", code: "" },
      { id: "b2", name: "Torres", code: "T" },
    ];
    fetchOperationalBranches.mockResolvedValue({ data: branches, error: null });

    await expect(fetchBranchOptions({ id: "b1" })).resolves.toEqual(branches);
  });

  it("ante error el fallback ofrece solo la sucursal actual operativa", async () => {
    fetchOperationalBranches.mockResolvedValue({
      data: [],
      error: new Error("boom"),
    });
    const current = {
      id: "b1",
      name: "Centro",
      code: "C",
      branch_type: "operational",
    };

    const error = await fetchBranchOptions(current).catch((err) => err);

    expect(error.branchFallback).toEqual([
      { id: "b1", name: "Centro", code: "C" },
    ]);
    expect(getBranchOptionsFallback(current)).toEqual([
      { id: "b1", name: "Centro", code: "C" },
    ]);
  });

  it("el fallback queda vacio si la sucursal actual no es operativa", () => {
    expect(
      getBranchOptionsFallback({ id: "adm", branch_type: "admin" })
    ).toEqual([]);
    expect(getBranchOptionsFallback(null)).toEqual([]);
  });
});

describe("fetchInventoryReportRows: productos sin registro en la sucursal", () => {
  beforeEach(() => {
    supabase.from.mockReset();
  });

  const product = (id, overrides = {}) => ({
    id,
    barcode: `C-${id}`,
    name: `PRODUCTO ${id}`,
    status: true,
    tracks_inventory: true,
    departments: { name: "ALIMENTO" },
    ...overrides,
  });

  const byTracking = (products) => (call) => {
    const tracking = call.filters.find(
      ([column]) => column === "tracks_inventory"
    );
    return products.filter(
      (item) => !tracking || item.tracks_inventory === tracking[1]
    );
  };

  it("mapea con flag explicito y valores nulos al producto sin fila", async () => {
    mockTables({
      branch_inventory: [],
      products: byTracking([product("p1")]),
    });

    const [row] = await fetchInventoryReportRows("b1");

    expect(row).toMatchObject({
      productId: "p1",
      inventoryRowId: null,
      existencia: null,
      min: null,
      max: null,
      tracksInventory: true,
      noBranchRecord: true,
    });
  });

  it("un producto con fila en la sucursal no se repite como sin registro", async () => {
    const [inventoryRow] = buildInventoryRows(1);
    mockTables({
      branch_inventory: [inventoryRow],
      products: byTracking([product(inventoryRow.product_id), product("p9")]),
    });

    const rows = await fetchInventoryReportRows("b1");
    const ids = rows.map((row) => row.productId);

    expect(ids).toEqual([inventoryRow.product_id, "p9"]);
    expect(rows[0].noBranchRecord).toBe(false);
    expect(rows[0].existencia).toBe(5);
    expect(rows[1].noBranchRecord).toBe(true);
  });

  it("los productos sin control de inventario no se marcan sin registro", async () => {
    mockTables({
      branch_inventory: [],
      products: byTracking([product("s1", { tracks_inventory: false })]),
    });

    const [row] = await fetchInventoryReportRows("b1");

    expect(row).toMatchObject({
      productId: "s1",
      tracksInventory: false,
      noStockProduct: true,
      noBranchRecord: false,
    });
  });

  it("consulta los controlados solo activos y con tracks_inventory = true", async () => {
    const calls = mockTables({ branch_inventory: [], products: [] });

    await fetchInventoryReportRows("b1");

    const trackedCall = calls.find(
      (call) =>
        call.table === "products" &&
        call.filters.some(
          ([column, value]) => column === "tracks_inventory" && value === true
        )
    );
    expect(trackedCall.filters).toContainEqual(["status", true]);
  });
});

describe("fetchInventoryReportRows: errores de la consulta de inventario", () => {
  beforeEach(() => {
    supabase.from.mockReset();
  });

  it("propaga el error real sin reintentar con otro select", async () => {
    const queryError = new Error("column products.foo does not exist");
    const calls = mockTables({ branch_inventory: queryError, products: [] });

    await expect(fetchInventoryReportRows("b1")).rejects.toBe(queryError);
    expect(
      calls.filter((call) => call.table === "branch_inventory")
    ).toHaveLength(1);
  });
});
