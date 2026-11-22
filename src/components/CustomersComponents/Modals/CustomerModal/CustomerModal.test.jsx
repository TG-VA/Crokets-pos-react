import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("./services/customerModalService", () => ({
  createCustomer: vi.fn(),
  findCustomerByPhone: vi.fn(),
  resolveCustomerSaveErrorMessage: vi.fn(() => "No se pudo guardar."),
  updateCustomer: vi.fn(),
}));

import CustomerModal from "./CustomerModal";

const EXISTING_CUSTOMER = {
  id: "c1",
  name: "ANA",
  phone: "5512345678",
  email: "ana@correo.com",
  status: true,
};

const CASES = [
  { title: "Nuevo cliente", customerToEdit: null },
  { title: "Editar cliente", customerToEdit: EXISTING_CUSTOMER },
];

describe.each(CASES)("CustomerModal: $title", ({ title, customerToEdit }) => {
  let onClose;

  const renderModal = () =>
    render(
      <CustomerModal
        isOpen
        onClose={onClose}
        onSaved={vi.fn()}
        customerToEdit={customerToEdit}
      />
    );

  beforeEach(() => {
    onClose = vi.fn();
  });

  it("muestra el titulo sin boton de cerrar en el encabezado", () => {
    renderModal();

    expect(screen.getByRole("dialog").textContent).toContain(title);
    expect(screen.queryByRole("button", { name: "Cerrar modal" })).toBeNull();
  });

  it("cierra con ESC", () => {
    renderModal();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("cierra con Cancelar", () => {
    renderModal();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("cierra con clic en el overlay y no con clic dentro del modal", () => {
    renderModal();

    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("dialog").parentElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
