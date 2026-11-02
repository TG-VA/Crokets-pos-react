import { describe, it, expect } from "vitest";
import { validateKitForm } from "./kitFormValidationService";

const validForm = {
  barcode: "123",
  description: "Kit",
  price: "100",
  max_kits_per_sale: "1",
  starts_on: "2026-11-01",
  ends_on: "2026-11-30",
};
const products = [{ id: 1, quantity: 2 }];

describe("validateKitForm", () => {
  it("devuelve null con un formulario valido", () => {
    expect(validateKitForm(validForm, products)).toBeNull();
  });

  it("acepta sin fechas de vigencia con Sin limite marcado", () => {
    expect(
      validateKitForm(
        {
          ...validForm,
          starts_on: "",
          ends_on: "",
          no_starts_on: true,
          no_ends_on: true,
        },
        products
      )
    ).toBeNull();
  });

  it.each([
    [
      { barcode: " " },
      "Código requerido",
      "Captura el código de barras del kit.",
    ],
    [
      { description: "" },
      "Descripción requerida",
      "Captura la descripción del kit.",
    ],
    [
      { price: "0" },
      "Precio requerido",
      "Captura un precio válido para el kit.",
    ],
    [
      { max_kits_per_sale: "0" },
      "Límite inválido",
      "El límite de venta por transacción debe ser un número entero mayor o igual a 1.",
    ],
    [
      { max_kits_per_sale: "1.5" },
      "Límite inválido",
      "El límite de venta por transacción debe ser un número entero mayor o igual a 1.",
    ],
  ])("rechaza %j", (override, title, message) => {
    expect(validateKitForm({ ...validForm, ...override }, products)).toEqual({
      title,
      message,
    });
  });

  it("rechaza una vigencia con fin anterior al inicio", () => {
    const result = validateKitForm(
      { ...validForm, starts_on: "2026-11-30", ends_on: "2026-11-01" },
      products
    );
    expect(result.title).toBe("Vigencia inválida");
    expect(result.message).toBeTruthy();
  });

  it("rechaza un kit sin productos", () => {
    expect(validateKitForm(validForm, [])).toEqual({
      title: "Productos requeridos",
      message: "Agrega al menos un producto al kit.",
    });
  });

  it("rechaza productos con cantidad cero", () => {
    expect(validateKitForm(validForm, [{ id: 1, quantity: 0 }])).toEqual({
      title: "Cantidad inválida",
      message: "Todos los productos del kit deben tener cantidad mayor a 0.",
    });
  });

  it("reporta primero el codigo cuando hay varios errores", () => {
    expect(
      validateKitForm({ ...validForm, barcode: "", price: "0" }, [])
    ).toEqual({
      title: "Código requerido",
      message: "Captura el código de barras del kit.",
    });
  });
});

describe("validateKitForm vigencia sin definir", () => {
  it("rechaza fecha de inicio vacia sin Sin limite", () => {
    const error = validateKitForm({ ...validForm, starts_on: "" }, products);
    expect(error?.title).toBe("Vigencia requerida");
  });

  it("rechaza fecha de fin vacia sin Sin limite", () => {
    const error = validateKitForm({ ...validForm, ends_on: "" }, products);
    expect(error?.title).toBe("Vigencia requerida");
  });

  it("acepta fechas vacias con Sin limite marcado", () => {
    const form = {
      ...validForm,
      starts_on: "",
      ends_on: "",
      no_starts_on: true,
      no_ends_on: true,
    };
    expect(validateKitForm(form, products)).toBeNull();
  });
});
