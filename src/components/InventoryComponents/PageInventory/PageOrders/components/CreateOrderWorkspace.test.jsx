import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../hooks/useLocalProductsCatalog", () => ({
  useLocalProductsCatalog: () => [],
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

const getSearchButton = () =>
  screen.getByRole("button", { name: /Buscar productos/ });

describe("CreateOrderWorkspace buscar productos", () => {
  it("bloquea la busqueda hasta elegir la sucursal destino", () => {
    const form = buildForm();

    render(<CreateOrderWorkspace form={form} products={[]} />);

    expect(getSearchButton().disabled).toBe(true);
    expect(
      screen.getByText("Selecciona la sucursal destino para buscar productos.")
    ).toBeTruthy();

    fireEvent.click(getSearchButton());
    expect(form.setSearchOpen).not.toHaveBeenCalled();
  });

  it("habilita la busqueda cuando ya hay sucursal destino", () => {
    const form = buildForm({ destinationBranchId: "b2" });

    render(<CreateOrderWorkspace form={form} products={[]} />);

    expect(getSearchButton().disabled).toBe(false);
    expect(
      screen.queryByText(
        "Selecciona la sucursal destino para buscar productos."
      )
    ).toBeNull();

    fireEvent.click(getSearchButton());
    expect(form.setSearchOpen).toHaveBeenCalledWith(true);
  });
});
