import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";

import useBranchForm from "./useBranchForm";

const validBranch = {
  id: "b1",
  code: "CEN",
  name: "Centro",
  city: "Cancún",
  state: "Quintana Roo",
  phone: "9999999999",
  email: "contacto@centro.com",
  address: "Calle 10 #100, Centro",
  timezone: "America/Cancun",
};

describe("useBranchForm", () => {
  it("hidrata los valores desde la sucursal existente", () => {
    const { result } = renderHook(() => useBranchForm(validBranch));

    expect(result.current.isEdit).toBe(true);
    expect(result.current.values).toEqual({
      branchType: "operational",
      code: "CEN",
      name: "Centro",
      city: "Cancún",
      state: "Quintana Roo",
      phone: "9999999999",
      email: "contacto@centro.com",
      address: "Calle 10 #100, Centro",
      timezone: "America/Cancun",
    });
    expect(result.current.isValid).toBe(true);
  });

  it("arranca vacio y valido para alta cuando no hay sucursal", () => {
    const { result } = renderHook(() => useBranchForm(null));

    expect(result.current.isEdit).toBe(false);
    expect(result.current.values.code).toBe("");
    expect(result.current.errors.code).toBe(
      "El código de la sucursal es obligatorio."
    );
    expect(result.current.isValid).toBe(false);
  });

  it("valida campos obligatorios del alta", () => {
    const { result } = renderHook(() => useBranchForm(null));

    expect(result.current.errors.name).toBeTruthy();
    expect(result.current.errors.city).toBeTruthy();
    expect(result.current.errors.state).toBeTruthy();
    expect(result.current.errors.timezone).toBeFalsy();
  });

  it("no exige code en modo edicion", () => {
    const { result } = renderHook(() => useBranchForm(validBranch));

    expect(result.current.errors.code).toBeUndefined();
  });

  it("sanea el telefono a digitos y el codigo a mayusculas al escribir", () => {
    const { result } = renderHook(() => useBranchForm(null));

    act(() => {
      result.current.handleChange("code")({ target: { value: "cen01" } });
    });
    act(() => {
      result.current.handleChange("phone")({
        target: { value: "ab9-9999999999" },
      });
    });

    expect(result.current.values.code).toBe("CEN01");
    expect(result.current.values.phone).toBe("9999999999");
  });

  it("elimina espacios y caracteres invalidos del codigo", () => {
    const { result } = renderHook(() => useBranchForm(null));

    act(() => {
      result.current.handleChange("code")({ target: { value: "ce n@1!" } });
    });

    expect(result.current.values.code).toBe("CEN1");
  });

  it("limita el codigo a 20 caracteres alfanumericos", () => {
    const { result } = renderHook(() => useBranchForm(null));

    act(() => {
      result.current.handleChange("code")({
        target: { value: "a".repeat(30) },
      });
    });

    expect(result.current.values.code).toBe("A".repeat(20));
  });

  it("exige telefono de exactamente 10 digitos cuando se ingresa", () => {
    const { result } = renderHook(() => useBranchForm(null));

    act(() => {
      result.current.handleChange("phone")({ target: { value: "12345" } });
    });

    expect(result.current.errors.phone).toBeTruthy();

    act(() => {
      result.current.handleChange("phone")({
        target: { value: "1234567890" },
      });
    });

    expect(result.current.errors.phone).toBeUndefined();
  });

  it("rechaza correo con formato invalido", () => {
    const { result } = renderHook(() => useBranchForm(validBranch));

    act(() => {
      result.current.handleChange("email")({
        target: { value: "no-es-correo" },
      });
    });

    expect(result.current.errors.email).toBeTruthy();
    expect(result.current.isValid).toBe(false);
  });

  it("getSanitizedValues devuelve el payload listo para el servicio", () => {
    const { result } = renderHook(() => useBranchForm(null));

    act(() => {
      result.current.handleChange("code")({ target: { value: " sur " } });
    });
    act(() => {
      result.current.handleChange("name")({ target: { value: " Sur " } });
    });
    act(() => {
      result.current.handleChange("city")({ target: { value: "Cancún" } });
    });
    act(() => {
      result.current.handleChange("state")({ target: { value: "QR" } });
    });

    expect(result.current.getSanitizedValues()).toEqual({
      branchType: "operational",
      code: "SUR",
      name: "Sur",
      city: "Cancún",
      state: "QR",
      phone: "",
      email: "",
      address: "",
      timezone: "America/Cancun",
    });
  });

  it("reset restaura los valores iniciales", () => {
    const { result } = renderHook(() => useBranchForm(validBranch));

    act(() => {
      result.current.handleChange("name")({ target: { value: "Otro" } });
    });
    act(() => {
      result.current.reset();
    });

    expect(result.current.values.name).toBe("Centro");
    expect(result.current.touched).toBe(false);
  });

  it("no expone errores visibles al abrir el formulario limpio", () => {
    const { result } = renderHook(() => useBranchForm(null));

    expect(result.current.errors.code).toBeTruthy();
    expect(result.current.shouldShowError("code")).toBe(false);
    expect(result.current.getFieldError("code")).toBeUndefined();
    expect(result.current.isSubmitted).toBe(false);
  });

  it("muestra el error del campo despues de tocarlo", () => {
    const { result } = renderHook(() => useBranchForm(null));

    act(() => {
      result.current.handleBlur("code")();
    });

    expect(result.current.shouldShowError("code")).toBe(true);
    expect(result.current.getFieldError("code")).toBe(
      "El código de la sucursal es obligatorio."
    );
  });

  it("marca el submit incompleto como enviado y expone todos los errores", () => {
    const { result } = renderHook(() => useBranchForm(null));

    act(() => {
      result.current.markSubmitted();
    });

    expect(result.current.isSubmitted).toBe(true);
    expect(result.current.shouldShowError("name")).toBe(true);
    expect(result.current.shouldShowError("city")).toBe(true);
  });

  it("limpia los errores visibles al resetear", () => {
    const { result } = renderHook(() => useBranchForm(null));

    act(() => {
      result.current.markSubmitted();
    });
    act(() => {
      result.current.reset();
    });

    expect(result.current.isSubmitted).toBe(false);
    expect(result.current.getFieldError("code")).toBeUndefined();
  });

  it("una sucursal admin oculta y vacia telefono, correo y direccion", () => {
    const { result } = renderHook(() =>
      useBranchForm({ ...validBranch, phone: "123", branchType: "admin" })
    );

    expect(result.current.values.branchType).toBe("admin");
    expect(result.current.errors.phone).toBeUndefined();
    expect(result.current.isValid).toBe(true);
    expect(result.current.getSanitizedValues()).toMatchObject({
      branchType: "admin",
      phone: "",
      email: "",
      address: "",
    });
  });

  it("cambiar el tipo a admin descarta los errores de contacto", () => {
    const { result } = renderHook(() => useBranchForm(null));

    act(() => {
      result.current.handleChange("phone")({ target: { value: "123" } });
    });
    expect(result.current.errors.phone).toBeDefined();

    act(() => {
      result.current.handleChange("branchType")({
        target: { value: "admin" },
      });
    });
    expect(result.current.errors.phone).toBeUndefined();
  });
});
