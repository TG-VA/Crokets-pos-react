import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import OrderPrintModal from "./OrderPrintModal";

const baseOrder = {
  orderNumber: "PED-0012",
  orderName: "Reposicion Mayo",
  status: "accepted_with_difference",
  fromBranchName: "Matriz",
  toBranchName: "Sucursal Norte",
  sentAt: "2026-10-24T10:00:00.000Z",
  acceptedAt: "2026-10-24T12:30:00.000Z",
  createdByLabel: "Juan",
  receivedByLabel: "Ana",
  departments: ["ALIMENTOS"],
  items: [
    {
      id: "item-1",
      barcode: "AP0015",
      productName: "Alimento Perro Adulto",
      departmentName: "ALIMENTOS",
      expectedQty: 10,
      receivedQty: 8,
      differenceQty: -2,
    },
    {
      id: "item-2",
      barcode: "AP0020",
      productName: "Alimento Gato Adulto",
      departmentName: "ALIMENTOS",
      expectedQty: 5,
      receivedQty: 7,
      differenceQty: 2,
    },
  ],
};

describe("OrderPrintModal", () => {
  it("muestra la tabla de diferencias con cantidades signadas", () => {
    render(<OrderPrintModal order={baseOrder} onClose={() => {}} />);

    const differenceTable = screen.getAllByRole("table")[1];

    expect(screen.getByText("Diferencias")).toBeTruthy();
    expect(screen.getByText("+2")).toBeTruthy();
    expect(within(differenceTable).getByText("-2")).toBeTruthy();
    expect(screen.queryByText("(Sobra)")).toBeNull();
    expect(screen.queryByText("(Falta)")).toBeNull();
  });

  it("no muestra la tabla cuando no hay diferencias", () => {
    const order = {
      ...baseOrder,
      items: baseOrder.items.map((item) => ({
        ...item,
        differenceQty: 0,
      })),
    };

    render(<OrderPrintModal order={order} onClose={() => {}} />);

    expect(screen.queryByText("Diferencias")).toBeNull();
  });
});
