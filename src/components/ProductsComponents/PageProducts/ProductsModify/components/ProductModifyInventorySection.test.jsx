import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import ProductModifyInventorySection from "./ProductModifyInventorySection";

const renderSection = (props = {}) =>
  render(
    <ProductModifyInventorySection
      form={{ use_inventory: true, minimo: 1, maximo: 5 }}
      usesInventory
      updateField={vi.fn()}
      markTouched={vi.fn()}
      selectedProduct={{ existencia: 3 }}
      getFieldClassName={() => ""}
      renderError={() => null}
      preventNumberScrollChange={vi.fn()}
      preventNumberArrows={vi.fn()}
      {...props}
    />
  );

const stockInputs = (container) => [
  container.querySelector('input[name="minimo"]'),
  container.querySelector('input[name="maximo"]'),
];

describe("ProductModifyInventorySection", () => {
  it("permite editar minimo y maximo en una terminal operativa", () => {
    const { container } = renderSection();

    stockInputs(container).forEach((input) =>
      expect(input.disabled).toBe(false)
    );
    expect(screen.queryByText(/Sucursal administrativa/)).toBeNull();
  });

  it("deshabilita minimo y maximo y avisa en una terminal admin", () => {
    const { container } = renderSection({ isAdminTerminal: true });

    stockInputs(container).forEach((input) =>
      expect(input.disabled).toBe(true)
    );
    expect(screen.getByText(/Sucursal administrativa/)).toBeTruthy();
  });
});
