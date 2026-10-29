import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import ModalPaginatedList from "./ModalPaginatedList";

const buildItems = (count) =>
  Array.from({ length: count }, (_, index) => ({
    id: `p${index + 1}`,
    name: `Producto ${index + 1}`,
  }));

const renderList = (count, pageSize = 5) =>
  render(
    <ModalPaginatedList
      items={buildItems(count)}
      pageSize={pageSize}
      renderItem={(item) => <div key={item.id}>{item.name}</div>}
    />
  );

describe("ModalPaginatedList", () => {
  it("muestra solo los elementos de la primera pagina", () => {
    renderList(12);

    expect(screen.getAllByText(/^Producto \d+$/)).toHaveLength(5);
    expect(screen.getByText("Producto 1")).toBeTruthy();
    expect(screen.queryByText("Producto 6")).toBeNull();
  });

  it("avanza y retrocede de pagina con los controles", () => {
    renderList(12);

    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByText("Producto 6")).toBeTruthy();
    expect(screen.queryByText("Producto 1")).toBeNull();
    expect(screen.getByText("Página 2 de 3")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Anterior" }));
    expect(screen.getByText("Producto 1")).toBeTruthy();
  });

  it("la ultima pagina muestra los elementos restantes", () => {
    renderList(12);

    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getAllByText(/^Producto \d+$/)).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Siguiente" }).disabled).toBe(
      true
    );
  });

  it("no muestra controles cuando todo cabe en una pagina", () => {
    renderList(5);

    expect(screen.getAllByText(/^Producto \d+$/)).toHaveLength(5);
    expect(screen.queryByRole("button", { name: "Siguiente" })).toBeNull();
  });

  it("no muestra el selector de tamano de pagina", () => {
    renderList(12);

    expect(screen.queryByRole("combobox")).toBeNull();
  });
});
