import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../../../../lib/supabaseClient", () => ({
  supabase: { rpc: vi.fn(), from: vi.fn() },
}));

import { supabase } from "../../../../../lib/supabaseClient";
import {
  createBranch,
  updateBranchContact,
  setBranchActive,
} from "./branchesMutationService";

const updateQuery = ({ data, error }) => {
  const query = {
    update: vi.fn(() => query),
    eq: vi.fn(() => query),
    neq: vi.fn(() => query),
    ilike: vi.fn(() => query),
    select: vi.fn(() => query),
    maybeSingle: vi.fn(() => Promise.resolve({ data, error })),
  };
  return query;
};

describe("branchesMutationService", () => {
  beforeEach(() => {
    supabase.rpc.mockReset();
    supabase.from.mockReset();
  });

  describe("createBranch", () => {
    it("rechaza el payload sin code o name", async () => {
      const result = await createBranch({ name: "", code: "", adminId: "u1" });

      expect(result.success).toBe(false);
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it("rechaza el payload sin adminId", async () => {
      const result = await createBranch({ code: "CEN", name: "Centro" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("administrador");
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it("invoca create_branch con los parametros saneados", async () => {
      supabase.rpc.mockResolvedValue({
        data: {
          success: true,
          branch: { id: "b1", code: "CEN", name: "Centro", is_active: true },
        },
        error: null,
      });

      const result = await createBranch({
        code: " cen ",
        name: " Centro ",
        adminId: "u1",
        city: "Cancún",
        state: "QR",
        timezone: "America/Cancun",
        phone: "9999999999",
      });

      expect(supabase.rpc).toHaveBeenCalledWith("create_branch", {
        p_code: "CEN",
        p_name: "Centro",
        p_admin_id: "u1",
        p_phone: "9999999999",
        p_email: null,
        p_address: null,
        p_city: "Cancún",
        p_state: "QR",
        p_timezone: "America/Cancun",
        p_branch_type: "operational",
      });
      expect(result).toEqual({
        success: true,
        data: { id: "b1", code: "CEN", name: "Centro", is_active: true },
        error: null,
      });
    });

    it("envia el tipo admin a create_branch", async () => {
      supabase.rpc.mockResolvedValue({
        data: { success: true, branch: { id: "adm" } },
        error: null,
      });

      await createBranch({
        code: "ADM",
        name: "Oficina",
        adminId: "u1",
        branchType: "admin",
      });

      expect(supabase.rpc).toHaveBeenCalledWith(
        "create_branch",
        expect.objectContaining({ p_branch_type: "admin" })
      );
    });

    it("devuelve el mensaje del backend cuando success es false", async () => {
      supabase.rpc.mockResolvedValue({
        data: {
          success: false,
          message: "Ya existe una sucursal con ese código.",
        },
        error: null,
      });

      const result = await createBranch({
        code: "CEN",
        name: "Centro",
        adminId: "u1",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Ya existe una sucursal con ese código.");
    });

    it("captura errores de red con console.error", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      supabase.rpc.mockRejectedValue(new Error("network"));

      const result = await createBranch({
        code: "CEN",
        name: "Centro",
        adminId: "u1",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("network");
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  describe("updateBranchContact", () => {
    it("rechaza sin branchId", async () => {
      const result = await updateBranchContact(null, { name: "X" });

      expect(result.success).toBe(false);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it("rechaza updates sin campos permitidos", async () => {
      const result = await updateBranchContact("b1", { code: "NO" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("No hay campos");
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it("actualiza solo campos permitidos", async () => {
      const checkQuery = updateQuery({ data: null, error: null });
      const mutationQuery = updateQuery({
        data: { id: "b1", name: "Centro Norte", state: "QR" },
        error: null,
      });
      supabase.from
        .mockReturnValueOnce(checkQuery)
        .mockReturnValueOnce(mutationQuery);

      const result = await updateBranchContact("b1", {
        name: "Centro Norte",
        state: "QR",
        code: "IGNORED",
      });

      expect(mutationQuery.update).toHaveBeenCalledWith({
        name: "Centro Norte",
        state: "QR",
      });
      expect(mutationQuery.eq).toHaveBeenCalledWith("id", "b1");
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        id: "b1",
        name: "Centro Norte",
        state: "QR",
      });
    });

    it("no permite cambiar el tipo de una sucursal existente", async () => {
      const result = await updateBranchContact("b1", { branchType: "admin" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("No hay campos");
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it("ignora branchType junto a campos editables", async () => {
      const mutationQuery = updateQuery({
        data: { id: "b1", city: "Merida" },
        error: null,
      });
      supabase.from.mockReturnValueOnce(mutationQuery);

      await updateBranchContact("b1", { city: "Merida", branchType: "admin" });

      expect(mutationQuery.update).toHaveBeenCalledWith({ city: "Merida" });
    });

    it("rechaza si ya existe otra sucursal con el mismo nombre", async () => {
      supabase.from.mockReturnValue(
        updateQuery({ data: { id: "b2" }, error: null })
      );

      const result = await updateBranchContact("b1", { name: "Torres" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Ya existe una sucursal con ese nombre");
    });

    it("propaga el error de Supabase", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      supabase.from.mockReturnValue(
        updateQuery({ data: null, error: { message: "RLS blocked" } })
      );

      const result = await updateBranchContact("b1", { name: "X" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("RLS blocked");
      errorSpy.mockRestore();
    });
  });

  describe("setBranchActive", () => {
    it("rechaza payload invalido", async () => {
      expect((await setBranchActive({})).success).toBe(false);
      expect((await setBranchActive({ branchId: "b1" })).success).toBe(false);
      expect(
        (await setBranchActive({ branchId: "b1", isActive: true })).success
      ).toBe(false);
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it("invoca set_branch_active y devuelve branch y warnings", async () => {
      supabase.rpc.mockResolvedValue({
        data: {
          success: true,
          changed: true,
          branch: { id: "b1", is_active: false },
          warnings: { activePosDevices: 1 },
        },
        error: null,
      });

      const result = await setBranchActive({
        branchId: "b1",
        isActive: false,
        adminId: "u1",
      });

      expect(supabase.rpc).toHaveBeenCalledWith("set_branch_active", {
        p_branch_id: "b1",
        p_is_active: false,
        p_admin_id: "u1",
      });
      expect(result.success).toBe(true);
      expect(result.warnings).toEqual({ activePosDevices: 1 });
    });

    it("devuelve blockers cuando el backend bloquea la desactivacion", async () => {
      supabase.rpc.mockResolvedValue({
        data: {
          success: false,
          message:
            "No se puede desactivar: hay 1 sesión(es) de caja abierta(s).",
          blockers: { openCashSessions: 1 },
        },
        error: null,
      });

      const result = await setBranchActive({
        branchId: "b1",
        isActive: false,
        adminId: "u1",
      });

      expect(result.success).toBe(false);
      expect(result.blockers).toEqual({ openCashSessions: 1 });
      expect(result.error).toContain("sesión(es) de caja abierta(s)");
    });

    it("captura errores de red con console.error", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      supabase.rpc.mockRejectedValue(new Error("network"));

      const result = await setBranchActive({
        branchId: "b1",
        isActive: true,
        adminId: "u1",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("network");
      errorSpy.mockRestore();
    });
  });
});
