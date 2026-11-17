import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import BranchFormModal from "./BranchFormModal";

const baseBranch = {
  id: "b1",
  code: "CEN",
  name: "Centro",
  city: "Cancún",
  state: "Quintana Roo",
  phone: "9999999999",
  email: "contacto@centro.com",
  address: "Calle 10",
  timezone: "America/Cancun",
  branchType: "operational",
};

const renderModal = (branch, onSubmit = vi.fn()) => {
  render(
    <BranchFormModal
      isOpen
      branch={branch}
      saving={false}
      onSubmit={onSubmit}
      onClose={vi.fn()}
    />
  );
  return onSubmit;
};

const contactLabels = ["Teléfono", "Correo", "Dirección comercial"];

describe("BranchFormModal tipo de sucursal", () => {
  it("una sucursal operativa muestra telefono, correo y direccion", () => {
    renderModal(baseBranch);

    contactLabels.forEach((label) =>
      expect(screen.getByLabelText(label)).toBeTruthy()
    );
    expect(screen.getByLabelText(/Tipo de sucursal/).value).toBe("operational");
  });

  it("al crear permite elegir el tipo", () => {
    renderModal(null);

    expect(screen.getByLabelText(/Tipo de sucursal/).disabled).toBe(false);
  });

  it("al editar el tipo queda fijo", () => {
    renderModal(baseBranch);

    expect(screen.getByLabelText(/Tipo de sucursal/).disabled).toBe(true);
    expect(screen.getByText(/El tipo no es editable/)).toBeTruthy();
  });

  it("al elegir administrativa oculta los campos de contacto", () => {
    renderModal(null);

    fireEvent.change(screen.getByLabelText(/Tipo de sucursal/), {
      target: { value: "admin" },
    });

    contactLabels.forEach((label) =>
      expect(screen.queryByLabelText(label)).toBeNull()
    );
    expect(screen.getByText(/Sin ventas ni stock/)).toBeTruthy();
  });

  it("guarda una sucursal admin con el tipo y sin datos de contacto", () => {
    const onSubmit = renderModal({ ...baseBranch, branchType: "admin" });

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(onSubmit).toHaveBeenCalledWith(
      "b1",
      expect.objectContaining({
        branchType: "admin",
        phone: "",
        email: "",
        address: "",
      })
    );
  });
});
