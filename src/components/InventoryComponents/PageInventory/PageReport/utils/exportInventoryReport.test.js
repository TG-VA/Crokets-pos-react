import { describe, expect, it } from "vitest";

import { buildInventoryExportRowValues } from "./exportInventoryReport";

describe("buildInventoryExportRowValues", () => {
  it("exporta el estado y deja vacios los valores del producto sin fila", () => {
    expect(
      buildInventoryExportRowValues({
        codigo: "c1",
        nombre: "Croqueta",
        depto: "Alimento",
        existencia: null,
        min: null,
        max: null,
        tracksInventory: true,
        noBranchRecord: true,
      })
    ).toEqual([
      "C1",
      "CROQUETA",
      "ALIMENTO",
      "—",
      "—",
      "—",
      "Sin registro en sucursal",
    ]);
  });

  it("exporta existencia y estado del producto con fila", () => {
    expect(
      buildInventoryExportRowValues({
        codigo: "c2",
        nombre: "Arena",
        depto: "Higiene",
        existencia: 0,
        min: 2,
        max: 9,
        tracksInventory: true,
        noBranchRecord: false,
      })
    ).toEqual(["C2", "ARENA", "HIGIENE", "0", "2", "9", "Agotado"]);
  });

  it("exporta No aplica para el producto sin control de inventario", () => {
    expect(
      buildInventoryExportRowValues({
        codigo: "s1",
        nombre: "Baño",
        depto: "",
        existencia: null,
        min: null,
        max: null,
        tracksInventory: false,
      })
    ).toEqual(["S1", "BAÑO", "—", "—", "—", "—", "No aplica"]);
  });
});
