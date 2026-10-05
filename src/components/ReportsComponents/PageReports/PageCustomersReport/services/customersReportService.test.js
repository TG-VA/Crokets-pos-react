import { describe, it, expect, beforeEach, vi } from "vitest";

/*
  Contrato del filtro de sucursal del reporte de clientes: "ALL" es la sucursal
  consolidada y no debe acotar ventas, puntos ni canjes.
*/

vi.mock("../../../../../lib/supabaseClient", () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

import { supabase } from "../../../../../lib/supabaseClient";
import { fetchCustomersReportData } from "./customersReportService";

const BRANCH_TABLES = [
  "sales",
  "customer_points",
  "sale_reward_redemptions",
];

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

describe("fetchCustomersReportData filtro de sucursal", () => {
  beforeEach(() => {
    supabase.from.mockReset();
  });

  it("omite el filtro de sucursal en las tres consultas con ALL", async () => {
    const registry = {};

    supabase.from.mockImplementation((table) =>
      queryFor({ data: [], error: null }, registry, table)
    );

    await fetchCustomersReportData({ branchId: "ALL", customerType: "ALL" });

    BRANCH_TABLES.forEach((table) => {
      expect(registry[table].eqCalls).toEqual([]);
    });
  });

  it("acota ventas, puntos y canjes cuando la sucursal es concreta", async () => {
    const registry = {};

    supabase.from.mockImplementation((table) =>
      queryFor({ data: [], error: null }, registry, table)
    );

    await fetchCustomersReportData({ branchId: "b1", customerType: "ALL" });

    BRANCH_TABLES.forEach((table) => {
      expect(registry[table].eqCalls).toContainEqual(["branch_id", "b1"]);
    });
  });
});