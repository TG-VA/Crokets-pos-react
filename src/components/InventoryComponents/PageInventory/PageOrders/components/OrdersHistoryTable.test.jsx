import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

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

const buildOrderAt = (sentAt, index = 0) => ({
  ...buildOrder(index),
  sentAt,
});

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

  it("deshabilita Limpiar filtros cuando no hay filtros activos", () => {
    render(<OrdersHistoryTable orders={buildOrders(5)} />);

    const clearButton = screen.getByRole("button", {
      name: "Limpiar filtros",
    });

    expect(clearButton.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Estado"), {
      target: { value: "pending" },
    });

    expect(clearButton.disabled).toBe(false);

    fireEvent.click(clearButton);

    expect(clearButton.disabled).toBe(true);
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

describe("OrdersHistoryTable date filters", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 21, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("filtra los pedidos de hoy con el preset Hoy", () => {
    render(
      <OrdersHistoryTable
        orders={[
          buildOrderAt(new Date(2026, 9, 21, 8, 0, 0), 0),
          buildOrderAt(new Date(2026, 9, 20, 8, 0, 0), 1),
        ]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Hoy" }));

    expect(getBodyRows()).toHaveLength(1);
    expect(getFirstOrderNumber()).toBe("PED-001");
    expect(screen.getByText("1 de 2 pedidos")).toBeTruthy();
    expect(screen.getByLabelText("Desde").value).toBe("21/10/2026");
    expect(screen.getByLabelText("Hasta").value).toBe("21/10/2026");
  });

  it("filtra de lunes a domingo con el preset Esta semana", () => {
    render(
      <OrdersHistoryTable
        orders={[
          buildOrderAt(new Date(2026, 9, 19, 8, 0, 0), 0),
          buildOrderAt(new Date(2026, 9, 25, 20, 0, 0), 1),
          buildOrderAt(new Date(2026, 9, 18, 20, 0, 0), 2),
        ]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Esta semana" }));

    expect(getBodyRows()).toHaveLength(2);
    expect(screen.getByText("2 de 3 pedidos")).toBeTruthy();
    expect(screen.getByLabelText("Desde").value).toBe("19/10/2026");
    expect(screen.getByLabelText("Hasta").value).toBe("25/10/2026");
  });

  it("filtra el mes completo con el preset Este mes", () => {
    render(
      <OrdersHistoryTable
        orders={[
          buildOrderAt(new Date(2026, 9, 1, 0, 0, 0), 0),
          buildOrderAt(new Date(2026, 9, 31, 23, 59, 0), 1),
          buildOrderAt(new Date(2026, 8, 30, 23, 59, 0), 2),
        ]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Este mes" }));

    expect(getBodyRows()).toHaveLength(2);
    expect(screen.getByText("2 de 3 pedidos")).toBeTruthy();
  });

  it("limpia las fechas y restablece todos los pedidos", () => {
    render(
      <OrdersHistoryTable
        orders={[
          buildOrderAt(new Date(2026, 9, 21, 8, 0, 0), 0),
          buildOrderAt(new Date(2026, 9, 20, 8, 0, 0), 1),
        ]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Hoy" }));

    expect(getBodyRows()).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));

    expect(getBodyRows()).toHaveLength(2);
    expect(screen.getByLabelText("Desde").value).toBe("");
    expect(screen.getByLabelText("Hasta").value).toBe("");
    expect(
      screen.getByRole("button", { name: "Hoy" }).getAttribute("aria-pressed")
    ).toBe("false");
  });
});
