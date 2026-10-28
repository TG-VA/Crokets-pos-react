import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import ReceiptNoteField from "./ReceiptNoteField";

const renderField = (props = {}) =>
  render(
    <ReceiptNoteField
      value=""
      isRequired={false}
      error=""
      isDisabled={false}
      onChange={vi.fn()}
      {...props}
    />
  );

describe("ReceiptNoteField", () => {
  it("indica si la nota es opcional u obligatoria", () => {
    const { rerender } = renderField();

    expect(screen.getByText("Nota (opcional)")).toBeTruthy();

    rerender(
      <ReceiptNoteField
        value=""
        isRequired
        error=""
        isDisabled={false}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText("Nota (obligatoria por diferencias)")).toBeTruthy();
  });

  it("notifica el texto escrito", () => {
    const onChange = vi.fn();

    renderField({ onChange });
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Faltó una bolsa" },
    });

    expect(onChange).toHaveBeenCalledWith("Faltó una bolsa");
  });

  it("muestra el error como alerta y marca el campo invalido", () => {
    renderField({ error: "La nota es obligatoria." });

    expect(screen.getByRole("alert").textContent).toBe(
      "La nota es obligatoria."
    );
    expect(screen.getByRole("textbox").getAttribute("aria-invalid")).toBe(
      "true"
    );
  });
});
