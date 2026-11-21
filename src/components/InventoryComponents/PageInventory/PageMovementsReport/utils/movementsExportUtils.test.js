import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ExcelJS from "exceljs";

import {
  exportMovementsReport,
  normalizeFilenameSegment,
} from "./movementsExportUtils";

const ROWS = [
  {
    id: "m1",
    movement_type: "adjustment",
    quantity: 3,
    previous_stock: 1,
    new_stock: 4,
    reason: "conteo",
    created_at: "2026-02-10T15:00:00Z",
    display_product_name: "Croquetas",
    users: { username: "admin" },
  },
];

describe("movementsExportUtils", () => {
  let savedBlob;

  beforeEach(() => {
    savedBlob = null;
    URL.createObjectURL = vi.fn((blob) => {
      savedBlob = blob;
      return "blob:test";
    });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(window.HTMLAnchorElement.prototype, "click").mockImplementation(
      () => {}
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("arma el nombre del archivo con sucursal y rango", async () => {
    const result = await exportMovementsReport({
      rows: ROWS,
      branchLabel: "Jardín Norte (JN)",
      currentRange: { startKey: "2026-02-01", endKey: "2026-02-28" },
    });

    expect(result.exportedRows).toBe(1);
    expect(result.filename).toMatch(/^MOVIMIENTOS JARDIN NORTE .+ A .+\.xlsx$/);
  });

  it("genera un libro legible con una fila por movimiento", async () => {
    await exportMovementsReport({
      rows: ROWS,
      branchLabel: "Torres",
      currentRange: { startKey: "2026-02-10", endKey: "2026-02-10" },
    });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await savedBlob.arrayBuffer());
    const sheet = workbook.getWorksheet("MOVIMIENTOS");
    const values = [];
    sheet.eachRow((row) => values.push(row.values.join("|")));

    expect(values.some((line) => line.includes("CROQUETAS"))).toBe(true);
  });

  it("normalizeFilenameSegment quita acentos, parentesis y usa el respaldo", () => {
    expect(normalizeFilenameSegment("Jardín Norte (JN)")).toBe("JARDIN NORTE");
    expect(normalizeFilenameSegment("")).toBe("POLIGONO");
  });
});
