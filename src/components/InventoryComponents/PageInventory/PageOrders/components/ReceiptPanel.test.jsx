import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ReceiptPanel from "./ReceiptPanel";

const buildOrder = (count) => ({
  id: "order-1",
  orderNumber: "PED-1",
  orderName: "Reposicion",
  fromBranchName: "Matriz",
  toBranchName: "Norte",
  items: Array.from({ length: count }, (_, index) => ({
    id: `item-${index}`,
    productId: `p${index}`,
    barcode: `COD${index}`,
    productName: `Producto ${index}`,
    departmentName: "ALIMENTOS",
    expectedQty: 5,
  })),
});

const renderPanel = (overrides = {}) => {
  const order = overrides.order ?? buildOrder(25);

  return render(
    <ReceiptPanel
      order={order}
      quantities={{}}
      isComplete={false}
      missingItems={order.items}
      error=""
      isSubmitting={false}
      canSubmit={false}
      onChangeOrder={vi.fn()}
      onQuantityChange={vi.fn()}
      getDifferencePreview={() => null}
      onSubmit={vi.fn()}
      {...overrides}
    />
  );
};

describe("ReceiptPanel", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("pagina la tabla de captura", () => {
    renderPanel();

    expect(screen.getByText("Producto 9")).toBeTruthy();
    expect(screen.queryByText("Producto 10")).toBeNull();
  });

  it("muestra el badge de faltantes con el numero de productos", () => {
    renderPanel();

    expect(screen.getByText(/Faltan 25 productos por capturar/)).toBeTruthy();
  });

  it("usa singular cuando falta un solo producto", () => {
    const order = buildOrder(3);

    renderPanel({ order, missingItems: [order.items[2]] });

    expect(screen.getByText(/Faltan 1 producto por capturar/)).toBeTruthy();
  });

  it("salta a la pagina del primer pendiente", () => {
    const order = buildOrder(25);

    renderPanel({ order, missingItems: [order.items[12]] });
    fireEvent.click(
      screen.getByRole("button", { name: "Ir al primer pendiente" })
    );

    expect(screen.getByText("Producto 12")).toBeTruthy();
    expect(screen.queryByText("Producto 0")).toBeNull();
  });

  it("muestra conteo completo cuando no faltan productos", () => {
    renderPanel({ isComplete: true, missingItems: [], canSubmit: true });

    expect(screen.getByText("Conteo completo")).toBeTruthy();
  });

  it("muestra la nota como opcional cuando no hay diferencias", () => {
    renderPanel();

    expect(screen.getByLabelText("Nota (opcional)")).toBeTruthy();
  });

  it("marca la nota como obligatoria y muestra el error con diferencias", () => {
    renderPanel({
      isNoteRequired: true,
      noteError:
        "La nota de recepción es obligatoria cuando hay diferencias en el conteo.",
    });

    expect(
      screen.getByLabelText("Nota (obligatoria por diferencias)")
    ).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toMatch(
      /obligatoria cuando hay diferencias/
    );
  });

  it("bloquea el registro mientras falta la nota obligatoria", () => {
    renderPanel({
      isNoteRequired: true,
      noteError:
        "La nota de recepción es obligatoria cuando hay diferencias en el conteo.",
      canSubmit: false,
    });

    expect(
      screen.getByRole("button", { name: "Registrar recepción" }).disabled
    ).toBe(true);
  });

  it("notifica los cambios de la nota", () => {
    const onReceiptNoteChange = vi.fn();

    renderPanel({ onReceiptNoteChange });
    fireEvent.change(screen.getByLabelText("Nota (opcional)"), {
      target: { value: "Faltó una bolsa" },
    });

    expect(onReceiptNoteChange).toHaveBeenCalledWith("Faltó una bolsa");
  });
});
