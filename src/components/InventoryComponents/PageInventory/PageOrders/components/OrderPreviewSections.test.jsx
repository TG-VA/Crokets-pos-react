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

  it("marca la diferencia de cada partida con signo y sin repetir una seccion aparte", () => {
    const order = buildOrder(3);

    order.items[1] = { ...order.items[1], receivedQty: 12, differenceQty: 2 };

    render(<OrderPreviewSections order={order} />);

    expect(screen.getByText("-2")).toBeTruthy();
    expect(screen.getByText("+2")).toBeTruthy();
    expect(screen.queryByText("Diferencias de recepción")).toBeNull();
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

  it("muestra autor y fecha de la nota de recepcion cuando existen", () => {
    render(
      <OrderPreviewSections
        order={{
          ...buildOrder(3),
          receiptNotes: "Faltó una bolsa de croqueta",
          receivedByLabel: "Ana",
          acceptedAt: "2026-10-24T12:30:00.000Z",
        }}
      />
    );

    expect(screen.getByText("Registrada por Ana · 24/10/2026")).toBeTruthy();
  });

  it("omite autor y fecha de la nota de recepcion cuando no vienen", () => {
    render(
      <OrderPreviewSections
        order={{
          ...buildOrder(3),
          receiptNotes: "Faltó una bolsa de croqueta",
        }}
      />
    );

    expect(screen.queryByText(/Registrada por/)).toBeNull();
    expect(screen.queryByText("24/10/2026")).toBeNull();
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

  it("resume arriba cuantos productos tienen faltante y sobrante", () => {
    const order = buildOrder(4);

    order.items[2] = { ...order.items[2], receivedQty: 12, differenceQty: 2 };

    render(<OrderPreviewSections order={order} />);

    expect(screen.getByText("Productos con diferencia")).toBeTruthy();
    expect(screen.getByLabelText("1 productos con faltante")).toBeTruthy();
    expect(screen.getByLabelText("1 productos con sobrante")).toBeTruthy();
  });

  it("omite el resumen cuando no hay diferencias o el pedido sigue pendiente", () => {
    const clean = buildOrder(3).items.map((item) => ({
      ...item,
      receivedQty: item.expectedQty,
      differenceQty: 0,
    }));
    const { rerender } = render(
      <OrderPreviewSections order={{ ...buildOrder(3), items: clean }} />
    );

    expect(screen.queryByText("Productos con diferencia")).toBeNull();

    rerender(
      <OrderPreviewSections order={{ ...buildOrder(3), status: "pending" }} />
    );

    expect(screen.queryByText("Productos con diferencia")).toBeNull();
  });

  it("muestra la nota de recepcion antes de la tabla de partidas", () => {
    render(
      <OrderPreviewSections
        order={{ ...buildOrder(3), receiptNotes: "Faltó una bolsa" }}
      />
    );

    const note = screen.getByText("Faltó una bolsa");
    const table = screen.getByRole("table");

    expect(
      note.compareDocumentPosition(table) &
        window.Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});
