import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  user: { id: "u1" },
  checkUserIsAdmin: vi.fn(),
}));

vi.mock("../../../../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: mocks.user }),
}));
vi.mock("../../../../../lib/permissionsService", () => ({
  checkUserIsAdmin: mocks.checkUserIsAdmin,
}));

import { useHistoryDestinationLock } from "./useHistoryDestinationLock";

describe("useHistoryDestinationLock", () => {
  beforeEach(() => {
    mocks.user = { id: "u1" };
    mocks.checkUserIsAdmin.mockReset();
  });

  it("bloquea el destino a la sucursal activa para un no administrador", async () => {
    mocks.checkUserIsAdmin.mockResolvedValue(false);

    const { result } = renderHook(() => useHistoryDestinationLock("b1"));

    await waitFor(() => expect(mocks.checkUserIsAdmin).toHaveBeenCalled());
    expect(result.current).toBe("b1");
  });

  it("libera el destino para un administrador", async () => {
    mocks.checkUserIsAdmin.mockResolvedValue(true);

    const { result } = renderHook(() => useHistoryDestinationLock("b1"));

    await waitFor(() => expect(result.current).toBeNull());
  });

  it("trata un usuario nulo como no administrador", async () => {
    mocks.user = null;
    mocks.checkUserIsAdmin.mockResolvedValue(false);

    const { result } = renderHook(() => useHistoryDestinationLock("b1"));

    await waitFor(() =>
      expect(mocks.checkUserIsAdmin).toHaveBeenCalledWith(undefined)
    );
    expect(result.current).toBe("b1");
  });

  it("no bloquea si no hay sucursal activa", async () => {
    mocks.checkUserIsAdmin.mockResolvedValue(false);

    const { result } = renderHook(() => useHistoryDestinationLock(""));

    await waitFor(() => expect(mocks.checkUserIsAdmin).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });

  it("sigue la sucursal activa cuando cambia", async () => {
    mocks.checkUserIsAdmin.mockResolvedValue(false);

    const { result, rerender } = renderHook(
      ({ branchId }) => useHistoryDestinationLock(branchId),
      { initialProps: { branchId: "b1" } }
    );

    rerender({ branchId: "b2" });

    await waitFor(() => expect(result.current).toBe("b2"));
  });

  it("mantiene el destino bloqueado si falla la verificacion de rol", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mocks.checkUserIsAdmin.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useHistoryDestinationLock("b1"));

    await waitFor(() => expect(errorSpy).toHaveBeenCalled());
    expect(result.current).toBe("b1");

    errorSpy.mockRestore();
  });
});
