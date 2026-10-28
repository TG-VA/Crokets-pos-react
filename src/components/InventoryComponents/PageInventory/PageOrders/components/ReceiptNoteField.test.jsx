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

    expect(screen.getByText("Nota de recepción")).toBeTruthy();
    expect(screen.getByText("Opcional")).toBeTruthy();

    rerender(
      <ReceiptNoteField
        value=""
        isRequired
        error=""
        isDisabled={false}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText("Obligatoria")).toBeTruthy();
  });

  it("muestra el contador y cambia de tono cerca del limite", () => {
    const { rerender } = renderField();

    expect(screen.getByText("0 / 500")).toBeTruthy();
    expect(screen.getByRole("textbox").getAttribute("aria-describedby")).toBe(
      "receipt-note-help receipt-note-counter"
    );

    rerender(
      <ReceiptNoteField
        value={"a".repeat(450)}
        isRequired={false}
        error=""
        isDisabled={false}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText("450 / 500").className).toContain("counterWarning");

    rerender(
      <ReceiptNoteField
        value={"a".repeat(500)}
        isRequired={false}
        error=""
        isDisabled={false}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText("500 / 500").className).toContain("counterError");
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
    expect(screen.getByRole("textbox").getAttribute("aria-describedby")).toBe(
      "receipt-note-error receipt-note-counter"
    );
  });

  it("solo anuncia el contador a lectores de pantalla cerca del limite", () => {
    const { container, rerender } = renderField({ value: "Nota corta" });
    const counter = () => container.querySelector("#receipt-note-counter");

    expect(counter().getAttribute("aria-live")).toBe("off");

    rerender(
      <ReceiptNoteField
        value={"a".repeat(450)}
        isRequired={false}
        error=""
        isDisabled={false}
        onChange={vi.fn()}
      />
    );

    expect(counter().getAttribute("aria-live")).toBe("polite");
  });
});
