import { describe, expect, it } from "vitest";

import {
  filterInventorySearchProducts,
  getProductMinStock,
  getProductStock,
  isGlobalProduct,
  isProductBelowMinimum,
  sortProductsByNameAndStock,
} from "./inventoryProductCalculationService";

const product = (overrides = {}) => ({
  id: "p1",
  codigo: "ABC-1",
  descripcion: "Croqueta adulto",
  departamento: "Alimento",
  existencia: 5,
  minimo: 10,
  is_global: true,
  ...overrides,
});

describe("isGlobalProduct", () => {
  it("solo considera global el producto marcado explicitamente", () => {
    expect(isGlobalProduct(product({ is_global: true }))).toBe(true);
    expect(isGlobalProduct(product({ is_global: false }))).toBe(false);
    expect(isGlobalProduct(product({ is_global: undefined }))).toBe(false);
    expect(isGlobalProduct(null)).toBe(false);
  });
});

describe("stock y minimo", () => {
  it("lee las dos formas de nombre que usa el catalogo", () => {
    expect(getProductStock(product())).toBe(5);
    expect(getProductStock({ stock: "7.5" })).toBe(7.5);
    expect(getProductMinStock(product())).toBe(10);
    expect(getProductMinStock({ min_stock: "3" })).toBe(3);
  });

  it("trata valores ausentes o no numericos como cero", () => {
    expect(getProductStock({ existencia: "abc" })).toBe(0);
    expect(getProductMinStock({ minimo: null })).toBe(0);
    expect(getProductStock(null)).toBe(0);
  });
});

describe("isProductBelowMinimum", () => {
  it("marca bajo minimo cuando la existencia es igual o menor al minimo", () => {
    expect(isProductBelowMinimum(product({ existencia: 5, minimo: 10 }))).toBe(
      true
    );
    expect(isProductBelowMinimum(product({ existencia: 10, minimo: 10 }))).toBe(
      true
    );
    expect(isProductBelowMinimum(product({ existencia: 11, minimo: 10 }))).toBe(
      false
    );
  });

  it("no marca productos sin minimo configurado o sin inventario inicial", () => {
    expect(isProductBelowMinimum(product({ existencia: 0, minimo: 0 }))).toBe(
      false
    );
    expect(
      isProductBelowMinimum(
        product({ existencia: 1, minimo: 10, has_been_stocked: false })
      )
    ).toBe(false);
    expect(isProductBelowMinimum(null)).toBe(false);
  });
});

describe("sortProductsByNameAndStock", () => {
  it("ordena alfabeticamente por nombre sin distinguir mayusculas ni acentos", () => {
    const products = [
      product({ id: "z", descripcion: "Zeta" }),
      product({ id: "a", descripcion: "alfa" }),
      product({ id: "b", descripcion: "Beta" }),
    ];

    expect(sortProductsByNameAndStock(products).map((item) => item.id)).toEqual(
      ["a", "b", "z"]
    );
  });

  it("usa la cantidad ascendente como desempate cuando el nombre coincide", () => {
    const products = [
      product({ id: "high", descripcion: "Mismo nombre", existencia: 8 }),
      product({ id: "low", descripcion: "Mismo nombre", existencia: 2 }),
    ];

    expect(sortProductsByNameAndStock(products).map((item) => item.id)).toEqual(
      ["low", "high"]
    );
  });

  it("no muta el arreglo recibido", () => {
    const products = [
      product({ id: "z", descripcion: "Zeta" }),
      product({ id: "a", descripcion: "Alfa" }),
    ];

    sortProductsByNameAndStock(products);

    expect(products.map((item) => item.id)).toEqual(["z", "a"]);
  });
});

describe("filterInventorySearchProducts", () => {
  const products = [
    product({
      id: "bajo",
      codigo: "BAJO-1",
      descripcion: "Croqueta baja",
      departamento: "Alimento",
      existencia: 2,
      minimo: 10,
    }),
    product({
      id: "ok",
      codigo: "OK-1",
      descripcion: "Shampoo",
      departamento: "Higiene",
      existencia: 20,
      minimo: 10,
    }),
    product({
      id: "sin-minimo",
      codigo: "SM-1",
      descripcion: "Juguete",
      departamento: "Accesorios",
      existencia: 0,
      minimo: 0,
    }),
  ];

  it("busca por nombre, codigo o departamento y conserva el orden alfabetico", () => {
    expect(
      filterInventorySearchProducts(products, { searchTerm: "higiene" }).map(
        (item) => item.id
      )
    ).toEqual(["ok"]);
    expect(
      filterInventorySearchProducts(products, { searchTerm: "BAJO" }).map(
        (item) => item.id
      )
    ).toEqual(["bajo"]);
    expect(
      filterInventorySearchProducts(products, { searchTerm: "" }).map(
        (item) => item.id
      )
    ).toEqual(["bajo", "sin-minimo", "ok"]);
  });

  it("filtra solo los productos bajo minimo", () => {
    expect(
      filterInventorySearchProducts(products, {
        belowMinimumOnly: true,
      }).map((item) => item.id)
    ).toEqual(["bajo"]);
  });
});
