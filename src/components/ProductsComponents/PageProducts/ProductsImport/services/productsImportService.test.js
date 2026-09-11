import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../../../../lib/supabaseClient", () => ({
  supabase: { from: vi.fn() },
}));
vi.mock("../../../../../services/satClavesService", () => ({
  validateSatClaves: vi.fn(),
}));

import { supabase } from "../../../../../lib/supabaseClient";
import { validateSatClaves } from "../../../../../services/satClavesService";
import {
  fetchValidationData,
  fetchBranchesAndDepartments,
  createMissingDepartments,
  processImportTransaction,
} from "./productsImportService";

const thenableQuery = (resolve = { data: null, error: null }) => {
  const q = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    in: vi.fn(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
    order: vi.fn(),
  };

  q.select.mockReturnValue(q);
  q.insert.mockReturnValue(q);
  q.update.mockReturnValue(q);
  q.delete.mockReturnValue(q);
  q.eq.mockReturnValue(q);
  q.neq.mockReturnValue(q);
  q.in.mockReturnValue(q);
  q.order.mockReturnValue(q);
  q.maybeSingle.mockResolvedValue({ data: null, error: null });
  q.single.mockResolvedValue({ data: null, error: null });
  q.then = (onFulfilled, onRejected) =>
    Promise.resolve(resolve).then(onFulfilled, onRejected);

  return q;
};

const validRow = (overrides = {}) => ({
  product: {
    barcode: "BC1",
    name: "Producto 1",
    cost_price: 10,
    sale_price: 25,
    tracks_inventory: true,
    is_global: false,
  },
  department_name: "Alimentos",
  inventory: { stock: 5, min_stock: 1, max_stock: 9, has_been_stocked: true },
  ...overrides,
});

