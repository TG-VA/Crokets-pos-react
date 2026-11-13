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
vi.mock("../../../../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));
vi.mock("../../../../../lib/permissionsService", () => ({
  checkUserIsAdmin: vi.fn(),
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

import {
  MAX_FILE_SIZE_MB,
  MAX_FILE_SIZE_MESSAGE,
  readExcelFile,
} from "../utils/importUtils";
import {
  fetchValidationData,
  createMissingDepartments,
  processImportTransaction,
} from "../services/productsImportService";
import { checkUserIsAdmin } from "../../../../../lib/permissionsService";
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

  it("no cuenta como inactiva una fila de departamento inactivo que tiene errores", async () => {
    const state = await loadRows(
      [buildRow(), buildRow({ Código: "BC2", Precio: "-1" })],
      [{ id: "d1", name: "NUPEC", status: false }]
    );

    expect(state.validatedRows[1].errors.length).toBeGreaterThan(0);
    expect(state.summary.inactive).toBe(1);
  });

  it("marca como duplicadas dos filas con el mismo código", async () => {
    const state = await loadRows(
      [buildRow(), buildRow()],
      [{ id: "d1", name: "NUPEC", status: true }]
    );

    state.validatedRows.forEach((row) => {
      expect(row.errors).toContain("Código duplicado dentro del archivo.");
    });
  });
});

const fileOfSize = (bytes) => ({ name: "productos.xlsx", size: bytes });
const LIMIT_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

describe("useProductsImport: limite de tamano", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readExcelFile.mockResolvedValue([]);
  });

  it("rechaza un archivo un byte mayor al limite con el mensaje compartido", async () => {
    const { result } = renderHook(() => useProductsImport());

    await act(() => result.current.loadFile(fileOfSize(LIMIT_BYTES + 1)));

    expect(result.current.globalErrors).toEqual([MAX_FILE_SIZE_MESSAGE]);
    expect(result.current.file).toBeNull();
    expect(readExcelFile).not.toHaveBeenCalled();
  });

  it("acepta un archivo exactamente en el limite", async () => {
    const { result } = renderHook(() => useProductsImport());
    const file = fileOfSize(LIMIT_BYTES);

    await act(() => result.current.loadFile(file));

    expect(result.current.globalErrors).not.toContain(MAX_FILE_SIZE_MESSAGE);
    expect(result.current.file).toBe(file);
    expect(readExcelFile).toHaveBeenCalledWith(file);
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
    checkUserIsAdmin.mockResolvedValue(true);

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

  it("no crea departamentos ni llama a la RPC si el usuario no es admin", async () => {
    const service = await import("../services/productsImportService");
    service.fetchDepartments.mockResolvedValue([]);
    createMissingDepartments.mockClear();
    processImportTransaction.mockClear();
    checkUserIsAdmin.mockResolvedValue(false);

    readExcelFile.mockResolvedValue([buildRow({ Departamento: "ACCESORIOS" })]);
    fetchValidationData.mockResolvedValue({
      existingProducts: [],
      departments: [],
      existingSatCodes: [],
    });

    const { result } = renderHook(() => useProductsImport());
    await act(() => result.current.loadFile(new File(["x"], "productos.xlsx")));
    await act(() => result.current.handleImport());

    expect(checkUserIsAdmin).toHaveBeenCalledWith("u1");
    expect(createMissingDepartments).not.toHaveBeenCalled();
    expect(processImportTransaction).not.toHaveBeenCalled();
    expect(result.current.importResult).toEqual({
      success: false,
      message: "Solo un administrador puede importar productos.",
    });
  });
});
