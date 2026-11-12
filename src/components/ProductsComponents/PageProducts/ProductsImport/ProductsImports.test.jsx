import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ProductsImports from "./ProductsImports";
import { useProductsImport } from "./hooks/useProductsImport";
import { useAdminStatus } from "../../../../hooks/useIsAdmin";
import {
  DEPARTMENT_RULES,
  MAX_FILE_NOTE,
  OPTIONAL_COLUMNS,
  REQUIRED_COLUMNS,
} from "./utils/importInstructionsConfig";

vi.mock("./hooks/useProductsImport", () => ({
  useProductsImport: vi.fn(),
}));

vi.mock("../../../../hooks/useIsAdmin", () => ({
  useAdminStatus: vi.fn(),
}));

const buildRow = (overrides = {}) => ({
  rowNumber: 2,
  product: {
    barcode: "BC1",
    name: "Croqueta",
    cost_price: 10,
    sale_price: 20,
    sale_type: "unidad",
    unit: "pieza",
    tracks_inventory: true,
    tax: 16,
    is_global: false,
    department_id: "d1",
    status: false,
  },
  inventory: { stock: 5 },
  errors: [],
  warnings: [],
  ...overrides,
});

const mockHook = ({
  file = { name: "productos.xlsx", size: 2048 },
  rows,
  summary,
}) => {
  useProductsImport.mockReturnValue({
    file,
    fileInputRef: { current: null },
    validatedRows: rows,
    summary,
    globalErrors: [],
    processing: false,
    importing: false,
    importResult: null,
    dragOver: false,
    validRowsCount: rows.length,
    errorRowsCount: 0,
    setDragOver: vi.fn(),
    handleClear: vi.fn(),
    loadFile: vi.fn(),
    handleImport: vi.fn(),
    generateTemplateXLSX: vi.fn(),
  });
};

const chipTexts = (label) =>
  Array.from(
    screen.getByText(label).parentElement.querySelectorAll("li"),
    (li) => li.textContent
  );

const AVISO = "Departamento inactivo: el producto se creará inactivo.";

describe("ProductsImports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAdminStatus.mockReturnValue({ isAdmin: true, loading: false });
  });

  it("oculta la importacion a quien no es administrador", () => {
    useAdminStatus.mockReturnValue({ isAdmin: false, loading: false });
    mockHook({ file: null, rows: [], summary: null });

    render(<ProductsImports />);

    expect(
      screen.getByText("Solo un administrador puede importar productos.")
    ).toBeTruthy();
    expect(screen.queryByText("Importar Base de Datos")).toBeNull();
    expect(screen.queryByText("Descargar Plantilla")).toBeNull();
  });

  it("mientras carga el rol no muestra el rechazo ni la carga", () => {
    useAdminStatus.mockReturnValue({ isAdmin: false, loading: true });
    mockHook({ file: null, rows: [], summary: null });

    render(<ProductsImports />);

    expect(screen.getByText("Importar Productos")).toBeTruthy();
    expect(
      screen.queryByText("Solo un administrador puede importar productos.")
    ).toBeNull();
    expect(screen.queryByText("Descargar Plantilla")).toBeNull();
  });

  it("cablea las instrucciones con los descriptores reales", () => {
    mockHook({ file: null, rows: [], summary: null });

    const { container } = render(<ProductsImports />);

    expect(screen.getByText("Instrucciones importantes")).toBeTruthy();
    expect(screen.getByText(MAX_FILE_NOTE)).toBeTruthy();
    expect(container.querySelectorAll("tbody tr")).toHaveLength(5);
    expect(chipTexts("Obligatorias")).toEqual(REQUIRED_COLUMNS);
    expect(chipTexts("Opcionales")).toEqual(OPTIONAL_COLUMNS);
    DEPARTMENT_RULES.forEach((rule) =>
      expect(screen.getByText(rule)).toBeTruthy()
    );
  });

  it("muestra el aviso de la fila en lugar de OK", () => {
    mockHook({
      rows: [buildRow({ warnings: [AVISO] })],
      summary: { total: 1, valid: 1, errors: 0, inactive: 1 },
    });

    render(<ProductsImports />);

    expect(screen.getByText(AVISO)).toBeTruthy();
    expect(screen.queryByText("OK")).toBeNull();
  });

  it("muestra OK cuando la fila no tiene errores ni avisos", () => {
    mockHook({
      rows: [buildRow()],
      summary: { total: 1, valid: 1, errors: 0, inactive: 0 },
    });

    render(<ProductsImports />);

    expect(screen.getByText("OK")).toBeTruthy();
  });

  it("muestra el conteo de productos que se crearán inactivos", () => {
    mockHook({
      rows: [buildRow({ warnings: [AVISO] })],
      summary: { total: 3, valid: 3, errors: 0, inactive: 2 },
    });

    render(<ProductsImports />);

    const card = screen.getByText("Se crearán inactivos").parentElement;
    expect(within(card).getByText("2")).toBeTruthy();
  });
});
