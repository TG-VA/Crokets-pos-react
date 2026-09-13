import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("../lib/permissionsService", () => ({
  checkUserIsAdmin: vi.fn(),
}));

import { checkUserIsAdmin } from "../lib/permissionsService";
import useProtectedNavigation from "./useProtectedNavigation";

const protectedOption = {
  id: "ventas",
  label: "Ventas",
  path: "/reports/ventas",
  routePath: "/reports/ventas",
  routeLabel: "Ventas",
  action: "reports_sales_access",
};

const createEvent = () => ({ preventDefault: vi.fn() });

describe("useProtectedNavigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("navega directo si el item no está protegido (sin action)", async () => {
    const { result } = renderHook(() => useProtectedNavigation());
    const event = createEvent();

    await act(async () => {
      await result.current.handleNavigation({ path: "/reports" }, event);
    });

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(checkUserIsAdmin).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith("/reports");
    expect(result.current.adminAuthOpen).toBe(false);
  });

  it("navega directo si el usuario es admin", async () => {
    checkUserIsAdmin.mockResolvedValue(true);
    const { result } = renderHook(() => useProtectedNavigation());

    await act(async () => {
      await result.current.handleNavigation(protectedOption, createEvent());
    });

    expect(checkUserIsAdmin).toHaveBeenCalledWith("user-1");
    expect(navigateMock).toHaveBeenCalledWith("/reports/ventas");
    expect(result.current.adminAuthOpen).toBe(false);
    expect(result.current.pendingNavigation).toBeNull();
  });

  it("no navega y abre el modal si el usuario no es admin", async () => {
    checkUserIsAdmin.mockResolvedValue(false);
    const onProtectedAccessAuthorized = vi.fn();
    const { result } = renderHook(() =>
      useProtectedNavigation(onProtectedAccessAuthorized)
    );

    await act(async () => {
      await result.current.handleNavigation(protectedOption, createEvent());
    });

    expect(navigateMock).not.toHaveBeenCalled();
    expect(result.current.adminAuthOpen).toBe(true);
    expect(result.current.pendingNavigation).toEqual(protectedOption);
    expect(onProtectedAccessAuthorized).not.toHaveBeenCalled();
  });

  it("al autorizar registra la ruta y recién navega", async () => {
    checkUserIsAdmin.mockResolvedValue(false);
    const onProtectedAccessAuthorized = vi.fn();
    const { result } = renderHook(() =>
      useProtectedNavigation(onProtectedAccessAuthorized)
    );

    await act(async () => {
      await result.current.handleNavigation(protectedOption, createEvent());
    });

    act(() => {
      result.current.onAuthorizedAdminAuth();
    });

    expect(onProtectedAccessAuthorized).toHaveBeenCalledWith("/reports/ventas");
    expect(navigateMock).toHaveBeenCalledWith("/reports/ventas");
    expect(result.current.adminAuthOpen).toBe(false);
    expect(result.current.pendingNavigation).toBeNull();
  });

  it("al cerrar sin autorizar no navega y limpia el pendiente", async () => {
    checkUserIsAdmin.mockResolvedValue(false);
    const onProtectedAccessAuthorized = vi.fn();
    const { result } = renderHook(() =>
      useProtectedNavigation(onProtectedAccessAuthorized)
    );

    await act(async () => {
      await result.current.handleNavigation(protectedOption, createEvent());
    });

    act(() => {
      result.current.onCloseAdminAuth();
    });

    expect(onProtectedAccessAuthorized).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
    expect(result.current.adminAuthOpen).toBe(false);
    expect(result.current.pendingNavigation).toBeNull();
  });
});
