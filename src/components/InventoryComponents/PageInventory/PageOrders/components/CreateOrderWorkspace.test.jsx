import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../hooks/useLocalProductsCatalog", () => ({
  useLocalProductsCatalog: () => ({ localProducts: [], reload: () => {} }),
}));

import CreateOrderWorkspace from "./CreateOrderWorkspace";

const buildForm = (overrides = {}) => ({
  orderName: "",
  setOrderName: () => {},
  destinationBranchId: "",
  setDestinationBranchId: () => {},
  destinationOptions: [{ id: "b2", name: "Norte" }],
  notes: "",
  setNotes: () => {},
  items: [],
  departmentSummary: [],
  totalUnits: 0,
  totalCost: 0,
  isValid: false,
  isSaving: false,
  error: "",
  searchOpen: false,
  setSearchOpen: vi.fn(),
  selectedProductIds: [],
  addProduct: () => true,
  handleCodeSubmit: () => false,
  updateQuantity: () => {},
  removeProduct: () => {},
  ...overrides,
});

const HINT = "Selecciona la sucursal destino para buscar productos";

const getSearchButton = () =>
  screen.getByRole("button", { name: /Buscar productos/ });
const getCodeInput = () => screen.getByPlaceholderText(/Escanea o escribe/);
const getAddButton = () => screen.getByRole("button", { name: /Agregar$/ });

describe("CreateOrderWorkspace sin sucursal destino", () => {
  it("deshabilita codigo, Agregar y Buscar productos", () => {
    const form = buildForm();

    render(<CreateOrderWorkspace form={form} products={[]} />);

    expect(getCodeInput().disabled).toBe(true);
    expect(getAddButton().disabled).toBe(true);
    expect(getSearchButton().disabled).toBe(true);

    fireEvent.click(getSearchButton());
    expect(form.setSearchOpen).not.toHaveBeenCalled();
  });

  it("muestra el aviso junto a Agregar por codigo de barras", () => {
    render(<CreateOrderWorkspace form={buildForm()} products={[]} />);

    const label = screen.getByText(HINT).closest("label");

    expect(label.textContent).toContain("Agregar por código de barras");
  });
});

describe("CreateOrderWorkspace con sucursal destino", () => {
  it("habilita el codigo, Agregar (con texto) y Buscar productos", () => {
    const form = buildForm({ destinationBranchId: "b2" });

    render(<CreateOrderWorkspace form={form} products={[]} />);

    expect(getCodeInput().disabled).toBe(false);
    expect(getSearchButton().disabled).toBe(false);
    expect(screen.queryByText(HINT)).toBeNull();

    fireEvent.change(getCodeInput(), { target: { value: "7501" } });
    expect(getAddButton().disabled).toBe(false);

    fireEvent.click(getSearchButton());
    expect(form.setSearchOpen).toHaveBeenCalledWith(true);
  });
});

describe("CreateOrderWorkspace sucursal origen", () => {
  it("no muestra el selector de origen en una terminal operativa", () => {
    render(<CreateOrderWorkspace form={buildForm()} products={[]} />);

    expect(screen.queryByText("Sucursal origen")).toBeNull();
  });

  it("muestra las operativas como origen en una terminal admin", () => {
    const setOriginBranchId = vi.fn();
    render(
      <CreateOrderWorkspace
        form={buildForm({
          canChooseOrigin: true,
          originBranchId: "",
          setOriginBranchId,
          originOptions: [
            { id: "b1", name: "Centro" },
            { id: "b2", name: "Norte" },
          ],
        })}
        products={[]}
      />
    );

    const select = screen
      .getByText("Sucursal origen")
      .closest("label")
      .querySelector("select");
    expect(select.value).toBe("");
    fireEvent.change(select, { target: { value: "b1" } });
    expect(setOriginBranchId).toHaveBeenCalledWith("b1");
  });
});
