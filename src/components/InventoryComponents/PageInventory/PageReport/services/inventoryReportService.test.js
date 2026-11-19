import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../../lib/supabaseClient", () => ({
  supabase: { from: vi.fn() },
}));

vi.mock("../../../../../services/branchScopeService", () => ({
  fetchOperationalBranches: vi.fn(),
  isOperationalBranch: (branch) => branch?.branch_type === "operational",
}));

import { supabase } from "../../../../../lib/supabaseClient";
import {
  INVENTORY_REPORT_PAGE_SIZE,
  MAX_INVENTORY_REPORT_ROWS,
  fetchInventoryReportRows,
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
