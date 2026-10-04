import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("../../lib/supabaseClient", () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from "../../lib/supabaseClient";
import { createDepartment, updateDepartment } from "./departmentService";

const thenableQuery = (resolve = { data: null, error: null }) => {
  const q = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  };

  q.select.mockReturnValue(q);
  q.insert.mockReturnValue(q);
  q.update.mockReturnValue(q);
  q.eq.mockReturnValue(q);
  q.then = (onFulfilled, onRejected) =>
    Promise.resolve(resolve).then(onFulfilled, onRejected);

  return q;
};

const errorResult = (error) => ({ data: null, error });

describe("departmentService", () => {
  let departmentsQ;
  let productsQ;
  let consoleErrorSpy;

  beforeEach(() => {
    supabase.from.mockReset();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    departmentsQ = thenableQuery();
    productsQ = thenableQuery();

    supabase.from.mockImplementation((table) => {
      if (table === "departments") return departmentsQ;
      if (table === "products") return productsQ;
      throw new Error(`Tabla inesperada: ${table}`);
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("createDepartment", () => {
    it("rechaza un nombre vacío", async () => {
      const result = await createDepartment("   ");

      expect(result).toEqual({
        success: false,
        data: null,
        error: "El nombre del departamento es obligatorio.",
        partial: false,
      });
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it("crea el departamento con los valores de comisión", async () => {
      const result = await createDepartment("  Nupec  ", {
        commission_enabled: true,
        commission_type: "percent",
        commission_value: 5,
      });

      expect(result.success).toBe(true);
      expect(departmentsQ.insert).toHaveBeenCalledWith({
        name: "Nupec",
        status: true,
        commission_enabled: true,
        commission_type: "percent",
        commission_value: 5,
      });
    });

    it("propaga el error de inserción", async () => {
      departmentsQ.then = (onFulfilled) =>
        Promise.resolve(errorResult({ message: "red caída" })).then(
          onFulfilled
        );

      const result = await createDepartment("Nupec");

      expect(result.success).toBe(false);
      expect(result.error).toBe("red caída");
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe("updateDepartment", () => {
    it("rechaza sin id o sin datos", async () => {
      const result = await updateDepartment(null, null);

      expect(result).toEqual({
        success: false,
        data: null,
        error: "Datos inválidos para actualizar el departamento.",
        partial: false,
      });
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it("propaga la comisión a todos los productos del departamento sin filtrar por valores previos", async () => {
      const result = await updateDepartment("d1", {
        commission_enabled: true,
        commission_type: "percent",
        commission_value: "5",
        propagateToProducts: true,
      });

      expect(result).toEqual({
        success: true,
        data: null,
        error: null,
        partial: false,
      });

      expect(departmentsQ.update).toHaveBeenCalledWith(
        expect.objectContaining({
          commission_enabled: true,
          commission_type: "percent",
          commission_value: 5,
        })
      );
      expect(departmentsQ.eq).toHaveBeenCalledWith("id", "d1");
      expect(departmentsQ.select).not.toHaveBeenCalled();
      expect(departmentsQ.maybeSingle).not.toHaveBeenCalled();

      expect(productsQ.update).toHaveBeenCalledWith({
        commission_enabled: true,
        commission_type: "percent",
        commission_value: 5,
        commission_percent: 5,
      });
      expect(productsQ.eq.mock.calls).toEqual([["department_id", "d1"]]);
    });

    it("propaga con defaults cuando no llegan campos de comisión", async () => {
      const result = await updateDepartment("d1", {
        name: "Nuevo",
        propagateToProducts: true,
      });

      expect(result.success).toBe(true);
      expect(productsQ.update).toHaveBeenCalledWith({
        commission_enabled: false,
        commission_type: "percent",
        commission_value: 0,
        commission_percent: 0.0,
      });
      expect(productsQ.eq.mock.calls).toEqual([["department_id", "d1"]]);
    });

    it("deja commission_percent en 0 para la comisión plana (amount)", async () => {
      await updateDepartment("d1", {
        commission_enabled: true,
        commission_type: "amount",
        commission_value: 3,
        propagateToProducts: true,
      });

      expect(productsQ.update).toHaveBeenCalledWith({
        commission_enabled: true,
        commission_type: "amount",
        commission_value: 3,
        commission_percent: 0.0,
      });
    });

    it("no toca la tabla products cuando propagateToProducts es false", async () => {
      const result = await updateDepartment("d1", {
        commission_enabled: true,
        commission_type: "percent",
        commission_value: 5,
        propagateToProducts: false,
      });

      expect(result.success).toBe(true);
      expect(productsQ.update).not.toHaveBeenCalled();
      expect(supabase.from).toHaveBeenCalledWith("departments");
      expect(supabase.from).not.toHaveBeenCalledWith("products");
    });

    it("propaga el error al actualizar el departamento y no toca productos", async () => {
      departmentsQ.then = (onFulfilled) =>
        Promise.resolve(errorResult({ message: "red caída" })).then(
          onFulfilled
        );

      const result = await updateDepartment("d1", {
        commission_enabled: true,
        commission_type: "percent",
        commission_value: 5,
        propagateToProducts: true,
      });

      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBe("red caída");
      expect(result.partial).toBe(false);
      expect(productsQ.update).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("propaga el error de la actualización masiva de productos", async () => {
      productsQ.then = (onFulfilled) =>
        Promise.resolve(errorResult({ message: "fallo en productos" })).then(
          onFulfilled
        );

      const result = await updateDepartment("d1", {
        commission_enabled: true,
        commission_type: "percent",
        commission_value: 5,
        propagateToProducts: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("fallo en productos");
      expect(productsQ.update).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("captura excepciones inesperadas", async () => {
      departmentsQ.then = (onFulfilled, onRejected) =>
        Promise.reject(new Error("boom")).then(onFulfilled, onRejected);

      const result = await updateDepartment("d1", {
        commission_enabled: true,
        commission_type: "percent",
        commission_value: 5,
        propagateToProducts: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("boom");
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});
