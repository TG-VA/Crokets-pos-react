import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

import useSettingsBranches, {
  BRANCH_STATUS_FILTERS,
} from "./useSettingsBranches";

const { useAuth } = vi.hoisted(() => ({ useAuth: vi.fn() }));
const { checkUserIsAdmin } = vi.hoisted(() => ({
  checkUserIsAdmin: vi.fn(),
}));
const { fetchBranchesCatalog } = vi.hoisted(() => ({
  fetchBranchesCatalog: vi.fn(),
}));
const { createBranch, updateBranchContact, setBranchActive } = vi.hoisted(
  () => ({
    createBranch: vi.fn(),
    updateBranchContact: vi.fn(),
    setBranchActive: vi.fn(),
  })
);

vi.mock("../../../../../contexts/AuthContext", () => ({ useAuth }));
vi.mock("../../../../../lib/permissionsService", () => ({ checkUserIsAdmin }));
vi.mock("../services/branchesReportService", () => ({ fetchBranchesCatalog }));
vi.mock("../services/branchesMutationService", () => ({
  createBranch,
  updateBranchContact,
  setBranchActive,
}));

const catalog = [
  {
    id: "b1",
    code: "CEN",
    name: "Centro",
    city: "Cancún",
    state: "QR",
    phone: null,
    email: null,
    address: null,
    timezone: "America/Cancun",
    isActive: true,
    posDevicesCount: 1,
  },
  {
    id: "b2",
    code: "NTE",
    name: "Norte",
    city: "Mérida",
    state: "YU",
    phone: null,
    email: null,
    address: null,
    timezone: "America/Cancun",
    isActive: false,
    posDevicesCount: 0,
  },
];

