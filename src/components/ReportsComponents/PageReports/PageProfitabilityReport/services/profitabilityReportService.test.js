import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../../../../lib/supabaseClient", () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

import { supabase } from "../../../../../lib/supabaseClient";
import { fetchProfitabilityReportData } from "./profitabilityReportService";

const thenable = (resolve) => {
  const q = {};
  ["select", "order", "eq", "not", "gte", "lte", "limit"].forEach((method) => {
    q[method] = vi.fn(() => q);
  });
  q.then = (onFulfilled, onRejected) =>
    Promise.resolve(resolve).then(onFulfilled, onRejected);
  return q;
};

const makeSales = (count) =>
  Array.from({ length: count }, (_, i) => ({
    id: `s${i}`,
    sale_date: "2026-09-01T00:00:00.000Z",
    total: 100,
    discount_total: 0,
    status: "completed",
    branch_id: "b1",
  }));

describe("profitabilityReportService (concurrencia acotada)", () => {
  beforeEach(() => {
    supabase.from.mockReset();
    supabase.rpc.mockReset();
  });

  it("carga sale_details en lotes con concurrencia limitada", async () => {
    const sales = makeSales(450);
    const tableData = {
      departments: [{ id: "d1", name: "Alimentos" }],
      products: [],
      product_kits: [],
      branch_inventory: [],
      sales,
    };
    let active = 0;
    let maxActive = 0;
    let saleDetailsCalls = 0;

    supabase.from.mockImplementation((table) => {
      if (table === "sale_details") {
        const q = {};
        q.select = vi.fn(() => q);
        q.in = vi.fn(() => q);
        q.limit = vi.fn(() => {
          saleDetailsCalls += 1;
          active += 1;
          maxActive = Math.max(maxActive, active);
          return new Promise((resolve) =>
            setTimeout(() => {
              active -= 1;
              resolve({ data: [], error: null });
            }, 2)
          );
        });
        return q;
      }

      return thenable({ data: tableData[table] ?? [], error: null });
    });

    const result = await fetchProfitabilityReportData({ branchId: "ALL" });

    expect(saleDetailsCalls).toBe(5);
    expect(maxActive).toBe(4);
    expect(result.totalSalesCount).toBe(450);
  });
});