describe("productsImportService", () => {
  let productsQ;
  let departmentsQ;
  let branchesQ;
  let inventoryQ;

  beforeEach(() => {
    supabase.from.mockReset();
    validateSatClaves.mockReset();
    productsQ = thenableQuery();
    departmentsQ = thenableQuery();
    branchesQ = thenableQuery();
    inventoryQ = thenableQuery();

    supabase.from.mockImplementation((table) => {
      if (table === "products") return productsQ;
      if (table === "departments") return departmentsQ;
      if (table === "branches") return branchesQ;
      if (table === "branch_inventory") return inventoryQ;
      throw new Error(`Tabla inesperada: ${table}`);
    });
  });

  describe("fetchValidationData", () => {
    it("consulta productos, departamentos y claves SAT existentes", async () => {
      productsQ.then = (ok) =>
        Promise.resolve({ data: [{ id: "p1", barcode: "BC1" }], error: null }).then(ok);
      departmentsQ.then = (ok) =>
        Promise.resolve({ data: [{ id: "d1", name: "Alimentos" }], error: null }).then(ok);
      validateSatClaves.mockResolvedValue(["SAT1"]);

      const result = await fetchValidationData(["BC1"], ["SAT1"]);

      expect(result).toEqual({
        existingProducts: [{ id: "p1", barcode: "BC1" }],
        departments: [{ id: "d1", name: "Alimentos" }],
        existingSatCodes: ["SAT1"],
      });
      expect(productsQ.in).toHaveBeenCalledWith("barcode", ["BC1"]);
      expect(validateSatClaves).toHaveBeenCalledWith(["SAT1"]);
    });

    it("omite la consulta de productos si no hay códigos", async () => {
      departmentsQ.then = (ok) =>
        Promise.resolve({ data: [], error: null }).then(ok);
      validateSatClaves.mockResolvedValue([]);

      const result = await fetchValidationData([], []);

      expect(result).toEqual({
        existingProducts: [],
        departments: [],
        existingSatCodes: [],
      });
      expect(productsQ.in).not.toHaveBeenCalled();
    });

    it("propaga errores de la consulta de productos", async () => {
      productsQ.then = (ok) =>
        Promise.resolve({ data: null, error: { message: "boom" } }).then(ok);

      await expect(fetchValidationData(["BC1"], [])).rejects.toThrow("boom");
    });
  });

  describe("fetchBranchesAndDepartments", () => {
    it("trae sucursales y departamentos", async () => {
      branchesQ.then = (ok) =>
        Promise.resolve({ data: [{ id: "b1" }], error: null }).then(ok);
      departmentsQ.then = (ok) =>
        Promise.resolve({ data: [{ id: "d1", name: "X" }], error: null }).then(ok);

      const result = await fetchBranchesAndDepartments();

      expect(result).toEqual({
        branches: [{ id: "b1" }],
        departments: [{ id: "d1", name: "X" }],
      });
    });

    it("propaga errores de la consulta de sucursales", async () => {
      branchesQ.then = (ok) =>
        Promise.resolve({ data: null, error: { message: "boom" } }).then(ok);

      await expect(fetchBranchesAndDepartments()).rejects.toThrow("boom");
    });
  });

  describe("createMissingDepartments", () => {
    it("no inserta nada si la lista está vacía", async () => {
      expect(await createMissingDepartments([])).toEqual([]);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it("inserta los departamentos faltantes y devuelve las filas creadas", async () => {
      departmentsQ.then = (ok) =>
        Promise.resolve({ data: [{ id: "d9", name: "NUPEC" }], error: null }).then(ok);

      const result = await createMissingDepartments(["NUPEC"]);

      expect(result).toEqual([{ id: "d9", name: "NUPEC" }]);
      expect(departmentsQ.insert).toHaveBeenCalledWith([{ name: "NUPEC" }]);
    });

    it("propaga errores al insertar", async () => {
      departmentsQ.then = (ok) =>
        Promise.resolve({ data: null, error: { message: "insert fail" } }).then(ok);

      await expect(createMissingDepartments(["NUPEC"])).rejects.toThrow(
        "insert fail"
      );
    });
  });

  describe("processImportTransaction", () => {
    it("no hace queries si no hay filas válidas", async () => {
      const result = await processImportTransaction([], "b1", [], {});

      expect(result).toEqual({
        createdProductsCount: 0,
        createdInventoriesCount: 0,
      });
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it("inserta productos y genera inventario para la sucursal actual", async () => {
      productsQ.then = (ok) =>
        Promise.resolve({
          data: [{ id: "p1", barcode: "BC1", is_global: false, tracks_inventory: true }],
          error: null,
        }).then(ok);
      inventoryQ.then = (ok) =>
        Promise.resolve({ data: null, error: null }).then(ok);

      const departmentMap = { alimentos: "dA" };
      const result = await processImportTransaction(
        [validRow()],
        "b1",
        [],
        departmentMap
      );

      expect(result).toEqual({ createdProductsCount: 1, createdInventoriesCount: 1 });
      expect(productsQ.insert.mock.calls[0][0][0]).toEqual(
        expect.objectContaining({ barcode: "BC1", name: "Producto 1", department_id: "dA" })
      );
      expect(inventoryQ.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          branch_id: "b1",
          product_id: "p1",
          stock: 5,
          min_stock: 1,
          max_stock: 9,
          has_been_stocked: true,
        }),
      ]);
    });

    it("crea inventario en todas las sucursales cuando el producto es global", async () => {
      productsQ.then = (ok) =>
        Promise.resolve({
          data: [{ id: "p1", barcode: "BC1", is_global: true, tracks_inventory: true }],
          error: null,
        }).then(ok);
      inventoryQ.then = (ok) =>
        Promise.resolve({ data: null, error: null }).then(ok);

      const result = await processImportTransaction(
        [validRow()],
        "b1",
        [{ id: "b1" }, { id: "b2" }],
        {}
      );

      expect(result.createdInventoriesCount).toBe(2);
      const rows = inventoryQ.insert.mock.calls[0][0];
      expect(rows).toHaveLength(2);
      expect(rows.map((row) => ({ branch: row.branch_id, stock: row.stock }))).toEqual([
        { branch: "b1", stock: 5 },
        { branch: "b2", stock: 0 },
      ]);
    });

    it("hace rollback de productos y relanza cuando falla el inventario", async () => {
      productsQ.then = (ok) =>
        Promise.resolve({
          data: [{ id: "p1", barcode: "BC1", is_global: false, tracks_inventory: true }],
          error: null,
        }).then(ok);
      inventoryQ.then = (ok) =>
        Promise.resolve({ data: null, error: { message: "inv fail" } }).then(ok);

      await expect(
        processImportTransaction([validRow()], "b1", [], {})
      ).rejects.toThrow("inv fail");
      expect(productsQ.delete).toHaveBeenCalled();
      expect(productsQ.in).toHaveBeenCalledWith("id", ["p1"]);
    });
  });
});
