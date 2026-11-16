import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const hookState = vi.hoisted(() => ({ isAdminTerminal: false }));

vi.mock("./hooks/useProductsNew", () => ({
  useProductsNew: () => ({
    bodyRef: { current: null },
    form: {
      codigo: "",
      descripcion: "",
      status: "activo",
      isGlobal: false,
      use_inventory: true,
      existencia: 0,
      minimo: 0,
      maximo: 0,
    },
    errors: {},
    saving: false,
    appModal: { isOpen: false },
    satClaves: [],
    loadingSatClaves: false,
    activeDepartments: [],
    ganancia: 0,
    usesInventory: true,
    isAdminTerminal: hookState.isAdminTerminal,
    isFormValid: false,
    setSubmitArmed: vi.fn(),
    updateField: vi.fn(),
    markTouched: vi.fn(),
    handleSubmit: vi.fn(),
    closeAppModal: vi.fn(),
    handleContentKeyDown: vi.fn(),
    preventNumberScrollChange: vi.fn(),
    preventNumberArrows: vi.fn(),
    showError: () => false,
  }),
}));

vi.mock("../../../AppModal/AppModal", () => ({ default: () => null }));

import ProductsNew from "./ProductsNew";

const globalSelect = () =>
  screen.getByText("Global").parentElement.querySelector("select");

const stockInputs = (container) =>
  ["existencia", "minimo", "maximo"].map((name) =>
    container.querySelector(`input[name="${name}"]`)
  );

describe("ProductsNew por tipo de terminal", () => {
  it("una terminal operativa elige alcance y captura stock", () => {
    hookState.isAdminTerminal = false;
    const { container } = render(<ProductsNew />);

    expect(globalSelect().disabled).toBe(false);
    expect(globalSelect().value).toBe("inactivo");
    stockInputs(container).forEach((input) =>
      expect(input.disabled).toBe(false)
    );
  });

  it("una terminal admin crea global y sin stock editable", () => {
    hookState.isAdminTerminal = true;
    const { container } = render(<ProductsNew />);

    expect(globalSelect().disabled).toBe(true);
    expect(globalSelect().value).toBe("activo");
    stockInputs(container).forEach((input) =>
      expect(input.disabled).toBe(true)
    );
    expect(screen.getByText(/Sucursal administrativa/)).toBeTruthy();
  });
});
