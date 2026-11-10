import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("../../../../../contexts/BranchContext", () => ({
  useBranch: () => ({ branch: { id: "b1" } }),
}));
vi.mock("../../../../../contexts/ProductsContext", () => ({
  useProducts: () => ({
    refreshProducts: vi.fn(),
    refreshDepartments: vi.fn(),
  }),
}));
vi.mock("../utils/importUtils", async (importOriginal) => ({
  ...(await importOriginal()),
  readExcelFile: vi.fn(),
}));
vi.mock("../services/productsImportService", () => ({
  fetchValidationData: vi.fn(),
  fetchDepartments: vi.fn(),
  createMissingDepartments: vi.fn(),
  processImportTransaction: vi.fn(),
}));

import { readExcelFile } from "../utils/importUtils";
import { fetchValidationData } from "../services/productsImportService";
import { useProductsImport } from "./useProductsImport";

const buildRow = (overrides = {}) => ({
  Código: "BC1",
  Descripción: "CROQUETAS",
  Costo: "10",
  Precio: "20",
  "Tipo venta": "unidad",
  Unidad: "pieza",
  "Usa inventario": "sí",
  IVA: "16",
  "Es global": "no",
  Departamento: "NUPEC",
  "Stock inicial": "5",
  ...overrides,
});

const loadRows = async (rows, departments) => {
  readExcelFile.mockResolvedValue(rows);
  fetchValidationData.mockResolvedValue({
    existingProducts: [],
    departments,
    existingSatCodes: [],
  });

  const { result } = renderHook(() => useProductsImport());
  await act(() => result.current.loadFile(new File(["x"], "productos.xlsx")));
  return result.current;
};

describe("useProductsImport: estado del departamento", () => {
  beforeEach(() => vi.clearAllMocks());

  it("crea inactivo el producto de un departamento inactivo, con aviso y sin error", async () => {
    const state = await loadRows(
      [buildRow()],
      [{ id: "d1", name: "NUPEC", status: false }]
    );
    const [row] = state.validatedRows;

    expect(row.errors).toEqual([]);
    expect(row.warnings).toEqual([
      "Departamento inactivo: el producto se creará inactivo.",
    ]);
    expect(row.product.status).toBe(false);
    expect(row.inventory.is_active).toBe(false);
    expect(state.summary.inactive).toBe(1);
  });

  it("mantiene activo el producto de un departamento activo, nuevo o vacío", async () => {
    const state = await loadRows(
      [
        buildRow(),
        buildRow({ Código: "BC2", Departamento: "NUEVO" }),
        buildRow({ Código: "BC3", Departamento: "" }),
      ],
      [{ id: "d1", name: "NUPEC", status: true }]
    );

    state.validatedRows.forEach((row) => {
      expect(row.warnings).toEqual([]);
      expect(row.product.status).toBe(true);
      expect(row.inventory.is_active).toBe(true);
    });
    expect(state.summary.inactive).toBe(0);
  });
});

describe("useProductsImport: importacion sin permisos de admin", () => {
  it("muestra un mensaje claro cuando la RPC rechaza al usuario", async () => {
    const service = await import("../services/productsImportService");
    service.fetchDepartments.mockResolvedValue([
      { id: "d1", name: "NUPEC", status: true },
    ]);
    service.processImportTransaction.mockRejectedValue(
      new Error(
        "import_products_transaction: Solo un administrador puede importar productos. (SQLSTATE=P0001)"
      )
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    readExcelFile.mockResolvedValue([buildRow()]);
    fetchValidationData.mockResolvedValue({
      existingProducts: [],
      departments: [{ id: "d1", name: "NUPEC", status: true }],
      existingSatCodes: [],
    });

    const { result } = renderHook(() => useProductsImport());
    await act(() => result.current.loadFile(new File(["x"], "productos.xlsx")));
    await act(() => result.current.handleImport());

    expect(result.current.importResult).toEqual({
      success: false,
      message: "Solo un administrador puede importar productos.",
    });
  });
});
