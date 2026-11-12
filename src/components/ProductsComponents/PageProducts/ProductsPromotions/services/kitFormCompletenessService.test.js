import { describe, it, expect } from "vitest";
import {
  isKitFormComplete,
  getMissingKitFields,
} from "./kitFormCompletenessService";

const validForm = {
  barcode: "123",
  description: "Kit",
  price: "100",
  max_kits_per_sale: "1",
  starts_on: "2026-11-01",
  ends_on: "2026-11-30",
};
const products = [{ id: 1, quantity: 2 }];

describe("isKitFormComplete", () => {
  it("acepta un formulario completo", () => {
    expect(isKitFormComplete(validForm, products)).toBe(true);
  });

  it.each(["barcode", "description", "price", "max_kits_per_sale"])(
    "rechaza si falta %s",
    (key) => {
      expect(isKitFormComplete({ ...validForm, [key]: "  " }, products)).toBe(
        false
      );
    }
  );

  it("acepta sin fechas de vigencia con Sin limite marcado", () => {
    expect(
      isKitFormComplete(
        {
          ...validForm,
          starts_on: "",
          ends_on: "",
          no_starts_on: true,
          no_ends_on: true,
        },
        products
      )
    ).toBe(true);
  });

  it.each(["starts_on", "ends_on"])("acepta con solo %s", (key) => {
    const other = key === "starts_on" ? "ends_on" : "starts_on";
    expect(
      isKitFormComplete(
        { ...validForm, [other]: "", [`no_${other}`]: true },
        products
      )
    ).toBe(true);
  });

  it("rechaza sin productos", () => {
    expect(isKitFormComplete(validForm, [])).toBe(false);
  });

  it("rechaza cantidad en cero", () => {
    expect(isKitFormComplete(validForm, [{ id: 1, quantity: 0 }])).toBe(false);
  });

  it("rechaza precio en cero", () => {
    expect(isKitFormComplete({ ...validForm, price: "0" }, products)).toBe(
      false
    );
  });
});

describe("getMissingKitFields", () => {
  it("devuelve lista vacia con un formulario completo", () => {
    expect(getMissingKitFields(validForm, products)).toEqual([]);
  });

  it("nombra los campos de texto faltantes en orden", () => {
    expect(
      getMissingKitFields(
        { ...validForm, barcode: "", description: " ", price: "0" },
        products
      )
    ).toEqual(["Código", "Descripción", "Precio"]);
  });

  it("indica productos cuando no hay ninguno", () => {
    expect(getMissingKitFields(validForm, [])).toEqual(["Productos"]);
  });

  it("indica cantidades cuando alguna es invalida", () => {
    expect(getMissingKitFields(validForm, [{ id: 1, quantity: 0 }])).toEqual([
      "Cantidades",
    ]);
  });
});

describe("getMissingKitFields vigencia", () => {
  it("marca las fechas vacias sin Sin limite", () => {
    const form = { ...validForm, starts_on: "", ends_on: "" };
    expect(getMissingKitFields(form, products)).toEqual([
      "Vigente desde",
      "Vigente hasta",
    ]);
  });

  it("acepta fechas vacias con Sin limite marcado", () => {
    const form = {
      ...validForm,
      starts_on: "",
      ends_on: "",
      no_starts_on: true,
      no_ends_on: true,
    };
    expect(getMissingKitFields(form, products)).toEqual([]);
  });
});
