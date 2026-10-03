import { describe, it, expect, beforeEach } from "vitest";

import { render, screen, fireEvent, within } from "@testing-library/react";

import KardexProductPanel from "./KardexProductPanel";

const buildRow = (index) => ({
  id: `m${index}`,
  created_at: `2026-03-${String((index % 28) + 1).padStart(2, "0")}T15:30:00.000Z`,
  movement_type: "purchase",
  reason: `LOTE ${index}`,
  entryQty: 5,
  exitQty: 0,
  runningStock: 10 + index,
  unit_cost: 100,
  total_cost: 500,
});

const buildRows = (total) =>
  Array.from({ length: total }, (_, index) => buildRow(index));

const product = { id: "p1", nombre: "ALIMENTO PERRO", minimo: 2 };

const panelProps = (overrides = {}) => ({
  product,
  rows: buildRows(25),
  movementState: { loading: false, error: "" },
  ...overrides,
});

const getBodyRowReasons = () =>
  screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).queryByText(/LOTE (\d+)/)?.textContent ?? "");

const clickPageButton = (name) =>
  fireEvent.click(screen.getByRole("button", { name }));

const changePageSize = (size) =>
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: String(size) },
  });

describe("KardexProductPanel", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("no renderiza nada sin producto", () => {
    const { container } = render(
      <KardexProductPanel product={null} rows={buildRows(5)} />
    );

    expect(container.innerHTML).toBe("");
  });

  it("solo pagina la primera pagina de movimientos", () => {
    render(<KardexProductPanel {...panelProps()} />);

    expect(getBodyRowReasons()).toHaveLength(10);
    expect(getBodyRowReasons()[0]).toBe("COMPRA — LOTE 0");
    expect(screen.getByText("25 movimiento(s)")).toBeTruthy();
    expect(screen.getByText(/Mostrando 1 a 10 de 25 movimientos/)).toBeTruthy();
    expect(screen.getByText("Página 1 de 3")).toBeTruthy();
  });

  it("no muestra la barra de paginacion sin movimientos", () => {
    render(<KardexProductPanel {...panelProps({ rows: [] })} />);

    expect(screen.queryByText(/Mostrando/)).toBeNull();
    expect(screen.getByText(/No hay movimientos registrados/)).toBeTruthy();
  });

  it("avanza y retrocede entre paginas", () => {
    render(<KardexProductPanel {...panelProps()} />);

    clickPageButton("Siguiente");

    expect(screen.getByText("Página 2 de 3")).toBeTruthy();
    expect(getBodyRowReasons()).toHaveLength(10);
    expect(getBodyRowReasons()[0]).toBe("COMPRA — LOTE 10");
    expect(
      screen.getByText(/Mostrando 11 a 20 de 25 movimientos/)
    ).toBeTruthy();

    clickPageButton("Anterior");

    expect(screen.getByText("Página 1 de 3")).toBeTruthy();
    expect(getBodyRowReasons()[0]).toBe("COMPRA — LOTE 0");
  });

  it("muestra la ultima pagina parcial", () => {
    render(<KardexProductPanel {...panelProps()} />);

    clickPageButton("Siguiente");
    clickPageButton("Siguiente");

    expect(screen.getByText("Página 3 de 3")).toBeTruthy();
    expect(getBodyRowReasons()).toHaveLength(5);
    expect(getBodyRowReasons()[0]).toBe("COMPRA — LOTE 20");
    expect(
      screen.getByText(/Mostrando 21 a 25 de 25 movimientos/)
    ).toBeTruthy();
  });

  it("mantiene paginables los movimientos con costo a lo largo de las paginas", () => {
    render(<KardexProductPanel {...panelProps()} />);

    clickPageButton("Siguiente");

    const cells = screen.getAllByRole("row")[1].querySelectorAll("td");

    expect(cells).toHaveLength(7);
    expect(cells[5].textContent).toContain("$");
    expect(cells[6].textContent).toContain("$");
  });

  it("cambia el tamano de pagina y vuelve a la primera pagina", () => {
    render(<KardexProductPanel {...panelProps()} />);

    clickPageButton("Siguiente");

    expect(screen.getByText("Página 2 de 3")).toBeTruthy();

    changePageSize(25);

    expect(screen.getByText("Página 1 de 1")).toBeTruthy();
    expect(getBodyRowReasons()).toHaveLength(25);
    expect(screen.getByText(/Mostrando 1 a 25 de 25 movimientos/)).toBeTruthy();
  });

  it("reinicia la pagina al cambiar de producto", () => {
    const { rerender } = render(<KardexProductPanel {...panelProps()} />);

    clickPageButton("Siguiente");

    expect(screen.getByText("Página 2 de 3")).toBeTruthy();

    rerender(
      <KardexProductPanel
        {...panelProps({
          product: { id: "p2", nombre: "ALIMENTO GATO", minimo: 2 },
        })}
      />
    );

    expect(screen.getByText("Página 1 de 3")).toBeTruthy();
    expect(getBodyRowReasons()[0]).toBe("COMPRA — LOTE 0");
  });

  it("reinicia la pagina al aplicar un rango de fechas", () => {
    const { rerender } = render(<KardexProductPanel {...panelProps()} />);

    clickPageButton("Siguiente");

    expect(screen.getByText("Página 2 de 3")).toBeTruthy();

    rerender(
      <KardexProductPanel
        {...panelProps({
          appliedDateFrom: "2026-03-01",
          appliedDateTo: "2026-03-31",
        })}
      />
    );

    expect(screen.getByText("Página 1 de 3")).toBeTruthy();
    expect(
      screen.getByText("Rango activo: 01/03/2026 - 31/03/2026")
    ).toBeTruthy();
  });

  it("acota la pagina cuando el conjunto de movimientos se reduce", () => {
    const { rerender } = render(
      <KardexProductPanel {...panelProps({ rows: buildRows(25) })} />
    );

    clickPageButton("Siguiente");
    clickPageButton("Siguiente");

    expect(screen.getByText("Página 3 de 3")).toBeTruthy();

    rerender(<KardexProductPanel {...panelProps({ rows: buildRows(12) })} />);

    expect(screen.getByText("Página 2 de 2")).toBeTruthy();
    expect(getBodyRowReasons()).toHaveLength(2);
  });

  it("mantiene el panel en carga sin barra de paginacion", () => {
    render(
      <KardexProductPanel
        {...panelProps({
          rows: [],
          movementState: { loading: true, error: "" },
        })}
      />
    );

    expect(screen.getByText("Cargando movimientos...")).toBeTruthy();
    expect(screen.queryByText(/Mostrando/)).toBeNull();
  });

  it("propaga el error de carga sin barra de paginacion", () => {
    render(
      <KardexProductPanel
        {...panelProps({
          rows: [],
          movementState: {
            loading: false,
            error: "No se pudo cargar el kardex",
          },
        })}
      />
    );

    expect(screen.getByText("No se pudo cargar el kardex")).toBeTruthy();
    expect(screen.queryByText(/Mostrando/)).toBeNull();
  });

  it("pagina cada producto de forma independiente", () => {
    render(
      <>
        <KardexProductPanel {...panelProps({ rows: buildRows(12) })} />

        <KardexProductPanel
          {...panelProps({
            product: { id: "p2", nombre: "ALIMENTO GATO", minimo: 0 },
            rows: buildRows(3),
          })}
        />
      </>
    );

    expect(screen.getAllByText("Página 1 de 2")).toHaveLength(1);
    expect(screen.getAllByText("Página 1 de 1")).toHaveLength(1);
    expect(screen.getByText("12 movimiento(s)")).toBeTruthy();
    expect(screen.getByText("3 movimiento(s)")).toBeTruthy();
  });
});
