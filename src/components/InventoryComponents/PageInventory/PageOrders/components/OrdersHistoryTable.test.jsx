import { describe, it, expect, beforeEach, vi } from "vitest";

import { render, screen, fireEvent, within } from "@testing-library/react";

import OrdersHistoryTable from "./OrdersHistoryTable";

const buildOrder = (index) => ({
  id: `order-${index}`,
  orderNumber: `PED-${String(index + 1).padStart(3, "0")}`,
  orderName: `Pedido ${index + 1}`,
  departments: ["Alimento"],
  fromBranchId: "branch-origin",
  fromBranchName: "Sucursal Centro",
  toBranchId: "branch-destination",
  toBranchName: "Sucursal Norte",
  sentAt: "2026-10-01T12:00:00.000Z",
  status: "pending",
  discrepancyNotes: "",
});

const buildOrders = (total) =>
  Array.from({ length: total }, (_, index) => buildOrder(index));

const getBodyRows = () => screen.getAllByRole("row").slice(1);

const getFirstOrderNumber = () =>
  getBodyRows()[0].querySelector("td")?.textContent;

const clickNextPage = () => {
  fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
};

describe("OrdersHistoryTable pagination", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("muestra solo los primeros 10 pedidos en la pagina inicial", () => {
    render(<OrdersHistoryTable orders={buildOrders(25)} />);

    expect(getBodyRows()).toHaveLength(10);
    expect(getFirstOrderNumber()).toBe("PED-001");
    expect(screen.getByText(/Mostrando 1 a 10 de 25 pedidos/)).toBeTruthy();
    expect(screen.getByText("Página 1 de 3")).toBeTruthy();
  });

  it("navega a la siguiente pagina y muestra los pedidos 11 al 20", () => {
    render(<OrdersHistoryTable orders={buildOrders(25)} />);

    clickNextPage();

    const rows = getBodyRows();

    expect(rows).toHaveLength(10);
    expect(rows[0].querySelector("td")?.textContent).toBe("PED-011");
    expect(rows[9].querySelector("td")?.textContent).toBe("PED-020");
    expect(screen.getByText(/Mostrando 11 a 20 de 25 pedidos/)).toBeTruthy();
    expect(screen.getByText("Página 2 de 3")).toBeTruthy();
  });

  it("reinicia a la primera pagina cuando cambian los filtros", () => {
    render(<OrdersHistoryTable orders={buildOrders(25)} />);

    clickNextPage();

    expect(screen.getByText("Página 2 de 3")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Estado"), {
      target: { value: "pending" },
    });

    expect(screen.getByText("Página 1 de 3")).toBeTruthy();
    expect(getFirstOrderNumber()).toBe("PED-001");
    expect(screen.getByText(/Mostrando 1 a 10 de 25 pedidos/)).toBeTruthy();
  });

  it("cambia el tamano de pagina y muestra los 25 pedidos en una pagina", () => {
    render(<OrdersHistoryTable orders={buildOrders(25)} />);

    fireEvent.change(screen.getByLabelText(/Por página/), {
      target: { value: "25" },
    });

    expect(getBodyRows()).toHaveLength(25);
    expect(screen.getByText(/Mostrando 1 a 25 de 25 pedidos/)).toBeTruthy();
    expect(screen.getByText("Página 1 de 1")).toBeTruthy();
  });

  it("muestra el estado vacio y oculta la paginacion sin resultados", () => {
    render(<OrdersHistoryTable orders={[]} />);

    expect(screen.queryAllByRole("row")).toHaveLength(0);
    expect(screen.queryByText(/Mostrando/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Siguiente" })).toBeNull();
    expect(
      screen.getByText("Sin pedidos para los filtros seleccionados")
    ).toBeTruthy();
  });

  it("mantiene visibles las acciones de detalle e impresion por fila", () => {
    const onOpenDetail = vi.fn();
    const onOpenPrint = vi.fn();

    render(
      <OrdersHistoryTable
        orders={buildOrders(1)}
        onOpenDetail={onOpenDetail}
        onOpenPrint={onOpenPrint}
      />
    );

    const row = getBodyRows()[0];

    fireEvent.click(within(row).getByRole("button", { name: /Ver detalle/ }));
    fireEvent.click(within(row).getByRole("button", { name: /Imprimir/ }));

    expect(onOpenDetail).toHaveBeenCalledWith(
      expect.objectContaining({ id: "order-0" })
    );
    expect(onOpenPrint).toHaveBeenCalledWith(
      expect.objectContaining({ id: "order-0" })
    );
  });
});
