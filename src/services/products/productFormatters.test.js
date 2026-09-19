import { describe, it, expect } from "vitest";
import {
  buildDepartmentMap,
  buildInventoryProductIds,
  formatBranchKardexProducts,
  formatGlobalProductsWithoutInventory,
} from "./productFormatters";

describe("buildDepartmentMap", () => {
  it("mapea cada departamento por su id", () => {
    const map = buildDepartmentMap([
      { id: "dept-1", name: "Alimentos" },
      { id: "dept-2", name: "Accesorios" },
    ]);

    expect(map.get("dept-1")).toBe("Alimentos");
    expect(map.get("dept-2")).toBe("Accesorios");
  });

  it("devuelve un Map vacío si no recibe departamentos", () => {
    expect(buildDepartmentMap(null).size).toBe(0);
    expect(buildDepartmentMap([]).size).toBe(0);
  });
});

describe("buildInventoryProductIds", () => {
  it("incluye solo productos activos", () => {
    const ids = buildInventoryProductIds([
      { product_id: "p1", products: { status: true } },
      { product_id: "p2", products: { status: false } },
      { product_id: "p3", products: null },
    ]);

    expect(ids.has("p1")).toBe(true);
    expect(ids.has("p2")).toBe(false);
    expect(ids.has("p3")).toBe(false);
  });

  it("devuelve un Set vacío si no recibe inventario", () => {
    expect(buildInventoryProductIds(null).size).toBe(0);
  });
});

describe("formatBranchKardexProducts", () => {
  const departmentsMap = new Map([["dept-1", "Alimentos"]]);

  const inventoryRow = {
    id: "inv-1",
    branch_id: "branch-1",
    product_id: "p1",
    stock: 12,
    min_stock: 2,
    max_stock: 50,
    is_active: true,
    has_been_stocked: true,
    cost_price: 10,
    sale_price: 25,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-02T00:00:00.000Z",
    products: {
      id: "p1",
      barcode: "750123",
      name: "croqueta premium",
      department_id: "dept-1",
      status: true,
      is_global: true,
      sale_type: "unidad",
      unit: "kg",
      tax: 16,
      cost_price: 9,
      sale_price: 24,
      profit: 15,
      commission_enabled: true,
      commission_percent: 5,
      commission_type: "percent",
      commission_value: 5,
      clave_sat: "01010101",
      tracks_inventory: true,
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-01T00:00:00.000Z",
    },
  };

  it("formatea cada fila de inventario de sucursal", () => {
    const result = formatBranchKardexProducts([inventoryRow], departmentsMap);

    expect(result).toHaveLength(1);

    const product = result[0];
    expect(product).toEqual({
      id: "p1",
      inventory_id: "inv-1",
      product_id: "p1",
      branch_id: "branch-1",
      codigo: "750123",
      descripcion: "CROQUETA PREMIUM",
      departamento: "Alimentos",
      costo: 10,
      precio: 25,
      ganancia: 15,
      existencia: 12,
      minimo: 2,
      maximo: 50,
      status: true,
      is_active: true,
      is_kardex_inactive: false,
      has_been_stocked: true,
      is_global: true,
      sale_type: "unidad",
      unit: "kg",
      tax: 16,
      commission_enabled: true,
      commission_percent: 5,
      commission_type: "percent",
      commission_value: 5,
      cfdi: "01010101",
      tracks_inventory: true,
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-02T00:00:00.000Z",
      use_inventory: true,
    });
  });

  it("ignora filas sin producto relacionado", () => {
    const result = formatBranchKardexProducts(
      [{ ...inventoryRow, products: null }],
      departmentsMap
    );

    expect(result).toHaveLength(0);
  });

  it("marca productos inactivos como inactivos en kardex", () => {
    const inactive = {
      ...inventoryRow,
      products: { ...inventoryRow.products, status: false },
    };
    const result = formatBranchKardexProducts([inactive], departmentsMap);

    expect(result[0].status).toBe(false);
    expect(result[0].is_kardex_inactive).toBe(true);
  });

  it("usa precios del producto como fallback cuando el inventario no los trae", () => {
    const noOverlays = {
      ...inventoryRow,
      cost_price: null,
      sale_price: null,
    };
    const result = formatBranchKardexProducts([noOverlays], departmentsMap);

    expect(result[0].costo).toBe(9);
    expect(result[0].precio).toBe(24);
  });

  it("asigna departamento por defecto cuando no existe el id", () => {
    const noDept = { ...inventoryRow, products: { ...inventoryRow.products, department_id: "dept-x" } };
    const result = formatBranchKardexProducts([noDept], departmentsMap);

    expect(result[0].departamento).toBe("Sin departamento");
  });

  it("devuelve un arreglo vacío si no recibe inventario", () => {
    expect(formatBranchKardexProducts(null, departmentsMap)).toEqual([]);
  });
});

describe("formatGlobalProductsWithoutInventory", () => {
  const departmentsMap = new Map([["dept-1", "Alimentos"]]);
  const inventoryProductIds = new Set(["p1"]);

  const globalProduct = {
    id: "p2",
    barcode: "750999",
    name: "premio natural",
    department_id: "dept-1",
    status: true,
    is_global: true,
    sale_type: "unidad",
    unit: "pieza",
    tax: 0,
    cost_price: 5,
    sale_price: 12,
    profit: 7,
    commission_enabled: false,
    commission_percent: 0,
    commission_type: "percent",
    commission_value: 0,
    clave_sat: null,
    tracks_inventory: false,
    created_at: "2024-02-01T00:00:00.000Z",
    updated_at: null,
  };

  it("omite productos que ya tienen inventario en la sucursal", () => {
    const inInventory = { ...globalProduct, id: "p1" };
    const result = formatGlobalProductsWithoutInventory(
      [inInventory, globalProduct],
      inventoryProductIds,
      departmentsMap,
      "branch-1"
    );

    expect(result.map((p) => p.id)).toEqual(["p2"]);
  });

  it("formatea productos globales sin inventario", () => {
    const [product] = formatGlobalProductsWithoutInventory(
      [globalProduct],
      inventoryProductIds,
      departmentsMap,
      "branch-1"
    );

    expect(product).toEqual({
      id: "p2",
      inventory_id: null,
      product_id: "p2",
      branch_id: "branch-1",
      codigo: "750999",
      descripcion: "PREMIO NATURAL",
      departamento: "Alimentos",
      costo: 5,
      precio: 12,
      ganancia: 7,
      existencia: 0,
      minimo: 0,
      maximo: 0,
      status: true,
      is_active: false,
      has_been_stocked: false,
      is_global: true,
      sale_type: "unidad",
      unit: "pieza",
      tax: 0,
      commission_enabled: false,
      commission_percent: 0,
      commission_type: "percent",
      commission_value: 0,
      cfdi: "",
      tracks_inventory: false,
      created_at: "2024-02-01T00:00:00.000Z",
      updated_at: null,
      use_inventory: false,
    });
  });

  it("devuelve un arreglo vacío si no recibe productos globales", () => {
    expect(formatGlobalProductsWithoutInventory(null, inventoryProductIds, departmentsMap, "branch-1")).toEqual([]);
  });
});
