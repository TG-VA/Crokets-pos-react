import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const authState = { user: { id: "user-1" } };

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("../lib/permissionsService", () => ({
  checkUserIsAdmin: vi.fn(),
}));

import { checkUserIsAdmin } from "../lib/permissionsService";
import { useIsAdmin } from "./useIsAdmin";

// Gateo de interfaz: no es un control de seguridad.
describe("useIsAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.user = { id: "user-1" };
  });

  it("consulta con el id del usuario y devuelve true para admin", async () => {
    checkUserIsAdmin.mockResolvedValue(true);
    const { result } = renderHook(() => useIsAdmin());

    await waitFor(() => expect(result.current).toBe(true));
    expect(checkUserIsAdmin).toHaveBeenCalledWith("user-1");
  });

  it("devuelve false para un no administrador", async () => {
    checkUserIsAdmin.mockResolvedValue(false);
    const { result } = renderHook(() => useIsAdmin());

    await waitFor(() => expect(checkUserIsAdmin).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });

  it("sin usuario devuelve false sin consultar", () => {
    authState.user = null;
    const { result } = renderHook(() => useIsAdmin());

    expect(result.current).toBe(false);
    expect(checkUserIsAdmin).not.toHaveBeenCalled();
  });
});
