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
import { useAdminStatus, useIsAdmin } from "./useIsAdmin";

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

  it("al cambiar de usuario no conserva el rol del anterior", async () => {
    checkUserIsAdmin.mockResolvedValueOnce(true);
    const { result, rerender } = renderHook(() => useIsAdmin());
    await waitFor(() => expect(result.current).toBe(true));

    checkUserIsAdmin.mockReturnValueOnce(new Promise(() => {}));
    authState.user = { id: "user-2" };
    rerender();

    expect(result.current).toBe(false);
    expect(checkUserIsAdmin).toHaveBeenLastCalledWith("user-2");
  });

  it("useAdminStatus marca loading hasta que responde el rol", async () => {
    let resolveRole;
    checkUserIsAdmin.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRole = resolve;
      })
    );
    const { result } = renderHook(() => useAdminStatus());

    expect(result.current).toEqual({ isAdmin: false, loading: true });

    resolveRole(false);
    await waitFor(() =>
      expect(result.current).toEqual({ isAdmin: false, loading: false })
    );
  });

  it("useAdminStatus sin usuario no queda en loading", () => {
    authState.user = null;
    const { result } = renderHook(() => useAdminStatus());

    expect(result.current).toEqual({ isAdmin: false, loading: false });
  });
});
