import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../../contexts/BranchContext", () => ({
  useBranch: () => ({ branch: { id: 1 } }),
}));
vi.mock("../../../../../contexts/ProductsContext", () => ({
  useProducts: () => ({
    refreshProducts: vi.fn(),
    refreshDepartments: vi.fn(),
  }),
}));
vi.mock("../services/productsImportService", () => ({
  fetchValidationData: vi.fn(),
  fetchBranchesAndDepartments: vi.fn(),
  createMissingDepartments: vi.fn(),
  processImportTransaction: vi.fn(),
}));
vi.mock("../utils/importUtils", async (importOriginal) => ({
  ...(await importOriginal()),
  readExcelFile: vi.fn(),
}));

import { useProductsImport } from "./useProductsImport";
import {
  MAX_FILE_SIZE_MB,
  MAX_FILE_SIZE_MESSAGE,
  readExcelFile,
} from "../utils/importUtils";

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
