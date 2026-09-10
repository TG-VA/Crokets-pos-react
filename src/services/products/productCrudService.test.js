import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../lib/supabaseClient", () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from "../../lib/supabaseClient";
import {
  createProduct,
  updateProductByCodigo,
  deleteProductByCodigo,
} from "./productCrudService";

const thenableQuery = (resolve = { data: null, error: null }) => {
  const q = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
  };

  q.select.mockReturnValue(q);
  q.insert.mockReturnValue(q);
  q.update.mockReturnValue(q);
  q.eq.mockReturnValue(q);
  q.neq.mockReturnValue(q);
  q.then = (onFulfilled, onRejected) =>
    Promise.resolve(resolve).then(onFulfilled, onRejected);

  return q;
};

const validPayload = {
  codigo: "750123",
  descripcion: "CROQUETA PREMIUM",
  departamento: "Alimentos",
  costo: "10",
  precio: "25",
  existencia: "5",
  minimo: "1",
  maximo: "9",
  use_inventory: true,
  status: "activo",
  sale_type: "unidad",
  unit: "pieza",
  tax: 16,
  cfdi: "01010101",
  commission_enabled: false,
  commission_type: "percent",
  commission_value: 0,
  commission_percent: 0,
};

describe("productCrudService", () => {
  let productsQ;
  let inventoryQ;
  let discountsQ;

  beforeEach(() => {
    supabase.from.mockReset();
    productsQ = thenableQuery();
    inventoryQ = thenableQuery();
    discountsQ = thenableQuery();

    supabase.from.mockImplementation((table) => {
      if (table === "products") return productsQ;
      if (table === "branch_inventory") return inventoryQ;
      if (table === "product_discounts") return discountsQ;
      throw new Error(`Tabla inesperada: ${table}`);
    });
  });

  describe("createProduct", () => {
    it("rechaza sin sucursal activa", async () => {
      const result = await createProduct(null, [], validPayload);

      expect(result).toEqual({
        success: false,
        data: null,
        error: "No hay sucursal activa.",
        partial: false,
      });
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it("rechaza código o descripción vacíos", async () => {
      const result = await createProduct("b1", [], {
        codigo: "",
        descripcion: "   ",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("obligatorios");
      expect(result.partial).toBe(false);
    });

    it("crea el producto y su inventario correctamente", async () => {
      productsQ.single.mockResolvedValue({ data: { id: "p1" }, error: null });

      const result = await createProduct("b1", [], validPayload);

      expect(result).toEqual({
        success: true,
        data: { id: "p1" },
        error: null,
        partial: false,
      });

      const insertedProduct = productsQ.insert.mock.calls[0][0];
      expect(insertedProduct.barcode).toBe("750123");
      expect(insertedProduct.name).toBe("CROQUETA PREMIUM");
      expect(insertedProduct.department_id).toBeNull();
      expect(insertedProduct.tracks_inventory).toBe(true);
      expect(insertedProduct.status).toBe(true);
      expect(insertedProduct.cost_price).toBe(10);
      expect(insertedProduct.sale_price).toBe(25);

      const insertedInventory = inventoryQ.insert.mock.calls[0][0];
      expect(insertedInventory).toEqual(
        expect.objectContaining({
          branch_id: "b1",
          product_id: "p1",
          stock: 5,
          min_stock: 1,
          max_stock: 9,
          has_been_stocked: true,
        })
      );
    });

    it("resuelve el department_id a partir del nombre del departamento", async () => {
      productsQ.single.mockResolvedValue({ data: { id: "p1" }, error: null });
      const departments = [{ id: "d7", name: "Alimentos" }];

      await createProduct("b1", departments, validPayload);

      expect(productsQ.insert.mock.calls[0][0].department_id).toBe("d7");
    });

    it("detecta código de barras duplicado (error 23505)", async () => {
      productsQ.single.mockResolvedValue({
        data: null,
        error: { code: "23505", message: "duplicate products_barcode_key" },
      });

      const result = await createProduct("b1", [], validPayload);

      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.partial).toBe(false);
      expect(result.error).toContain("código de barras");
    });

    it("reporta partial:true si el inventario falla tras crear el producto", async () => {
      productsQ.single.mockResolvedValue({ data: { id: "p1" }, error: null });
      inventoryQ.then = (onFulfilled, onRejected) =>
        Promise.resolve({ data: null, error: { message: "red caída" } }).then(
          onFulfilled,
          onRejected
        );

      const result = await createProduct("b1", [], validPayload);

      expect(result.success).toBe(false);
      expect(result.partial).toBe(true);
      expect(result.error).toBe("red caída");
      expect(result.data).toBeNull();
    });

    it("captura errores inesperados y devuelve su mensaje", async () => {
      productsQ.single.mockImplementation(() =>
        Promise.reject(new Error("fallo de red"))
      );

      const result = await createProduct("b1", [], validPayload);

      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.partial).toBe(false);
      expect(result.error).toContain("fallo de red");
    });
  });

  describe("updateProductByCodigo", () => {
    it("rechaza sin sucursal activa", async () => {
      const result = await updateProductByCodigo(null, [], "ABC", {
        codigo: "ABC",
        descripcion: "X",
      });

      expect(result.error).toBe("No hay sucursal activa.");
      expect(result.partial).toBe(false);
    });

    it("rechaza sin código original", async () => {
      const result = await updateProductByCodigo("b1", [], "", {
        codigo: "X",
        descripcion: "X",
        departamento: "Y",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("código original");
    });

    it("actualiza el producto y el inventario existente", async () => {
      productsQ.maybeSingle.mockResolvedValue({
        data: { id: "p1", barcode: "ABC" },
        error: null,
      });
      inventoryQ.maybeSingle.mockResolvedValue({
        data: { id: "inv1", stock: 2, has_been_stocked: true },
        error: null,
      });

      const payload = {
        codigo: "ABC",
        descripcion: "NUEVO NOMBRE",
        departamento: "Alimentos",
        costo: "20",
        precio: "40",
        use_inventory: true,
        status: "activo",
        minimo: 1,
        maximo: 5,
        sale_type: "unidad",
        unit: "pieza",
        tax: 0,
        commission_enabled: false,
        commission_type: "percent",
        commission_value: 0,
        commission_percent: 0,
        cfdi: "",
      };

      const result = await updateProductByCodigo("b1", [], "ABC", payload);

      expect(result).toEqual({
        success: true,
        data: { id: "p1" },
        error: null,
        partial: false,
      });

      expect(productsQ.update).toHaveBeenCalledWith(
        expect.objectContaining({ name: "NUEVO NOMBRE", status: true })
      );
      expect(inventoryQ.update).toHaveBeenCalledWith(
        expect.objectContaining({
          product_id: "p1",
          min_stock: 1,
          max_stock: 5,
          has_been_stocked: true,
        })
      );
    });

    it("detecta código de barras duplicado en otro producto", async () => {
      productsQ.maybeSingle
        .mockResolvedValueOnce({ data: { id: "p1", barcode: "ABC" }, error: null })
        .mockResolvedValueOnce({ data: { id: "p2" }, error: null });

      const result = await updateProductByCodigo(
        "b1",
        [],
        "ABC",
        { codigo: "XYZ", descripcion: "X", departamento: "Y" }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("código de barras");
      expect(productsQ.update).not.toHaveBeenCalled();
    });

    it("reporta producto no encontrado", async () => {
      productsQ.maybeSingle.mockResolvedValue({ data: null, error: null });

      const result = await updateProductByCodigo(
        "b1",
        [],
        "NOEXISTE",
        { codigo: "NOEXISTE", descripcion: "X", departamento: "Y" }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Producto no encontrado.");
    });
  });

  describe("deleteProductByCodigo", () => {
    it("rechaza sin código", async () => {
      const result = await deleteProductByCodigo("");

      expect(result.success).toBe(false);
      expect(result.error).toContain("código");
    });

    it("desactiva producto, inventario y descuento", async () => {
      productsQ.maybeSingle.mockResolvedValue({
        data: { id: "p1", barcode: "ABC" },
        error: null,
      });

      const result = await deleteProductByCodigo("ABC");

      expect(result).toEqual({
        success: true,
        data: { id: "p1" },
        error: null,
        partial: false,
      });
      expect(productsQ.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: false })
      );
      expect(inventoryQ.update).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: false })
      );
      expect(discountsQ.update).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false })
      );
    });

    it("reporta producto no encontrado", async () => {
      productsQ.maybeSingle.mockResolvedValue({ data: null, error: null });

      const result = await deleteProductByCodigo("NOEXISTE");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Producto no encontrado.");
      expect(productsQ.update).not.toHaveBeenCalled();
    });
  });
});
