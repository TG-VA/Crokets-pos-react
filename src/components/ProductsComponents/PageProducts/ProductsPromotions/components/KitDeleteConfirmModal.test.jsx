import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import KitDeleteConfirmModal from "./KitDeleteConfirmModal";

const kit = { id: 7, products: { name: "KIT PRUEBA" } };

const setup = () => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <KitDeleteConfirmModal
      kit={kit}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
  return { onConfirm, onCancel };
};

describe("KitDeleteConfirmModal", () => {
  it("no muestra nada sin kit", () => {
    render(
      <KitDeleteConfirmModal
        kit={null}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.queryByRole("button", { name: "Sí, eliminar" })).toBeNull();
  });

  it("confirmar queda deshabilitado hasta escribir ELIMINAR", () => {
    const { onConfirm } = setup();
    const confirm = screen.getByRole("button", { name: "Sí, eliminar" });
    const input = screen.getByLabelText(/Escribe ELIMINAR/);

    expect(confirm.disabled).toBe(true);
    fireEvent.change(input, { target: { value: "eliminar" } });
    expect(confirm.disabled).toBe(true);

    fireEvent.change(input, { target: { value: "ELIMINAR" } });
    expect(confirm.disabled).toBe(false);
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledWith(kit);
  });

  it("cancelar llama a onCancel", () => {
    const { onCancel, onConfirm } = setup();
    fireEvent.click(screen.getByRole("button", { name: "No, regresar" }));
    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
