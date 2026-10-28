import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import OrderDetailModal from "./OrderDetailModal";

const order = {
  orderNumber: "PED-20261025-0001",
  orderName: "NAJAR",
  status: "pending",
  fromBranchName: "Huayacan",
  toBranchName: "Torres",
  sentAt: "2026-10-24T10:00:00.000Z",
  departments: [],
  items: [],
};

describe("OrderDetailModal", () => {
  it("separa el numero en el titulo y el nombre en el badge", () => {
    render(<OrderDetailModal order={order} onClose={() => {}} />);

    expect(
      screen.getByRole("heading", { name: "Pedido PED-20261025-0001" })
    ).toBeTruthy();
    expect(screen.getByText("NAJAR")).toBeTruthy();
  });

  it("agrupa nombre, estado y ruta en una sola cabecera con origen hacia destino", () => {
    render(<OrderDetailModal order={order} onClose={() => {}} />);

    const header = screen.getByText("NAJAR").closest("div");
    const text = header.textContent;

    expect(within(header).getByText("Pendiente")).toBeTruthy();
    expect(within(header).getByText("hacia")).toBeTruthy();
    expect(text.indexOf("HUAYACAN")).toBeLessThan(text.indexOf("TORRES"));
  });

  it("muestra la nota de recepcion del pedido", () => {
    render(
      <OrderDetailModal
        order={{ ...order, receiptNotes: "Faltó una bolsa de croqueta" }}
        onClose={() => {}}
      />
    );

    expect(screen.getByText("Nota de recepción")).toBeTruthy();
    expect(screen.getByText("Faltó una bolsa de croqueta")).toBeTruthy();
  });

  it("no muestra la seccion de nota de recepcion si es nula", () => {
    render(
      <OrderDetailModal
        order={{ ...order, receiptNotes: null }}
        onClose={() => {}}
      />
    );

    expect(screen.queryByText("Nota de recepción")).toBeNull();
  });
});
