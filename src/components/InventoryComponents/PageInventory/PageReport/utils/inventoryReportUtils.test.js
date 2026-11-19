import { describe, expect, it } from "vitest";

import {
  filterInventoryRows,
  getStockStatus,
  getStockStatusCounts,
  getStockSummary,
  INITIAL_FACET_FILTERS,
  normalizeFilenameSegment,
  sortInventoryRows,
  STOCK_FILTER_PREFIX,
} from "./inventoryReportUtils";

const withRecord = {
  productId: "a",
  nombre: "ALFA",
  existencia: 0,
  min: 2,
  max: 10,
  tracksInventory: true,
  noBranchRecord: false,
};
const lowStock = {
  productId: "b",
  nombre: "BETA",
  existencia: 1,
  min: 2,
  max: 10,
  tracksInventory: true,
  noBranchRecord: false,
};
const noRecord = {
  productId: "c",
  nombre: "AAA SIN FILA",
  existencia: null,
  min: null,
  max: null,
  tracksInventory: true,
  noBranchRecord: true,
};
const untracked = {
  productId: "d",
  nombre: "AAA SERVICIO",
  existencia: null,
  min: null,
  max: null,
  tracksInventory: false,
  noBranchRecord: false,
};
const rows = [withRecord, lowStock, noRecord, untracked];

describe("normalizeFilenameSegment", () => {
  it("usa un valor neutro cuando no hay nombre de sucursal", () => {
    expect(normalizeFilenameSegment("")).toBe("SUCURSAL");
    expect(normalizeFilenameSegment(null)).toBe("SUCURSAL");
  });

  it("normaliza acentos, codigo entre parentesis y simbolos", () => {
    expect(normalizeFilenameSegment("Jardín Norte (JN)")).toBe("JARDIN NORTE");
  });
});

describe("estado Sin registro en sucursal", () => {
  it("tiene estado propio", () => {
    expect(getStockStatus(noRecord)).toEqual({
      type: "noBranchRecord",
      label: "Sin registro en sucursal",
    });
    expect(getStockStatus(untracked).type).toBe("notApplicable");
  });

  it("no cuenta como agotado ni como stock bajo", () => {
    expect(getStockSummary(rows)).toEqual({ outOfStock: 1, lowStock: 1 });
  });

  it("tiene conteo propio en la faceta de existencia", () => {
    expect(getStockStatusCounts(rows)).toEqual({
      outOfStock: 1,
      lowStock: 1,
      available: 0,
      notApplicable: 1,
      noBranchRecord: 1,
    });
  });

  it("se filtra con su opcion de estado y no con la de cantidad 0", () => {
    const byStatus = filterInventoryRows({
      rows,
      facetFilters: {
        ...INITIAL_FACET_FILTERS,
        existencia: [`${STOCK_FILTER_PREFIX}noBranchRecord`],
      },
    });
    const byZero = filterInventoryRows({
      rows,
      facetFilters: { ...INITIAL_FACET_FILTERS, existencia: ["quantity:0"] },
    });

    expect(byStatus.map((row) => row.productId)).toEqual(["c"]);
    expect(byZero.map((row) => row.productId)).toEqual(["a"]);
  });

  it("se ordena despues de los registrados y antes de los no controlados", () => {
    expect(sortInventoryRows(rows).map((row) => row.productId)).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });
});
