import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  fetchBranchProfile,
  updateBranchContact,
} from "./branchProfileService";

const { supabase } = vi.hoisted(() => {
  const mockFrom = vi.fn();
  return { supabase: { from: mockFrom } };
});

vi.mock("../../../../../lib/supabaseClient", () => ({
  supabase,
}));

describe("branchProfileService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchBranchProfile", () => {
    it("returns error when no branchId", async () => {
      const result = await fetchBranchProfile(null);
      expect(result.success).toBe(false);
      expect(result.error).toBe("No se recibió el ID de la sucursal.");
    });

    it("fetches branch profile successfully", async () => {
      const mockData = { id: "b1", code: "MID", name: "Mérida" };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      };
      supabase.from.mockReturnValue(mockQuery);

      const result = await fetchBranchProfile("b1");
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
    });

    it("handles error", async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi
          .fn()
          .mockResolvedValue({ data: null, error: { message: "DB error" } }),
      };
      supabase.from.mockReturnValue(mockQuery);

      const result = await fetchBranchProfile("b1");
      expect(result.success).toBe(false);
      expect(result.error).toBe("DB error");
    });
  });

  describe("updateBranchContact", () => {
    it("returns error when no branchId", async () => {
      const result = await updateBranchContact(null, { phone: "123" });
      expect(result.success).toBe(false);
    });

    it("returns error when no valid fields", async () => {
      const result = await updateBranchContact("b1", { invalid: "x" });
      expect(result.success).toBe(false);
      expect(result.error).toBe("No hay campos válidos para actualizar.");
    });

    it("updates allowed fields", async () => {
      const mockData = { id: "b1", phone: "123" };
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      };
      supabase.from.mockReturnValue(mockQuery);

      const updates = {
        name: "Torres",
        city: "Cancún",
        timezone: "America/Cancun",
        phone: "9999999999",
        email: "a@b.c",
        address: "dir",
      };
      const result = await updateBranchContact("b1", updates);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(mockQuery.update).toHaveBeenCalledWith(updates);
    });

    it("fails when the update affects no rows (RLS)", async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      supabase.from.mockReturnValue(mockQuery);

      const result = await updateBranchContact("b1", { phone: "123" });
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toContain("No se actualizó la sucursal");
    });

    it("handles error", async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi
          .fn()
          .mockResolvedValue({ data: null, error: { message: "fail" } }),
      };
      supabase.from.mockReturnValue(mockQuery);

      const result = await updateBranchContact("b1", { phone: "123" });
      expect(result.success).toBe(false);
      expect(result.error).toBe("fail");
    });
  });
});
