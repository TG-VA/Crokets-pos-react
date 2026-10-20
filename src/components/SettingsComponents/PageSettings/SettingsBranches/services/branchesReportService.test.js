import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../../../../lib/supabaseClient", () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from "../../../../../lib/supabaseClient";
import { fetchBranchesCatalog } from "./branchesReportService";

const catalogQuery = ({ data, error }) => {
  const query = {
    select: vi.fn(() => query),
    order: vi.fn(() => Promise.resolve({ data, error })),
  };
  return query;
};

describe("branchesReportService", () => {
  beforeEach(() => {
    supabase.from.mockReset();
  });

  describe("fetchBranchesCatalog", () => {
    it("consulta branches con conteo de pos_devices y ordena por nombre", async () => {
      const query = catalogQuery({
        data: [
          {
            id: "b1",
            code: "CEN",
            name: "Centro",
            phone: null,
            email: null,
            address: null,
            city: "Cancún",
            state: "QR",
            timezone: "America/Cancun",
            is_active: true,
            pos_devices: [{ count: 2 }],
          },
          {
            id: "b2",
            code: "NTE",
            name: "Norte",
            phone: null,
            email: null,
            address: null,
            city: "Mérida",
            state: "YU",
            timezone: "America/Cancun",
            is_active: false,
            pos_devices: [],
          },
        ],
        error: null,
      });
      supabase.from.mockReturnValue(query);

      const result = await fetchBranchesCatalog();

      expect(supabase.from).toHaveBeenCalledWith("branches");
      expect(query.select).toHaveBeenCalledWith(
        expect.stringContaining("is_active")
      );
      expect(query.select).toHaveBeenCalledWith(
        expect.stringContaining("pos_devices(count)")
      );
      expect(query.order).toHaveBeenCalledWith("name", { ascending: true });
      expect(result.success).toBe(true);
      expect(result.data).toEqual([
        expect.objectContaining({
          id: "b1",
          isActive: true,
          posDevicesCount: 2,
        }),
        expect.objectContaining({
          id: "b2",
          isActive: false,
          posDevicesCount: 0,
        }),
      ]);
    });

    it("devuelve lista vacia cuando data es null", async () => {
      supabase.from.mockReturnValue(catalogQuery({ data: null, error: null }));

      const result = await fetchBranchesCatalog();

      expect(result).toEqual({ success: true, data: [], error: null });
    });

    it("propaga el error de Supabase con contrato success false", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      supabase.from.mockReturnValue(
        catalogQuery({ data: null, error: { message: "permission denied" } })
      );

      const result = await fetchBranchesCatalog();

      expect(result.success).toBe(false);
      expect(result.data).toEqual([]);
      expect(result.error).toBe("permission denied");
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });
});
