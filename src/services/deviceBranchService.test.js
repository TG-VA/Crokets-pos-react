import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../lib/supabaseClient", () => ({
  supabase: { rpc: vi.fn() },
}));

import { supabase } from "../lib/supabaseClient";
import { resolveBranchByDevice } from "./deviceBranchService";

describe("deviceBranchService", () => {
  beforeEach(() => {
    supabase.rpc.mockReset();
  });

  it("rechaza la llamada sin deviceCode", async () => {
    const result = await resolveBranchByDevice("");

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("resuelve la sucursal desde el RPC get_branch_by_device", async () => {
    supabase.rpc.mockResolvedValue({
      data: {
        success: true,
        branch: { id: "branch-1", name: "Centro", code: "C01" },
      },
      error: null,
    });

    const result = await resolveBranchByDevice("device-uuid");

    expect(supabase.rpc).toHaveBeenCalledWith("get_branch_by_device", {
      p_device_code: "device-uuid",
    });
    expect(result).toEqual({
      success: true,
      data: { id: "branch-1", name: "Centro", code: "C01" },
      error: null,
      partial: false,
    });
  });

  it("propaga el mensaje de negocio cuando el POS no tiene sucursal", async () => {
    supabase.rpc.mockResolvedValue({
      data: { success: false, message: "Este POS no está asignado a ninguna sucursal" },
      error: null,
    });

    const result = await resolveBranchByDevice("device-uuid");

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toBe("Este POS no está asignado a ninguna sucursal");
  });

  it("falla si la respuesta no incluye id de sucursal", async () => {
    supabase.rpc.mockResolvedValue({
      data: { success: true, branch: { name: "Sin id" } },
      error: null,
    });

    const result = await resolveBranchByDevice("device-uuid");

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
  });

  it("captura errores de transporte del RPC", async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { message: "network" } });

    const result = await resolveBranchByDevice("device-uuid");

    expect(result.success).toBe(false);
    expect(result.error).toBe("network");
  });
});
