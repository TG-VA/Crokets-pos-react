import { describe, it, expect } from "vitest";

import { validateBranchFormValues } from "./branchFormValidation";

const validForm = {
  branchType: "operational",
  code: "CEN",
  name: "Centro",
  city: "Cancún",
  state: "Quintana Roo",
  phone: "",
  email: "",
  address: "",
  timezone: "America/Cancun",
};

describe("validateBranchFormValues", () => {
  it("acepta un formulario operativo valido sin contacto", () => {
    expect(validateBranchFormValues(validForm)).toEqual({});
  });

  it("exige codigo, nombre, ciudad, estado y zona horaria en el alta", () => {
    const errors = validateBranchFormValues({
      branchType: "operational",
    });

    expect(Object.keys(errors).sort()).toEqual(
      ["city", "code", "name", "state", "timezone"].sort()
    );
  });

  it("no exige codigo en edicion", () => {
    expect(
      validateBranchFormValues({ ...validForm, code: "" }, { isEdit: true })
    ).toEqual({});
  });

  it("valida telefono y correo de una sucursal operativa", () => {
    const errors = validateBranchFormValues({
      ...validForm,
      phone: "123",
      email: "correo",
    });

    expect(errors.phone).toBe(
      "El teléfono debe contener exactamente 10 dígitos."
    );
    expect(errors.email).toBe("El correo no tiene un formato válido.");
  });

  it("ignora telefono, correo y direccion de una sucursal admin", () => {
    const errors = validateBranchFormValues({
      ...validForm,
      branchType: "admin",
      phone: "123",
      email: "correo",
      address: "x".repeat(300),
    });

    expect(errors).toEqual({});
  });

  it("rechaza un tipo desconocido o vacio", () => {
    expect(
      validateBranchFormValues({ ...validForm, branchType: "otro" }).branchType
    ).toBe("Selecciona un tipo de sucursal válido.");
    expect(
      validateBranchFormValues({ ...validForm, branchType: undefined })
        .branchType
    ).toBeDefined();
  });
});
