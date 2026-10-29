import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DeleteItemModal from "./DeleteItemModal";

describe("DeleteItemModal: botones", () => {
  it("el boton de confirmar dice solo Eliminar y Enter sigue confirmando", () => {
    const onConfirmDelete = vi.fn();
    const onClose = vi.fn();

    render(
      <DeleteItemModal
        isOpen
        onClose={onClose}
        onConfirmDelete={onConfirmDelete}
        selectedProduct={{ name: "Croqueta", cantidad: 1, importe: 10 }}
      />
    );

    expect(screen.getByRole("button", { name: "Eliminar" })).toBeTruthy();

    fireEvent.keyDown(document, { key: "Enter" });

    expect(onConfirmDelete).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
