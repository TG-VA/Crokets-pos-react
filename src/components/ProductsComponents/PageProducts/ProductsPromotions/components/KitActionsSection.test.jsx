import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import KitActionsSection from "./KitActionsSection";

const baseProps = {
  handleSaveKit: vi.fn(),
  saving: false,
  isFormComplete: false,
  missingFields: [],
  editingKit: null,
  handleClearForm: vi.fn(),
  handleCancelEdit: vi.fn(),
  removeSelectedProduct: vi.fn(),
  selectedProductId: null,
};

describe("KitActionsSection", () => {
  it("muestra los campos faltantes cuando el formulario esta incompleto", () => {
    render(
      <KitActionsSection
        {...baseProps}
        missingFields={["codigo de barras", "precio"]}
      />
    );

    expect(screen.getByRole("status").textContent).toBe(
      "Falta: codigo de barras, precio"
    );
    expect(screen.getByRole("button", { name: "Guardar kit" }).disabled).toBe(
      true
    );
  });

  it("oculta la ayuda y habilita guardar cuando el formulario esta completo", () => {
    render(<KitActionsSection {...baseProps} isFormComplete />);

    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByRole("button", { name: "Guardar kit" }).disabled).toBe(
      false
    );
  });
});
