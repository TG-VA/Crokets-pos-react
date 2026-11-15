import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

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

const buildOrderWithItems = (count) => ({
  ...orders[0],
  id: "r12",
  folio: "TR-010126-000012",
  totals: { requestedUnits: count * 10 },
  items: Array.from({ length: count }, (_, index) => ({
    productId: `p${index + 1}`,
    name: `Producto ${index + 1}`,
    barcode: `75000000000${index + 10}`,
    requestedQty: 10,
  })),
});

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

  it("inicia las cantidades en 0 y muestra el total solicitado en Regresa", () => {
    render(
      <ReceiveWorkspace {...defaultProps} selectedReceiptOrder={orders[0]} />
    );

    const input = screen.getByLabelText("Cantidad recibida de Alimento 15kg");
    expect(input.getAttribute("type")).toBe("text");
    expect(input.getAttribute("inputmode")).toBe("numeric");
    expect(input.value).toBe("0");

    const row = screen.getByText("Alimento 15kg").closest("tr");
    expect(within(row).getAllByRole("cell")[3].textContent).toBe("8");
  });

  it("rechaza letras y recorta la cantidad al total solicitado", () => {
    const onReceiptQuantityChange = vi.fn();

    render(
      <ReceiveWorkspace
        {...defaultProps}
        selectedReceiptOrder={orders[0]}
        receiptQuantities={{ p1: "0" }}
        onReceiptQuantityChange={onReceiptQuantityChange}
      />
    );

    const input = screen.getByLabelText("Cantidad recibida de Alimento 15kg");

    fireEvent.change(input, { target: { value: "abc" } });
    expect(onReceiptQuantityChange).toHaveBeenLastCalledWith("p1", "0");

    fireEvent.change(input, { target: { value: "12" } });
    expect(onReceiptQuantityChange).toHaveBeenLastCalledWith("p1", "8");
  });

  it("pagina los productos de 5 en 5 y conserva lo capturado", () => {
    const order = buildOrderWithItems(12);

    render(
      <ReceiveWorkspace
        {...defaultProps}
        selectedReceiptOrder={order}
        receiptQuantities={{ p6: "7" }}
      />
    );

    expect(screen.getAllByLabelText(/^Cantidad recibida de/)).toHaveLength(5);
    expect(screen.getByText("Producto 1")).toBeTruthy();
    expect(screen.queryByText("Producto 6")).toBeNull();
    expect(screen.getByText("Página 1 de 3")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getAllByLabelText(/^Cantidad recibida de/)).toHaveLength(5);
    expect(screen.getByText("Producto 6")).toBeTruthy();
    expect(screen.queryByText("Producto 1")).toBeNull();
    expect(screen.getByText("Página 2 de 3")).toBeTruthy();
    expect(screen.getByLabelText("Cantidad recibida de Producto 6").value).toBe(
      "7"
    );

    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getAllByLabelText(/^Cantidad recibida de/)).toHaveLength(2);
    expect(screen.getByText("Página 3 de 3")).toBeTruthy();
  });

  it("reinicia la pagina al cambiar de orden", () => {
    const firstOrder = buildOrderWithItems(12);
    const secondOrder = {
      ...buildOrderWithItems(12),
      id: "r13",
      folio: "TR-010126-000013",
    };

    const { rerender } = render(
      <ReceiveWorkspace {...defaultProps} selectedReceiptOrder={firstOrder} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByText("Página 2 de 3")).toBeTruthy();

    rerender(
      <ReceiveWorkspace {...defaultProps} selectedReceiptOrder={secondOrder} />
    );

    expect(screen.getByText("Página 1 de 3")).toBeTruthy();
    expect(screen.getByText("Producto 1")).toBeTruthy();
  });

  it("bloquea la confirmacion mientras todas las cantidades esten en 0", () => {
    render(
      <ReceiveWorkspace {...defaultProps} selectedReceiptOrder={orders[0]} />
    );

    expect(
      screen.getByRole("button", { name: "Confirmar recepción" }).disabled
    ).toBe(true);
    expect(
      screen.getByText("Captura al menos una cantidad recibida")
    ).toBeTruthy();
  });

  it("habilita la confirmacion con una cantidad capturada en otra pagina", () => {
    const order = buildOrderWithItems(12);

    render(
      <ReceiveWorkspace
        {...defaultProps}
        selectedReceiptOrder={order}
        receiptQuantities={{ p10: "4" }}
      />
    );

    expect(screen.queryByText("Producto 10")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Confirmar recepción" }).disabled
    ).toBe(false);
  });

  it("confirma la recepcion solo con doble click", () => {
    const onConfirmReceipt = vi.fn();

    render(
      <ReceiveWorkspace
        {...defaultProps}
        selectedReceiptOrder={orders[0]}
        receiptQuantities={{ p1: "4" }}
        onConfirmReceipt={onConfirmReceipt}
      />
    );

    const button = screen.getByRole("button", { name: "Confirmar recepción" });

    fireEvent.click(button);
    expect(onConfirmReceipt).not.toHaveBeenCalled();

    fireEvent.doubleClick(button);
    expect(onConfirmReceipt).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Doble click para confirmar")).toBeTruthy();
  });

  it("deshabilita la confirmacion mientras se procesa", () => {
    render(
      <ReceiveWorkspace
        {...defaultProps}
        submitting
        selectedReceiptOrder={orders[0]}
      />
    );

    expect(screen.getByRole("button", { name: "Procesando..." }).disabled).toBe(
      true
    );
  });
});
