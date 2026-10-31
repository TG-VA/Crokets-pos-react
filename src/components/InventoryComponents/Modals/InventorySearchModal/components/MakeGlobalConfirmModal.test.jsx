import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import MakeGlobalConfirmModal from "./MakeGlobalConfirmModal";

const product = { nombre: "CROQUETA LOCAL", codigo: "123" };

const setup = (props = {}) => {
  const onClose = vi.fn();
  const onConfirm = vi.fn();
  render(
    <MakeGlobalConfirmModal
      product={product}
      onClose={onClose}
      onConfirm={onConfirm}
      {...props}
    />
  );
  return { onClose, onConfirm };
};

describe("MakeGlobalConfirmModal", () => {
  it("no renderiza nada sin producto", () => {
    render(
      <MakeGlobalConfirmModal
        product={null}
        onClose={() => {}}
        onConfirm={() => {}}
      />
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("mantiene deshabilitado el boton hasta escribir CONFIRMAR exacto", () => {
    const { onConfirm } = setup();
    const button = screen.getByRole("button", { name: /volver global/i });
    const input = screen.getByLabelText(/escribe confirmar/i);

    expect(button.disabled).toBe(true);

    fireEvent.change(input, { target: { value: "confirmar" } });
    expect(button.disabled).toBe(true);

    fireEvent.change(input, { target: { value: "CONFIRMAR" } });
    expect(button.disabled).toBe(false);

    fireEvent.click(button);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("muestra el error recibido", () => {
    setup({ error: "Solo un administrador puede hacerlo." });
    expect(screen.getByRole("alert").textContent).toBe(
      "Solo un administrador puede hacerlo."
    );
  });

  it("Escape cierra salvo mientras guarda", () => {
    const { onClose } = setup();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Escape no cierra mientras guarda", () => {
    const { onClose } = setup({ saving: true });
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("limpia la palabra escrita al cerrar y reabrir el modal", () => {
    const props = { onClose: () => {}, onConfirm: () => {} };
    const { rerender } = render(
      <MakeGlobalConfirmModal product={product} {...props} />
    );
    fireEvent.change(screen.getByLabelText(/escribe confirmar/i), {
      target: { value: "CONFIRMAR" },
    });

    rerender(<MakeGlobalConfirmModal product={null} {...props} />);
    rerender(
      <MakeGlobalConfirmModal
        product={{ nombre: "OTRO", codigo: "456" }}
        {...props}
      />
    );

    expect(screen.getByLabelText(/escribe confirmar/i).value).toBe("");
    expect(
      screen.getByRole("button", { name: /volver global/i }).disabled
    ).toBe(true);
  });
});
