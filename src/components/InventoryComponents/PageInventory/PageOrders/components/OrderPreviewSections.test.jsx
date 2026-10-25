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

  it("recorta las partidas cuando esta paginado", () => {
    render(<OrderPreviewSections order={buildOrder(25)} paginated />);

    expect(screen.getByText("Producto 9")).toBeTruthy();
    expect(screen.queryByText("Producto 10")).toBeNull();
  });

  it("muestra todas las partidas cuando no esta paginado", () => {
    render(<OrderPreviewSections order={buildOrder(25)} />);

    expect(screen.getByText("Producto 24")).toBeTruthy();
  });

  it("muestra la tabla Diferencias de recepcion y no el texto de notas", () => {
    render(<OrderPreviewSections order={buildOrder(3)} />);

    expect(screen.getByText("Diferencias de recepción")).toBeTruthy();
    expect(screen.queryByText(/Faltantes: 1x/)).toBeNull();
  });
});
