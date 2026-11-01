import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import HistoryTable from "./HistoryTable";

const orders = [
  {
    id: "t1",
    folio: "TR-010126-000001",
    originBranchId: "b1",
    destinationBranchId: "b2",
    originBranchName: "Origen",
    destinationBranchName: "Destino",
    status: "pending_receipt",
    createdAt: "2026-10-01T10:00:00Z",
    receivedAt: null,
    createdByUsername: "admin",
    totals: { requestedUnits: 10, receivedUnits: 0, returnedUnits: 0 },
  },
];

const defaultProps = {
  branch: { id: "b1" },
  transferHistory: orders,
  cancellableTransferIds: new Set(["t1"]),
  submitting: false,
  cancelConfirmLoading: false,
  onRowClick: vi.fn(),
  onCancelClick: vi.fn(),
};

describe("HistoryTable", () => {
  it("renderiza encabezados de tabla", () => {
    render(<HistoryTable {...defaultProps} />);
    expect(screen.getByText("Folio")).toBeTruthy();
    expect(screen.getByText("Ruta")).toBeTruthy();
    expect(screen.getByText("Recepción")).toBeTruthy();
  });

  it("renderiza filas con folio y ruta", () => {
    render(<HistoryTable {...defaultProps} />);
    expect(screen.getByText("TR-010126-000001")).toBeTruthy();
    expect(screen.getByText("Origen → Destino")).toBeTruthy();
  });

  it("muestra mensaje vacio si no hay historial", () => {
    render(<HistoryTable {...defaultProps} transferHistory={[]} />);
    expect(
      screen.getByText(
        "Todavía no hay traspasos registrados para esta sucursal."
      )
    ).toBeTruthy();
  });

  it("onRowClick se dispara al hacer clic en la fila", () => {
    const onRowClick = vi.fn();
    render(<HistoryTable {...defaultProps} onRowClick={onRowClick} />);
    const row = screen.getByRole("row", { name: /TR-010126-000001/ });
    fireEvent.click(row);
    expect(onRowClick).toHaveBeenCalledTimes(1);
  });

  it("onRowClick se dispara con Enter en la fila", () => {
    const onRowClick = vi.fn();
    render(<HistoryTable {...defaultProps} onRowClick={onRowClick} />);
    const row = screen.getByRole("row", { name: /TR-010126-000001/ });
    fireEvent.keyDown(row, { key: "Enter" });
    expect(onRowClick).toHaveBeenCalledTimes(1);
  });

  it("muestra boton Cancelar para ordenes cancelables", () => {
    render(<HistoryTable {...defaultProps} />);
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeTruthy();
  });

  it("no muestra boton Cancelar si no es cancelable", () => {
    render(
      <HistoryTable {...defaultProps} cancellableTransferIds={new Set()} />
    );
    expect(screen.queryByRole("button", { name: "Cancelar" })).toBeNull();
  });

  it("onCancelClick se dispara al hacer clic en Cancelar", () => {
    const onCancelClick = vi.fn();
    render(<HistoryTable {...defaultProps} onCancelClick={onCancelClick} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancelClick).toHaveBeenCalledWith(orders[0]);
  });

  it("pagina el historial de 10 en 10", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      ...orders[0],
      id: `t${i}`,
      folio: `TR-${String(i + 1).padStart(3, "0")}`,
    }));
    render(<HistoryTable {...defaultProps} transferHistory={many} />);
    expect(screen.queryByText("TR-010")).toBeTruthy();
    expect(screen.queryByText("TR-011")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.queryByText("TR-011")).toBeTruthy();
    expect(screen.queryByText("TR-001")).toBeNull();
  });

  it("filtra el historial por folio", () => {
    const two = [
      orders[0],
      { ...orders[0], id: "t2", folio: "TR-020126-000002" },
    ];
    render(<HistoryTable {...defaultProps} transferHistory={two} />);

    fireEvent.change(screen.getByLabelText("Buscar traspaso por folio"), {
      target: { value: "020126" },
    });
    expect(screen.queryByText("TR-020126-000002")).toBeTruthy();
    expect(screen.queryByText("TR-010126-000001")).toBeNull();

    fireEvent.change(screen.getByLabelText("Buscar traspaso por folio"), {
      target: { value: "zzz" },
    });
    expect(screen.getByText("No hay traspasos con ese folio.")).toBeTruthy();
  });

  it("al filtrar por folio vuelve a la pagina 1", () => {
    const many = Array.from({ length: 24 }, (_, i) => ({
      ...orders[0],
      id: `t${i}`,
      folio: `${i % 2 === 0 ? "PAR" : "IMPAR"}-${String(i + 1).padStart(3, "0")}`,
    }));
    render(<HistoryTable {...defaultProps} transferHistory={many} />);
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.queryByText("PAR-001")).toBeNull();

    fireEvent.change(screen.getByLabelText("Buscar traspaso por folio"), {
      target: { value: "PAR" },
    });
    expect(screen.queryByText("PAR-001")).toBeTruthy();
  });

  it("acota la pagina cuando el historial se reduce", () => {
    const many = Array.from({ length: 24 }, (_, i) => ({
      ...orders[0],
      id: `t${i}`,
      folio: `TR-${String(i + 1).padStart(3, "0")}`,
    }));
    const { rerender } = render(
      <HistoryTable {...defaultProps} transferHistory={many} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    rerender(<HistoryTable {...defaultProps} transferHistory={[orders[0]]} />);
    expect(screen.queryByText("TR-010126-000001")).toBeTruthy();
  });

  it("boton Cancelar esta deshabilitado durante submitting", () => {
    render(<HistoryTable {...defaultProps} submitting={true} />);
    expect(
      screen.getByRole("button", { name: "Cancelar" }).hasAttribute("disabled")
    ).toBe(true);
  });
});

