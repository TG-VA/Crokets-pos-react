import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../../lib/supabaseClient", () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

import { supabase } from "../../../lib/supabaseClient";
import { fetchHistoricalCutDetail } from "./cashCutDetailService";

const thenableQuery = (resolve = { data: null, error: null }) => {
  const q = {
    select: vi.fn(),
    eq: vi.fn(),
  };

  Object.values(q).forEach((fn) => fn.mockReturnValue(q));

  q.maybeSingle = vi.fn(() => Promise.resolve(resolve));
  q.then = (onFulfilled, onRejected) =>
    Promise.resolve(resolve).then(onFulfilled, onRejected);

  return q;
};

describe("cashCutDetailService", () => {
  beforeEach(() => {
    supabase.from.mockReset();
  });

  describe("fetchHistoricalCutDetail", () => {
    it("consulta un corte por id con embeds de usuario y sesion", async () => {
      const row = { id: "c1", cash_register_sessions: { id: "s1" } };
      const q = thenableQuery({ data: row, error: null });
      supabase.from.mockReturnValue(q);

      const result = await fetchHistoricalCutDetail({ cutId: "c1" });

      expect(supabase.from).toHaveBeenCalledWith("cash_cuts");
      expect(q.select).toHaveBeenCalledWith(
        expect.stringContaining("cash_register_sessions")
      );
      expect(q.select).toHaveBeenCalledWith(
        expect.stringContaining("users")
      );
      expect(q.eq).toHaveBeenCalledWith("id", "c1");
      expect(q.maybeSingle).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ data: row, error: null });
    });

    it("propaga el error de la consulta", async () => {
      const q = thenableQuery({ data: null, error: { message: "boom" } });
      supabase.from.mockReturnValue(q);

      const result = await fetchHistoricalCutDetail({ cutId: "c1" });

      expect(result.error).toEqual({ message: "boom" });
    });
  });
});
