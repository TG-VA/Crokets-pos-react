import { describe, it, expect } from "vitest";
import { hasUnsavedKitChanges } from "./kitFormChangesService";

const emptyForm = {
  barcode: "",
  description: "",
  price: "",
  max_kits_per_sale: "1",
  starts_on: "",
  ends_on: "",
  no_starts_on: false,
  no_ends_on: false,
};

const loadedForm = {
  ...emptyForm,
  barcode: "KIT001",
  description: "KIT PERRO",
  price: "100",
  starts_on: "2026-11-01",
  ends_on: "2026-12-01",
};

const products = [
  { id: "a", quantity: 1 },
  { id: "b", quantity: 2 },
];

const initialOf = (form, selectedProducts) => ({ form, selectedProducts });

describe("hasUnsavedKitChanges", () => {
  it("no hay cambios en un formulario vacio recien abierto", () => {
    expect(hasUnsavedKitChanges(initialOf(emptyForm, []), emptyForm, [])).toBe(
      false
    );
  });

  it("detecta cambios al escribir en un formulario nuevo", () => {
    const form = { ...emptyForm, description: "KIT" };
    expect(hasUnsavedKitChanges(initialOf(emptyForm, []), form, [])).toBe(true);
  });

  it("no hay cambios en un kit cargado sin tocar", () => {
    expect(
      hasUnsavedKitChanges(
        initialOf(loadedForm, products),
        { ...loadedForm },
        products.map((p) => ({ ...p }))
      )
    ).toBe(false);
  });

  it("detecta cambio de precio o fechas en un kit cargado", () => {
    const initial = initialOf(loadedForm, products);
    expect(
      hasUnsavedKitChanges(initial, { ...loadedForm, price: "90" }, products)
    ).toBe(true);
    expect(
      hasUnsavedKitChanges(initial, { ...loadedForm, ends_on: "" }, products)
    ).toBe(true);
  });

  it("ignora espacios sobrantes en texto", () => {
    const initial = initialOf(loadedForm, products);
    expect(
      hasUnsavedKitChanges(
        initial,
        { ...loadedForm, description: "  KIT PERRO " },
        products
      )
    ).toBe(false);
  });

  it("detecta productos agregados, quitados o con otra cantidad", () => {
    const initial = initialOf(loadedForm, products);
    expect(
      hasUnsavedKitChanges(initial, loadedForm, [
        ...products,
        { id: "c", quantity: 1 },
      ])
    ).toBe(true);
    expect(hasUnsavedKitChanges(initial, loadedForm, [products[0]])).toBe(true);
    expect(
      hasUnsavedKitChanges(initial, loadedForm, [
        products[0],
        { id: "b", quantity: 5 },
      ])
    ).toBe(true);
  });

  it("no depende del orden de los productos", () => {
    const initial = initialOf(loadedForm, products);
    expect(
      hasUnsavedKitChanges(initial, loadedForm, [...products].reverse())
    ).toBe(false);
  });
});
