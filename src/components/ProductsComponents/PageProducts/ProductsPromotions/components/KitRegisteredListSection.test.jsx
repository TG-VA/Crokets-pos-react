import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, fireEvent } from "@testing-library/react";
import KitRegisteredListSection from "./KitRegisteredListSection";

const makeKit = (id, endsOn) => ({
  id,
  is_active: true,
  starts_on: null,
  ends_on: endsOn,
  products: { name: `Kit ${id}`, barcode: `B${id}`, sale_price: 100 },
});

const pagination = {
  currentPage: 1,
  totalPages: 1,
  pageSize: 10,
  startIndex: 0,
  endIndex: 2,
  handlePageChange: vi.fn(),
  handlePageSizeChange: vi.fn(),
};

const buildProps = (overrides = {}) => {
  const kits = [makeKit(1, "2026-11-12"), makeKit(2, "2026-12-30")];
  return {
    kits,
    visibleKits: kits,
    totalKits: kits.length,
    searchTerm: "",
    onSearchTermChange: vi.fn(),
    status: "all",
    onStatusChange: vi.fn(),
    sortCriterion: null,
    onSortCriterionChange: vi.fn(),
    expiringCount: 1,
    expiringKitIds: new Set([1]),
    expiringOnly: false,
    onToggleExpiringOnly: vi.fn(),
    pagination,
    pageSizeOptions: [5, 10, 20],
    editingKit: null,
    handleEditKit: vi.fn(),
    handleToggleKitStatus: vi.fn(),
    handleSoftDeleteKit: vi.fn(),
    handleRenewKitValidity: vi.fn(),
    canManageKits: true,
    ...overrides,
  };
};

describe("KitRegisteredListSection por vencer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-10T18:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("marca con insignia solo los kits por vencer", () => {
    render(<KitRegisteredListSection {...buildProps()} />);

    expect(screen.getAllByText("Por vencer")).toHaveLength(1);
  });

  it("muestra la franja con el conteo y alterna el filtro al hacer clic", () => {
    const props = buildProps();
    render(<KitRegisteredListSection {...props} />);

    const strip = screen.getByRole("button", { name: /1 kit por vencer/i });
    fireEvent.click(strip);

    expect(props.onToggleExpiringOnly).toHaveBeenCalledTimes(1);
  });

  it("oculta la franja cuando no hay kits por vencer", () => {
    render(
      <KitRegisteredListSection
        {...buildProps({ expiringCount: 0, expiringKitIds: new Set() })}
      />
    );

    expect(screen.queryByRole("button", { name: /por vencer/i })).toBeNull();
  });
});

describe("KitRegisteredListSection renovar vigencia", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-10T18:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("muestra Renovar vigencia solo en kits vencidos o por vencer", () => {
    const kits = [
      makeKit(1, "2026-11-12"),
      makeKit(2, "2026-12-30"),
      makeKit(3, "2026-11-01"),
    ];
    render(
      <KitRegisteredListSection
        {...buildProps({ kits, visibleKits: kits, totalKits: 3 })}
      />
    );

    expect(
      screen.getAllByRole("button", { name: "Renovar vigencia" })
    ).toHaveLength(2);
  });

  it("abre el formulario de fechas y envia el rango capturado", () => {
    const props = buildProps();
    render(<KitRegisteredListSection {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "Renovar vigencia" }));
    fireEvent.change(screen.getByLabelText("Nueva fecha de fin"), {
      target: { value: "31/12/2026" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar vigencia" }));

    expect(props.handleRenewKitValidity).toHaveBeenCalledWith(
      props.kits[0],
      { starts_on: null, ends_on: "2026-12-31" },
      expect.any(Function)
    );
  });

  it("el formulario sigue abierto hasta que la renovacion se confirma", () => {
    const props = buildProps();
    render(<KitRegisteredListSection {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "Renovar vigencia" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar vigencia" }));

    expect(screen.getByLabelText("Nueva fecha de fin")).toBeTruthy();

    const onSuccess = props.handleRenewKitValidity.mock.calls[0][2];
    act(() => onSuccess());
    expect(screen.queryByLabelText("Nueva fecha de fin")).toBeNull();
  });

  it("cancelar cierra el formulario sin enviar", () => {
    const props = buildProps();
    render(<KitRegisteredListSection {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "Renovar vigencia" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByLabelText("Nueva fecha de fin")).toBeNull();
    expect(props.handleRenewKitValidity).not.toHaveBeenCalled();
  });
});

// Gateo de interfaz por rol; no es un control de seguridad.
describe("KitRegisteredListSection gateo por rol", () => {
  it("un administrador ve Editar y Eliminar", () => {
    render(<KitRegisteredListSection {...buildProps()} />);

    expect(screen.getAllByRole("button", { name: "Editar" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Eliminar" })).toHaveLength(2);
  });

  it("un no administrador no ve Editar ni Eliminar pero si la lista", () => {
    render(
      <KitRegisteredListSection {...buildProps({ canManageKits: false })} />
    );

    expect(screen.queryByRole("button", { name: "Editar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Eliminar" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Renovar vigencia" })
    ).toBeNull();
    expect(screen.getByText("Kit 1")).toBeTruthy();
  });
});
