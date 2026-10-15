import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import ReceiveWorkspace from "./ReceiveWorkspace";

const orders = [
  {
    id: "r1",
    folio: "TR-010126-000007",
    originBranchName: "Sucursal Norte",
    createdAt: "2026-10-01T10:00:00Z",
    totals: { requestedUnits: 8 },
    items: [
      {
        productId: "p1",
        name: "Alimento 15kg",
        barcode: "7501234567890",
        requestedQty: 8,
      },
    ],
  },
];

const defaultProps = {
  submitting: false,
  pendingReceiptsCount: 1,
  pendingReceiptOrders: orders,
  selectedReceiptOrder: null,
  receiptQuantities: {},
  onSelectReceiptOrder: vi.fn(),
  onReceiptQuantityChange: vi.fn(),
  onConfirmReceipt: vi.fn(),
};

describe("ReceiveWorkspace", () => {
  it("coloca la lista de pendientes antes del detalle (master-detail)", () => {
    render(<ReceiveWorkspace {...defaultProps} />);
    const listHeading = screen.getByRole("heading", {
      name: "Recepciones pendientes",
    });
    const detailHeading = screen.getByRole("heading", {
      name: "Orden de recepción",
    });

    const position = listHeading.compareDocumentPosition(detailHeading);
    // 4 = DOCUMENT_POSITION_FOLLOWING: el detalle debe ir tras la lista.
    expect(position & 4).toBeTruthy();
  });

  it("muestra estado vacío del detalle cuando no hay orden seleccionada", () => {
    render(<ReceiveWorkspace {...defaultProps} />);
    expect(
      screen.getByText(
        "Selecciona una orden pendiente para abrir el detalle de recepción."
      )
    ).toBeTruthy();
  });

  it("muestra estado vacío de la lista cuando no hay pendientes", () => {
    render(
      <ReceiveWorkspace
        {...defaultProps}
        pendingReceiptOrders={[]}
        pendingReceiptsCount={0}
      />
    );
    expect(
      screen.getByText(
        "No tienes órdenes pendientes por recibir en esta sucursal."
      )
    ).toBeTruthy();
  });

  it("notifica la orden seleccionada al pulsar una tarjeta pendiente", () => {
    const onSelectReceiptOrder = vi.fn();
    render(
      <ReceiveWorkspace
        {...defaultProps}
        onSelectReceiptOrder={onSelectReceiptOrder}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /TR-010126-000007/ }));
    expect(onSelectReceiptOrder).toHaveBeenCalledWith("r1");
  });

  it("renderiza el detalle con meta, tabla y accion de confirmacion", () => {
    render(
      <ReceiveWorkspace {...defaultProps} selectedReceiptOrder={orders[0]} />
    );
    expect(
      screen.getAllByText("TR-010126-000007").length
    ).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Sucursal Norte").length).toBeGreaterThanOrEqual(
      2
    );
    expect(screen.getByText("Alimento 15kg")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Confirmar recepción" })
    ).toBeTruthy();
  });
});
