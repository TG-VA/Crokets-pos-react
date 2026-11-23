import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../lib/supabaseClient", () => ({
  supabase: { rpc: vi.fn(), from: vi.fn() },
}));

vi.mock("../lib/adminAuthorizationService", () => ({
  authorizeAdminAction: vi.fn(),
}));

import { supabase } from "../lib/supabaseClient";
import { authorizeAdminAction } from "../lib/adminAuthorizationService";
import {
  resolveBranchByDevice,
  fetchActiveBranches,
  registerPosDevice,
} from "./deviceBranchService";

const thenableQuery = ({ data, error }) => {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => Promise.resolve({ data, error })),
  };
  return query;
};

describe("deviceBranchService", () => {
  beforeEach(() => {
    supabase.rpc.mockReset();
    supabase.from.mockReset();
    authorizeAdminAction.mockReset();
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
      data: {
        success: false,
        message: "Este POS no está asignado a ninguna sucursal",
      },
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
    supabase.rpc.mockResolvedValue({
      data: null,
      error: { message: "network" },
    });

    const result = await resolveBranchByDevice("device-uuid");

    expect(result.success).toBe(false);
    expect(result.error).toBe("network");
  });
});

describe("fetchActiveBranches", () => {
  it("devuelve el catálogo de sucursales ordenado y solo activas", async () => {
    const branches = [
      { id: "b1", name: "Centro", code: "C01", city: "Cancún", state: "QR" },
      { id: "b2", name: "Norte", code: "C02", city: "Cancún", state: "QR" },
    ];
    const query = thenableQuery({ data: branches, error: null });
    supabase.from.mockReturnValue(query);

    const result = await fetchActiveBranches();

    expect(supabase.from).toHaveBeenCalledWith("branches");
    expect(query.eq).toHaveBeenCalledWith("is_active", true);
    expect(result).toEqual({ success: true, data: branches, error: null });
  });

  it("devuelve un arreglo vacío cuando no hay sucursales", async () => {
    supabase.from.mockReturnValue(thenableQuery({ data: null, error: null }));

    const result = await fetchActiveBranches();

    expect(result).toEqual({ success: true, data: [], error: null });
  });

  it("propaga el error de Supabase", async () => {
    supabase.from.mockReturnValue(
      thenableQuery({ data: null, error: { message: "permission denied" } })
    );

    const result = await fetchActiveBranches();

    expect(result.success).toBe(false);
    expect(result.data).toEqual([]);
    expect(result.error).toBe("permission denied");
  });
});

describe("registerPosDevice", () => {
  const credentials = {
    deviceCode: "device-uuid",
    branchId: "branch-1",
    username: "admin",
    password: "secreto",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registra el dispositivo en la edge function, sin RPC desde el cliente", async () => {
    authorizeAdminAction.mockResolvedValue({
      ok: true,
      authorizedBy: "user-1",
      device: {
        success: true,
        branch: { id: "branch-1", name: "Centro", code: "C01" },
      },
    });

    const result = await registerPosDevice(credentials);

    expect(authorizeAdminAction).toHaveBeenCalledWith({
      action: "register_pos_device",
      username: "admin",
      password: "secreto",
      branchId: "branch-1",
      deviceCode: "device-uuid",
    });
    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      branch: { id: "branch-1", name: "Centro", code: "C01" },
    });
  });

  it("devuelve el mensaje si la autorizacion o el registro fallan", async () => {
    authorizeAdminAction.mockResolvedValue({
      ok: false,
      message: "La sucursal no existe",
    });

    const result = await registerPosDevice(credentials);

    expect(result).toEqual({ success: false, error: "La sucursal no existe" });
  });

  it("falla si la edge function no devuelve la sucursal registrada", async () => {
    authorizeAdminAction.mockResolvedValue({
      ok: true,
      authorizedBy: "user-1",
      device: { success: true, branch: { name: "Sin id" } },
    });

    const result = await registerPosDevice(credentials);

    expect(result).toEqual({
      success: false,
      error: "No se pudo registrar el dispositivo.",
    });
  });

  it("captura excepciones inesperadas de la autorización", async () => {
    authorizeAdminAction.mockRejectedValue(new Error("boom"));

    const result = await registerPosDevice(credentials);

    expect(result.success).toBe(false);
    expect(result.error).toBe("boom");
  });
});
