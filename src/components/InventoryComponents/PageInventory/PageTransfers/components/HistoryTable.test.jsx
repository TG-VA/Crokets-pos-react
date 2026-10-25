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

  it("boton Cancelar esta deshabilitado durante submitting", () => {
    render(<HistoryTable {...defaultProps} submitting={true} />);
    expect(
      screen.getByRole("button", { name: "Cancelar" }).hasAttribute("disabled")
    ).toBe(true);
  });
});
