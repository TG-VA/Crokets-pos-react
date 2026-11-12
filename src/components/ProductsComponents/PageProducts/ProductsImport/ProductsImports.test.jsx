import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./hooks/useProductsImport", () => ({
  useProductsImport: () => ({
    file: null,
    fileInputRef: { current: null },
    validatedRows: [],
    summary: null,
    globalErrors: [],
    processing: false,
    importing: false,
    importResult: null,
    dragOver: false,
    validRowsCount: 0,
    errorRowsCount: 0,
    setDragOver: vi.fn(),
    handleClear: vi.fn(),
    loadFile: vi.fn(),
    handleImport: vi.fn(),
    generateTemplateXLSX: vi.fn(),
  }),
}));

import ProductsImports from "./ProductsImports";
import {
  DEPARTMENT_RULES,
  MAX_FILE_NOTE,
  OPTIONAL_COLUMNS,
  REQUIRED_COLUMNS,
} from "./utils/importInstructionsConfig";

const chipTexts = (label) =>
  Array.from(
    screen.getByText(label).parentElement.querySelectorAll("li"),
    (li) => li.textContent
  );

describe("ProductsImports", () => {
  it("cablea las instrucciones con los descriptores reales", () => {
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
});