describe("useSettingsBranches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: "admin-1" } });
    checkUserIsAdmin.mockResolvedValue(true);
    fetchBranchesCatalog.mockResolvedValue({
      success: true,
      data: catalog,
      error: null,
    });
  });

  it("carga el catalogo y determina el rol admin", async () => {
    const { result } = renderHook(() => useSettingsBranches());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.branches).toHaveLength(2);
    expect(result.current.totalBranches).toBe(2);
    expect(result.current.metrics).toEqual({
      total: 2,
      active: 1,
      inactive: 1,
      terminals: 1,
    });
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.adminChecked).toBe(true);
  });

  it("expone el error de carga cuando el servicio falla", async () => {
    fetchBranchesCatalog.mockResolvedValue({
      success: false,
      data: [],
      error: "No se pudo cargar el catálogo de sucursales.",
    });

    const { result } = renderHook(() => useSettingsBranches());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.loadError).toBe(
      "No se pudo cargar el catálogo de sucursales."
    );
    expect(result.current.branches).toEqual([]);
  });

  it("filtra por estatus y termino de busqueda", async () => {
    const { result } = renderHook(() => useSettingsBranches());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setStatusFilter(BRANCH_STATUS_FILTERS.INACTIVE));
    expect(result.current.branches.map((b) => b.id)).toEqual(["b2"]);

    act(() => result.current.setStatusFilter(BRANCH_STATUS_FILTERS.ALL));
    act(() => result.current.setSearchTerm("cen"));
    expect(result.current.branches.map((b) => b.id)).toEqual(["b1"]);

    act(() => result.current.setSearchTerm("zzz"));
    expect(result.current.branches).toEqual([]);
  });

  it("abre y cierra el modal de formulario", async () => {
    const { result } = renderHook(() => useSettingsBranches());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.openCreateModal());
    expect(result.current.formModal).toEqual({ isOpen: true, branch: null });

    act(() => result.current.openEditModal(catalog[0]));
    expect(result.current.formModal.branch.id).toBe("b1");

    act(() => result.current.closeFormModal());
    expect(result.current.formModal).toEqual({ isOpen: false, branch: null });
  });

  it("crea una sucursal con adminId del contexto y recarga el catalogo", async () => {
    createBranch.mockResolvedValue({
      success: true,
      data: { id: "b3", name: "Sur" },
      error: null,
    });
    const { result } = renderHook(() => useSettingsBranches());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      const ok = await result.current.handleCreateBranch({
        code: "SUR",
        name: "Sur",
      });
      expect(ok).toBe(true);
    });

    expect(createBranch).toHaveBeenCalledWith(
      expect.objectContaining({ code: "SUR", adminId: "admin-1" })
    );
    expect(result.current.feedback.type).toBe("success");
    expect(result.current.formModal.isOpen).toBe(false);
    expect(fetchBranchesCatalog).toHaveBeenCalledTimes(2);
  });

  it("muestra feedback de error cuando la creacion falla", async () => {
    createBranch.mockResolvedValue({
      success: false,
      data: null,
      error: "Ya existe una sucursal con ese código.",
    });
    const { result } = renderHook(() => useSettingsBranches());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.openCreateModal());

    await act(async () => {
      await result.current.handleCreateBranch({ code: "CEN", name: "Centro" });
    });

    expect(result.current.feedback).toEqual({
      type: "error",
      message: "Ya existe una sucursal con ese código.",
    });
    expect(result.current.formModal.isOpen).toBe(true);
  });

  it("desactiva una sucursal y recarga el catalogo", async () => {
    setBranchActive.mockResolvedValue({
      success: true,
      data: { id: "b1", name: "Centro" },
      error: null,
    });
    const { result } = renderHook(() => useSettingsBranches());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.openToggleModal(catalog[0]));

    await act(async () => {
      const ok = await result.current.handleToggleStatus(catalog[0], false);
      expect(ok).toBe(true);
    });

    expect(setBranchActive).toHaveBeenCalledWith({
      branchId: "b1",
      isActive: false,
      adminId: "admin-1",
    });
    expect(result.current.toggleModal.isOpen).toBe(false);
    expect(result.current.feedback.type).toBe("success");
  });

  it("propaga el bloqueo operativo del backend como feedback de error", async () => {
    setBranchActive.mockResolvedValue({
      success: false,
      data: null,
      error: "No se puede desactivar: hay 1 sesión(es) de caja abierta(s).",
      blockers: { openCashSessions: 1 },
    });
    const { result } = renderHook(() => useSettingsBranches());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleToggleStatus(catalog[0], false);
    });

    expect(result.current.feedback.type).toBe("error");
    expect(result.current.feedback.message).toContain(
      "sesión(es) de caja abierta(s)"
    );
  });

  it("actualiza datos de contacto y recarga el catalogo", async () => {
    updateBranchContact.mockResolvedValue({
      success: true,
      data: { id: "b1", name: "Centro Norte" },
      error: null,
    });
    const { result } = renderHook(() => useSettingsBranches());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      const ok = await result.current.handleUpdateBranch("b1", {
        name: "Centro Norte",
      });
      expect(ok).toBe(true);
    });

    expect(updateBranchContact).toHaveBeenCalledWith("b1", {
      name: "Centro Norte",
    });
    expect(result.current.feedback.type).toBe("success");
  });

  it("bloquea la modificacion y cambio de estatus si el usuario no es admin", async () => {
    checkUserIsAdmin.mockResolvedValue(false);
    const { result } = renderHook(() => useSettingsBranches());
    await waitFor(() => expect(result.current.adminChecked).toBe(true));

    await act(async () => {
      const okCreate = await result.current.handleCreateBranch({
        code: "CEN",
        name: "Centro",
      });
      expect(okCreate).toBe(false);
    });
    expect(createBranch).not.toHaveBeenCalled();

    await act(async () => {
      const okUpdate = await result.current.handleUpdateBranch("b1", {
        name: "Nuevo",
      });
      expect(okUpdate).toBe(false);
    });
    expect(updateBranchContact).not.toHaveBeenCalled();
    expect(result.current.feedback.type).toBe("error");

    await act(async () => {
      const okToggle = await result.current.handleToggleStatus(
        catalog[0],
        false
      );
      expect(okToggle).toBe(false);
    });
    expect(setBranchActive).not.toHaveBeenCalled();
  });

  it("ordena el listado alfabeticamente A-Z", async () => {
    fetchBranchesCatalog.mockResolvedValue({
      success: true,
      data: [
        { ...catalog[0], id: "z", name: "Zapata" },
        { ...catalog[1], id: "a", name: "Acapulco" },
        { ...catalog[0], id: "m", name: "Mérida" },
      ],
      error: null,
    });

    const { result } = renderHook(() => useSettingsBranches());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.branches.map((b) => b.name)).toEqual([
      "Acapulco",
      "Mérida",
      "Zapata",
    ]);
  });

  it("busca sin distinguir acentos ni mayusculas en name, code, city y state", async () => {
    const { result } = renderHook(() => useSettingsBranches());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setSearchTerm("cancun"));
    expect(result.current.branches.map((b) => b.id)).toEqual(["b1"]);

    act(() => result.current.setSearchTerm("yu"));
    expect(result.current.branches.map((b) => b.id)).toEqual(["b2"]);

    act(() => result.current.setSearchTerm("cen"));
    expect(result.current.branches.map((b) => b.id)).toEqual(["b1"]);

    act(() => result.current.setSearchTerm("merida"));
    expect(result.current.branches.map((b) => b.id)).toEqual(["b2"]);
  });

  it("sanea el termino de busqueda y limita su longitud", async () => {
    const { result } = renderHook(() => useSettingsBranches());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setSearchTerm("  cen  "));
    expect(result.current.searchTerm).toBe("cen");

    act(() => result.current.setSearchTerm("a".repeat(80)));
    expect(result.current.searchTerm).toHaveLength(50);
  });

  it("pagina el listado con 5 elementos por defecto", async () => {
    fetchBranchesCatalog.mockResolvedValue({
      success: true,
      data: Array.from({ length: 12 }, (_, index) => ({
        ...catalog[0],
        id: `b${index}`,
        name: `Sucursal ${String(index).padStart(2, "0")}`,
      })),
      error: null,
    });

    const { result } = renderHook(() => useSettingsBranches());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.branches).toHaveLength(5);
    expect(result.current.filteredCount).toBe(12);
    expect(result.current.pagination.currentPage).toBe(1);
    expect(result.current.pagination.totalPages).toBe(3);

    act(() => result.current.pagination.setPage(2));
    expect(result.current.pagination.currentPage).toBe(2);
    expect(result.current.branches[0].name).toBe("Sucursal 05");
  });

  it("permite mostrar todas las sucursales sin paginar", async () => {
    fetchBranchesCatalog.mockResolvedValue({
      success: true,
      data: Array.from({ length: 8 }, (_, index) => ({
        ...catalog[0],
        id: `b${index}`,
        name: `Sucursal ${index}`,
      })),
      error: null,
    });

    const { result } = renderHook(() => useSettingsBranches());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.pagination.setPageSize("all"));
    expect(result.current.branches).toHaveLength(8);
    expect(result.current.pagination.totalPages).toBe(1);
  });

  it("resetea a la pagina 1 al buscar o cambiar de filtro", async () => {
    fetchBranchesCatalog.mockResolvedValue({
      success: true,
      data: Array.from({ length: 12 }, (_, index) => ({
        ...catalog[0],
        id: `b${index}`,
        name: `Sucursal ${String(index).padStart(2, "0")}`,
      })),
      error: null,
    });

    const { result } = renderHook(() => useSettingsBranches());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.pagination.setPage(3));
    expect(result.current.pagination.currentPage).toBe(3);

    act(() => result.current.setSearchTerm("sucursal"));
    expect(result.current.pagination.currentPage).toBe(1);

    act(() => result.current.pagination.setPage(2));
    act(() => result.current.setStatusFilter(BRANCH_STATUS_FILTERS.ACTIVE));
    expect(result.current.pagination.currentPage).toBe(1);
  });
});
