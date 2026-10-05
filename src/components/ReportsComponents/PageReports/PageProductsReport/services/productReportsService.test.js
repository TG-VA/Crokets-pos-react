import { describe, it, expect, beforeEach, vi } from "vitest";

/*
  Contrato del filtro de sucursal del reporte de productos: "ALL" es la
  sucursal consolidada y no debe acotar ninguna consulta.
*/

vi.mock("../../../../../lib/supabaseClient", () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

import { supabase } from "../../../../../lib/supabaseClient";
import { fetchProductsReportData } from "./productReportsService";

const RANGE = {
  startDate: "2026-03-01T00:00:00.000Z",
  endDate: "2026-03-31T23:59:59.999Z",
};

const queryFor = (resolve, registry, table) => {
  const q = { table, eqCalls: [] };

  ["select", "order", "not", "gte", "lte", "in", "limit"].forEach((method) => {
    q[method] = vi.fn(() => q);
  });

  q.eq = vi.fn((column, value) => {
    q.eqCalls.push([column, value]);
    return q;
  });

  q.then = (onFulfilled, onRejected) =>
    Promise.resolve(resolve).then(onFulfilled, onRejected);

  if (registry) registry[table] = q;

  return q;
};

describe("fetchProductsReportData filtro de sucursal", () => {
  beforeEach(() => {
    supabase.from.mockReset();
  });

  it("omite el filtro de sucursal en ventas e inventario con ALL", async () => {
    const registry = {};

    supabase.from.mockImplementation((table) =>
      queryFor({ data: [], error: null }, registry, table)
    );

    await fetchProductsReportData({ ...RANGE, branchId: "ALL" });

    // La venta completada siempre se filtra; lo que se omite es la sucursal.
    expect(registry.sale_details.eqCalls).not.toContainEqual(
      expect.arrayContaining(["sales.branch_id"])
    );
    // El inventario activo siempre se filtra; lo que se omite es la sucursal.
    expect(registry.branch_inventory.eqCalls).not.toContainEqual(
      expect.arrayContaining(["branch_id"])
    );
  });

  it("acota ventas e inventario cuando la sucursal es concreta", async () => {
    const registry = {};

    supabase.from.mockImplementation((table) =>
      queryFor({ data: [], error: null }, registry, table)
    );

    await fetchProductsReportData({ ...RANGE, branchId: "b1" });

    expect(registry.sale_details.eqCalls).toContainEqual([
      "sales.branch_id",
      "b1",
    ]);
    expect(registry.branch_inventory.eqCalls).toContainEqual([
      "branch_id",
      "b1",
    ]);
  });

  it("consolida el stock de todas las sucursales con ALL", async () => {
    const tableData = {
      sale_details: [
        {
          quantity: 2,
          total_price: 100,
          product_id: "p1",
          products: { name: "ALIMENTO", barcode: "111", department: { name: "Alimentos" } },
          sales: { status: "completed", branch_id: "b1" },
        },
        {
          quantity: 3,
          total_price: 150,
          product_id: "p1",
          products: { name: "ALIMENTO", barcode: "111", department: { name: "Alimentos" } },
          sales: { status: "completed", branch_id: "b2" },
        },
      ],
      branch_inventory: [
        { stock: 4, product_id: "p1", products: { id: "p1", name: "ALIMENTO", barcode: "111", department: { name: "Alimentos" } } },
        { stock: 6, product_id: "p1", products: { id: "p1", name: "ALIMENTO", barcode: "111", department: { name: "Alimentos" } } },
      ],
    };

    supabase.from.mockImplementation((table) =>
      queryFor({ data: tableData[table] ?? [], error: null }, null, table)
    );

    const result = await fetchProductsReportData({ ...RANGE, branchId: "ALL" });

    // El stock de ambas sucursales se suma en memoria: sin esto el reporte
    // consolidado subestimaria la existencia real del producto.
    expect(result.topProducts[0].stock).toBe(10);
    expect(result.kpis.totalUnits).toBe(5);
    expect(result.kpis.totalRevenue).toBe(250);
  });

  it("rechaza la consulta sin parametros completos", async () => {
    supabase.from.mockImplementation((table) =>
      queryFor({ data: [], error: null }, null, table)
    );

    await expect(
      fetchProductsReportData({ startDate: RANGE.startDate, branchId: "ALL" })
    ).rejects.toThrow("Parámetros de consulta incompletos.");
  });
});
