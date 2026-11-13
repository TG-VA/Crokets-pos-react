import { describe, it, expect } from "vitest";
import {
  buildHeaderMap,
  getMissingColumns,
  collectLookupKeys,
  buildValidatedRows,
  buildImportSummary,
} from "./productsImportCalculationService";

const baseRow = {
  Código: "750001",
  Descripción: "Croqueta",
  Costo: "100",
  Precio: "150",
  "Tipo venta": "unidad",
  Unidad: "pieza",
  "Usa inventario": "Sí",
  IVA: "16",
  "Es global": "No",
  Departamento: "  nupec   adulto ",
  "Stock inicial": "5",
  "Stock mínimo": "1",
  "Stock máximo": "10",
  "Clave SAT": "10121800",
};

const emptyData = {
  existingProducts: [],
  departments: [],
  existingSatCodes: [{ clave: "10121800" }],
};

const validate = (rows, data = emptyData) =>
  buildValidatedRows(rows, buildHeaderMap(rows), data);

describe("productsImportCalculationService", () => {
  describe("buildHeaderMap / getMissingColumns", () => {
    it("mapea encabezados normalizados a la llave original", () => {
      const map = buildHeaderMap([{ "  CÓDIGO ": 1 }]);
      expect(map["codigo"]).toBe("  CÓDIGO ");
    });

    it("sin filas devuelve mapa vacío y todas las columnas faltan", () => {
      const map = buildHeaderMap([]);
      expect(map).toEqual({});
      expect(getMissingColumns(map).length).toBeGreaterThan(0);
    });

    it("no reporta faltantes con la fila completa", () => {
      expect(getMissingColumns(buildHeaderMap([baseRow]))).toEqual([]);
    });
  });

  describe("collectLookupKeys", () => {
    it("recorta códigos y deduplica claves SAT", () => {
      const rows = [
        { ...baseRow, Código: " 1 " },
        { ...baseRow, Código: "" },
        { ...baseRow, Código: "2" },
      ];
      expect(collectLookupKeys(rows, buildHeaderMap(rows))).toEqual({
        barcodes: ["1", "2"],
        satCodes: ["10121800"],
      });
    });
  });

  describe("buildValidatedRows", () => {
    it("construye una fila válida con departamento por crear", () => {
      const [row] = validate([baseRow]);
      expect(row.errors).toEqual([]);
      expect(row.rowNumber).toBe(2);
      expect(row.department_name).toBe("NUPEC ADULTO");
      expect(row.department_needs_create).toBe(true);
      expect(row.product.status).toBe(true);
      expect(row.inventory).toEqual({
        stock: 5,
        min_stock: 1,
        max_stock: 10,
        is_active: true,
        has_been_stocked: true,
      });
    });

    it("marca duplicados en archivo y códigos existentes", () => {
      const rows = validate([baseRow, baseRow], {
        ...emptyData,
        existingProducts: [{ barcode: 750001 }],
      });
      expect(rows[0].errors).toContain("Código duplicado dentro del archivo.");
      expect(rows[0].errors).toContain("Código ya existe en productos.");
    });

    it("usa los códigos ya recolectados para detectar duplicados", () => {
      const rows = [baseRow, { ...baseRow, Código: "750002" }];
      const [first, second] = buildValidatedRows(
        rows,
        buildHeaderMap(rows),
        emptyData,
        ["750001", "750001"]
      );
      expect(first.errors).toContain("Código duplicado dentro del archivo.");
      expect(second.errors).not.toContain(
        "Código duplicado dentro del archivo."
      );
    });

    it("departamento inactivo crea producto e inventario inactivos con aviso", () => {
      const [row] = validate([baseRow], {
        ...emptyData,
        departments: [{ id: "d1", name: "NUPEC ADULTO", status: false }],
      });
      expect(row.errors).toEqual([]);
      expect(row.product.department_id).toBe("d1");
      expect(row.product.status).toBe(false);
      expect(row.inventory.is_active).toBe(false);
      expect(row.warnings).toEqual([
        "Departamento inactivo: el producto se creará inactivo.",
      ]);
    });

    it("sin inventario fuerza stocks a cero", () => {
      const [row] = validate([{ ...baseRow, "Usa inventario": "No" }]);
      expect(row.inventory.stock).toBe(0);
      expect(row.inventory.has_been_stocked).toBe(false);
    });

    it("con inventario y stock inicial 0 no marca el producto como surtido", () => {
      const [row] = validate([{ ...baseRow, "Stock inicial": "0" }]);
      expect(row.inventory.has_been_stocked).toBe(false);
    });

    it("rechaza stock mínimo mayor al máximo y clave SAT desconocida", () => {
      const [row] = validate([
        { ...baseRow, "Stock mínimo": "20", "Clave SAT": "999" },
      ]);
      expect(row.errors).toContain(
        "Stock mínimo no puede ser mayor al máximo."
      );
      expect(row.errors).toContain("Clave SAT no encontrada: 999.");
    });

    it.each([
      ["costo negativo", { Costo: "-1" }, "Costo inválido."],
      ["IVA fuera de catálogo", { IVA: "5" }, "IVA debe ser 0, 8 o 16."],
      [
        "Es global no booleano",
        { "Es global": "tal vez" },
        "Es global debe ser Sí/No, true/false o 1/0.",
      ],
      [
        "stock inicial negativo",
        { "Stock inicial": "-1" },
        "Stock inicial no puede ser negativo.",
      ],
      [
        "stock mínimo negativo",
        { "Stock mínimo": "-1" },
        "Stock mínimo no puede ser negativo.",
      ],
      [
        "stock máximo negativo",
        { "Stock máximo": "-1" },
        "Stock máximo no puede ser negativo.",
      ],
    ])("rechaza %s", (_label, overrides, message) => {
      const [row] = validate([{ ...baseRow, ...overrides }]);
      expect(row.errors).toContain(message);
    });

    it("stock máximo 0 significa sin máximo y no limita el mínimo", () => {
      const [row] = validate([
        { ...baseRow, "Stock mínimo": "5", "Stock máximo": "0" },
      ]);
      expect(row.errors).toEqual([]);
    });
  });

  describe("buildImportSummary", () => {
    it("cuenta inactivos y departamentos por crear solo en filas válidas", () => {
      const rows = validate(
        [
          baseRow,
          { ...baseRow, Código: "2", Departamento: "Otro" },
          { ...baseRow, Código: "3", Departamento: "Inactivo" },
          { ...baseRow, Código: "", Departamento: "Solo con error" },
        ],
        {
          ...emptyData,
          departments: [{ id: "d9", name: "Inactivo", status: false }],
        }
      );
      expect(buildImportSummary(rows)).toEqual({
        total: 4,
        valid: 3,
        errors: 1,
        inactive: 1,
        departmentsToCreate: 2,
      });
    });
  });
});