describe("HistoryTable filtros por rango de fechas", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 21, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const buildOrderAt = (date, id, folio) => ({
    ...orders[0],
    id,
    folio,
    createdAt: date.toISOString(),
    receivedAt: null,
  });

  const history = [
    buildOrderAt(new Date(2026, 9, 20, 8, 0, 0), "t1", "TR-20"),
    buildOrderAt(new Date(2026, 9, 21, 8, 0, 0), "t2", "TR-21"),
    buildOrderAt(new Date(2026, 9, 19, 8, 0, 0), "t3", "TR-19"),
  ];

  it("filtra los traspasos de hoy con el preset Hoy", () => {
    render(
      <HistoryTable
        {...defaultProps}
        transferHistory={history}
        cancellableTransferIds={new Set()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Hoy" }));

    expect(screen.queryByText("TR-21")).toBeTruthy();
    expect(screen.queryByText("TR-20")).toBeNull();
    expect(screen.getByLabelText("Desde").value).toBe("21/10/2026");
    expect(screen.getByLabelText("Hasta").value).toBe("21/10/2026");
  });

  it("filtra de lunes a domingo con el preset Esta semana", () => {
    render(
      <HistoryTable
        {...defaultProps}
        transferHistory={[
          ...history,
          buildOrderAt(new Date(2026, 9, 18, 8, 0, 0), "t4", "TR-18"),
        ]}
        cancellableTransferIds={new Set()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Esta semana" }));

    expect(screen.queryByText("TR-21")).toBeTruthy();
    expect(screen.queryByText("TR-20")).toBeTruthy();
    expect(screen.queryByText("TR-19")).toBeTruthy();
    expect(screen.queryByText("TR-18")).toBeNull();
    expect(screen.getByLabelText("Desde").value).toBe("19/10/2026");
    expect(screen.getByLabelText("Hasta").value).toBe("25/10/2026");
  });

  it("limpia el rango y restablece todos los traspasos", () => {
    render(
      <HistoryTable
        {...defaultProps}
        transferHistory={history}
        cancellableTransferIds={new Set()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Hoy" }));
    expect(screen.queryByText("TR-20")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));

    expect(screen.queryByText("TR-20")).toBeTruthy();
    expect(screen.queryByText("TR-19")).toBeTruthy();
    expect(screen.getByLabelText("Desde").value).toBe("");
    expect(
      screen.getByRole("button", { name: "Hoy" }).getAttribute("aria-pressed")
    ).toBe("false");
  });

  it("muestra un mensaje propio cuando no hay traspasos en el rango", () => {
    render(
      <HistoryTable
        {...defaultProps}
        transferHistory={[
          buildOrderAt(new Date(2026, 9, 1, 8, 0, 0), "t1", "TR-01"),
        ]}
        cancellableTransferIds={new Set()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Hoy" }));

    expect(
      screen.getByText("No hay traspasos en el rango de fechas seleccionado.")
    ).toBeTruthy();
  });

  it("deshabilita Limpiar filtros sin rango activo", () => {
    render(<HistoryTable {...defaultProps} />);
    expect(
      screen
        .getByRole("button", { name: "Limpiar filtros" })
        .hasAttribute("disabled")
    ).toBe(true);
  });

  it("limpia tambien el folio escrito y se habilita por si solo", () => {
    render(
      <HistoryTable
        {...defaultProps}
        transferHistory={history}
        cancellableTransferIds={new Set()}
      />
    );

    const clearButton = screen.getByRole("button", { name: "Limpiar filtros" });
    expect(clearButton.hasAttribute("disabled")).toBe(true);

    const folioInput = screen.getByLabelText("Buscar traspaso por folio");
    fireEvent.change(folioInput, { target: { value: "TR-20" } });

    expect(screen.queryByText("TR-21")).toBeNull();
    expect(clearButton.hasAttribute("disabled")).toBe(false);

    fireEvent.click(clearButton);

    expect(folioInput.value).toBe("");
    expect(screen.queryByText("TR-21")).toBeTruthy();
    expect(screen.queryByText("TR-20")).toBeTruthy();
    expect(screen.queryByText("TR-19")).toBeTruthy();
    expect(clearButton.hasAttribute("disabled")).toBe(true);
  });

  it("no se habilita con folio compuesto solo de espacios", () => {
    render(<HistoryTable {...defaultProps} />);

    fireEvent.change(screen.getByLabelText("Buscar traspaso por folio"), {
      target: { value: "   " },
    });

    expect(
      screen
        .getByRole("button", { name: "Limpiar filtros" })
        .hasAttribute("disabled")
    ).toBe(true);
  });
});
