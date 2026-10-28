import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import OrderPreviewSections from "./OrderPreviewSections";

const buildItems = (count) =>
  Array.from({ length: count }, (_, index) => ({
    id: `item-${index}`,
    barcode: `COD${index}`,
    productName: `Producto ${index}`,
    departmentName: "ALIMENTOS",
    expectedQty: 10,
    receivedQty: index === 0 ? 8 : 10,
    differenceQty: index === 0 ? -2 : 0,
  }));

const buildOrder = (count) => ({
  orderNumber: "PED-1",
  orderName: "Reposicion",
  status: "accepted_with_difference",
  sentAt: "2026-10-24T10:00:00.000Z",
  departments: ["ALIMENTOS"],
  discrepancyNotes: "Faltantes: 1x Producto 0 (-2)",
  items: buildItems(count),
});

describe("OrderPreviewSections", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("pagina las partidas del detalle", () => {
    render(<OrderPreviewSections order={buildOrder(25)} />);

    expect(screen.getByText("Producto 9")).toBeTruthy();
    expect(screen.queryByText("Producto 10")).toBeNull();
  });

  it("muestra la tabla Diferencias de recepcion y no el texto de notas", () => {
    render(<OrderPreviewSections order={buildOrder(3)} />);

    expect(screen.getByText("Diferencias de recepción")).toBeTruthy();
    expect(screen.queryByText(/Faltantes: 1x/)).toBeNull();
  });

  it("muestra las notas del pedido junto al resto de secciones", () => {
    render(
      <OrderPreviewSections
        order={{ ...buildOrder(3), notes: "Entregar por la puerta trasera" }}
      />
    );

    expect(screen.getByText("Notas del pedido")).toBeTruthy();
    expect(screen.getByText("Entregar por la puerta trasera")).toBeTruthy();
  });

  it("omite el bloque de notas cuando el pedido no tiene", () => {
    render(<OrderPreviewSections order={buildOrder(3)} />);

    expect(screen.queryByText("Notas del pedido")).toBeNull();
  });

  it("muestra la nota de recepcion cuando existe", () => {
    render(
      <OrderPreviewSections
        order={{
          ...buildOrder(3),
          notes: "Entregar por la puerta trasera",
          receiptNotes: "Faltó una bolsa de croqueta",
        }}
      />
    );

    expect(screen.getByText("Nota de recepción")).toBeTruthy();
    expect(screen.getByText("Faltó una bolsa de croqueta")).toBeTruthy();
  });

  it("omite la nota de recepcion cuando es nula o vacia", () => {
    const { rerender } = render(
      <OrderPreviewSections order={{ ...buildOrder(3), receiptNotes: "" }} />
    );

    expect(screen.queryByText("Nota de recepción")).toBeNull();

    rerender(
      <OrderPreviewSections order={{ ...buildOrder(3), receiptNotes: null }} />
    );

    expect(screen.queryByText("Nota de recepción")).toBeNull();
  });
});
