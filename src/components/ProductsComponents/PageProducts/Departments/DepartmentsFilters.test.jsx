import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DepartmentsFilters from "./DepartmentsFilters";

const baseFilters = { search: "", status: "all", commission: "all" };

const renderFilters = (onChange = vi.fn()) => {
  render(<DepartmentsFilters filters={baseFilters} onChange={onChange} />);
  return onChange;
};

describe("DepartmentsFilters", () => {
  it("notifica el texto de busqueda", () => {
    const onChange = renderFilters();
    fireEvent.change(screen.getByLabelText("Buscar departamento"), {
      target: { value: "alim" },
    });
    expect(onChange).toHaveBeenCalledWith("search", "alim");
  });

  it("notifica el filtro de estatus", () => {
    const onChange = renderFilters();
    fireEvent.change(screen.getByLabelText("Filtrar por estatus"), {
      target: { value: "inactive" },
    });
    expect(onChange).toHaveBeenCalledWith("status", "inactive");
  });

  it("notifica el filtro de comision", () => {
    const onChange = renderFilters();
    fireEvent.change(screen.getByLabelText("Filtrar por comisión"), {
      target: { value: "with" },
    });
    expect(onChange).toHaveBeenCalledWith("commission", "with");
  });
});
