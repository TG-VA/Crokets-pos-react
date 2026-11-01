import { describe, it, expect } from "vitest";
import { filterKits } from "./kitsFilterService";

const kits = [
  { id: 1, is_active: true, products: { name: "KIT PERRO", barcode: "111" } },
  { id: 2, is_active: false, products: { name: "KIT GATO", barcode: "222" } },
  { id: 3, is_active: true, products: { name: "COMBO PECES", barcode: "333" } },
  {
    id: 4,
    is_active: true,
    products: { name: "KIT CACHORRÓ", barcode: "444" },
  },
];

describe("filterKits", () => {
  it("sin filtros devuelve todos", () => {
    expect(filterKits(kits)).toHaveLength(4);
  });

  it("filtra por estado activo e inactivo", () => {
    expect(filterKits(kits, { status: "active" }).map((k) => k.id)).toEqual([
      1, 3, 4,
    ]);
    expect(filterKits(kits, { status: "inactive" }).map((k) => k.id)).toEqual([
      2,
    ]);
  });

  it("busca por nombre sin acentos ni mayusculas", () => {
    expect(filterKits(kits, { searchTerm: "perro" }).map((k) => k.id)).toEqual([
      1,
    ]);
  });

  it("ignora acentos en el nombre y en el termino", () => {
    expect(
      filterKits(kits, { searchTerm: "cachorro" }).map((k) => k.id)
    ).toEqual([4]);
    expect(
      filterKits(kits, { searchTerm: "CACHORRÓ" }).map((k) => k.id)
    ).toEqual([4]);
  });

  it("busca por codigo de barras", () => {
    expect(filterKits(kits, { searchTerm: "222" }).map((k) => k.id)).toEqual([
      2,
    ]);
  });

  it("combina busqueda y estado", () => {
    expect(
      filterKits(kits, { searchTerm: "kit", status: "active" }).map((k) => k.id)
    ).toEqual([1, 4]);
  });

  it("tolera entradas invalidas", () => {
    expect(filterKits(null)).toEqual([]);
  });
});
