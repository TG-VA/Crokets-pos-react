import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import SettingsBranches from "./SettingsBranches";
import { BRANCH_STATUS_FILTERS } from "./hooks/useSettingsBranches";

const hookResult = vi.hoisted(() => ({ current: null }));

vi.mock("./hooks/useSettingsBranches", async () => {
  const actual = await vi.importActual("./hooks/useSettingsBranches");
  return {
    ...actual,
    default: () => hookResult.current,
  };
});

const buildHookState = (overrides = {}) => ({
  branches: [
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
      posDevicesCount: 2,
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
  ],
  totalBranches: 2,
  metrics: { total: 2, active: 1, inactive: 1, terminals: 2 },
  loading: false,
  loadError: null,
  isAdmin: true,
  adminChecked: true,
  statusFilter: BRANCH_STATUS_FILTERS.ALL,
  setStatusFilter: vi.fn(),
  searchTerm: "",
  setSearchTerm: vi.fn(),
  saving: false,
  feedback: null,
  clearFeedback: vi.fn(),
  formModal: { isOpen: false, branch: null },
  toggleModal: { isOpen: false, branch: null },
  openCreateModal: vi.fn(),
  openEditModal: vi.fn(),
  closeFormModal: vi.fn(),
  openToggleModal: vi.fn(),
  closeToggleModal: vi.fn(),
  handleCreateBranch: vi.fn(),
  handleUpdateBranch: vi.fn(),
  handleToggleStatus: vi.fn(),
  refresh: vi.fn(),
  ...overrides,
});

describe("SettingsBranches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookResult.current = buildHookState();
  });

  it("renderiza el encabezado y el listado de sucursales", () => {
    render(<SettingsBranches />);

    expect(screen.getByRole("heading", { name: "Sucursales" })).toBeTruthy();
    expect(screen.getByText("Centro")).toBeTruthy();
    expect(screen.getByText("Norte")).toBeTruthy();
    expect(screen.getByText("Cancún, QR")).toBeTruthy();
    expect(screen.getByText("Activa")).toBeTruthy();
    expect(screen.getByText("Inactiva")).toBeTruthy();
    expect(screen.getByText("2 sucursales encontradas")).toBeTruthy();
    expect(
      screen.getByText("Total de Sucursales").previousSibling.textContent
    ).toBe("2");
    expect(
      screen.getByText("Sucursales Activas").previousSibling.textContent
    ).toBe("1");
    expect(
      screen.getByText("Sucursales Inactivas").previousSibling.textContent
    ).toBe("1");
    expect(screen.getByText("Terminales POS").previousSibling.textContent).toBe(
      "2"
    );
  });

  it("abre el modal de creacion al pulsar Nueva Sucursal", () => {
    const state = buildHookState();
    hookResult.current = state;
    render(<SettingsBranches />);

    fireEvent.click(screen.getByRole("button", { name: /Nueva Sucursal/ }));

    expect(state.openCreateModal).toHaveBeenCalledTimes(1);
  });

  it("abre el modal de edicion desde la fila de la tabla", () => {
    const state = buildHookState();
    hookResult.current = state;
    render(<SettingsBranches />);

    fireEvent.click(screen.getByRole("button", { name: "Editar Centro" }));

    expect(state.openEditModal).toHaveBeenCalledWith(
      expect.objectContaining({ id: "b1", name: "Centro" })
    );
  });

  it("abre el modal de cambio de estatus desde la fila", () => {
    const state = buildHookState();
    hookResult.current = state;
    render(<SettingsBranches />);

    fireEvent.click(screen.getByRole("button", { name: "Desactivar Centro" }));

    expect(state.openToggleModal).toHaveBeenCalledWith(
      expect.objectContaining({ id: "b1" })
    );
  });

  it("deshabilita acciones de gestion cuando el usuario no es admin", () => {
    hookResult.current = buildHookState({ isAdmin: false });
    render(<SettingsBranches />);

    expect(
      screen.getByRole("button", { name: /Nueva Sucursal/ }).disabled
    ).toBe(true);
    expect(screen.getByRole("button", { name: "Editar Centro" }).disabled).toBe(
      true
    );
    expect(
      screen.getByRole("button", { name: "Desactivar Centro" }).disabled
    ).toBe(true);
    expect(screen.getByText(/Vista de solo lectura/)).toBeTruthy();
  });

  it("muestra el estado de carga", () => {
    hookResult.current = buildHookState({
      loading: true,
      branches: [],
      totalBranches: 0,
    });
    render(<SettingsBranches />);

    expect(screen.getByText("Cargando sucursales...")).toBeTruthy();
  });

  it("muestra el error de carga con role alert", () => {
    hookResult.current = buildHookState({
      branches: [],
      totalBranches: 0,
      loadError: "No se pudo cargar el catálogo de sucursales.",
    });
    render(<SettingsBranches />);

    expect(screen.getByRole("alert").textContent).toContain(
      "No se pudo cargar el catálogo"
    );
  });

  it("muestra el feedback de exito y de error con roles correctos", () => {
    hookResult.current = buildHookState({
      feedback: { type: "success", message: "Sucursal creada correctamente." },
    });
    const { unmount } = render(<SettingsBranches />);
    expect(screen.getByRole("status").textContent).toContain(
      "Sucursal creada correctamente."
    );
    unmount();

    hookResult.current = buildHookState({
      feedback: { type: "error", message: "Bloqueo operativo." },
    });
    render(<SettingsBranches />);
    expect(screen.getByRole("alert").textContent).toContain(
      "Bloqueo operativo."
    );
  });

  it("delega el filtro de estatus y la busqueda al hook", () => {
    const state = buildHookState({ searchTerm: "cen" });
    hookResult.current = state;
    render(<SettingsBranches />);

    fireEvent.click(screen.getByRole("button", { name: "Inactivas" }));
    expect(state.setStatusFilter).toHaveBeenCalledWith(
      BRANCH_STATUS_FILTERS.INACTIVE
    );

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "norte" },
    });
    expect(state.setSearchTerm).toHaveBeenCalledWith("norte");
  });

  it("renderiza el modal de formulario cuando el hook lo abre", () => {
    hookResult.current = buildHookState({
      formModal: { isOpen: true, branch: null },
    });
    render(<SettingsBranches />);

    expect(screen.getByRole("dialog", { name: "Nueva sucursal" })).toBeTruthy();
  });

  it("cierra el modal de formulario con el boton de cerrar", () => {
    const state = buildHookState({
      formModal: { isOpen: true, branch: null },
    });
    hookResult.current = state;
    render(<SettingsBranches />);

    fireEvent.click(screen.getByRole("button", { name: "Cerrar formulario" }));

    expect(state.closeFormModal).toHaveBeenCalledTimes(1);
  });

  it("muestra el boton para limpiar la busqueda cuando hay texto", () => {
    const state = buildHookState({ searchTerm: "cen" });
    hookResult.current = state;
    render(<SettingsBranches />);

    fireEvent.click(screen.getByRole("button", { name: "Limpiar búsqueda" }));

    expect(state.setSearchTerm).toHaveBeenCalledWith("");
  });

  it("renderiza el modal de cambio de estatus con advertencias", () => {
    hookResult.current = buildHookState({
      toggleModal: {
        isOpen: true,
        branch: buildHookState().branches[0],
      },
    });
    render(<SettingsBranches />);

    const dialog = screen.getByRole("dialog", {
      name: "Desactivar sucursal",
    });
    expect(dialog).toBeTruthy();
    expect(dialog.textContent).toContain("terminal(es) POS");
  });
});
