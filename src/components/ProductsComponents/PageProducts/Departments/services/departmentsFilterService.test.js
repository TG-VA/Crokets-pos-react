import { describe, it, expect } from "vitest";
import { filterDepartments } from "./departmentsFilterService";

const departments = [
  { id: 1, name: "ALIMENTOS", status: true, commission_enabled: true },
  { id: 2, name: "JUGUETES", status: false, commission_enabled: false },
  { id: 3, name: "ACCESORIOS", status: true, commission_enabled: false },
  { id: 4, name: "HIGIENE", status: false, commission_enabled: true },
];

const ids = (list) => list.map((dept) => dept.id);

describe("filterDepartments", () => {
  it("sin filtros devuelve todos", () => {
    expect(ids(filterDepartments(departments, {}))).toEqual([1, 2, 3, 4]);
  });

  it("busca por nombre sin distinguir mayusculas ni acentos", () => {
    expect(ids(filterDepartments(departments, { search: "  jugue " }))).toEqual(
      [2]
    );
  });

  it("filtra por estatus activo e inactivo", () => {
    expect(ids(filterDepartments(departments, { status: "active" }))).toEqual([
      1, 3,
    ]);
    expect(ids(filterDepartments(departments, { status: "inactive" }))).toEqual(
      [2, 4]
    );
  });

  it("filtra por comision", () => {
    expect(ids(filterDepartments(departments, { commission: "with" }))).toEqual(
      [1, 4]
    );
    expect(
      ids(filterDepartments(departments, { commission: "without" }))
    ).toEqual([2, 3]);
  });

  it("combina filtros", () => {
    expect(
      ids(
        filterDepartments(departments, {
          search: "a",
          status: "active",
          commission: "without",
        })
      )
    ).toEqual([3]);
  });

  it("tolera lista nula", () => {
    expect(filterDepartments(null, { search: "x" })).toEqual([]);
  });
});
