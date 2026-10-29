import { describe, it, expect } from "vitest";

import {
  SALES_MODAL_FLAGS,
  getSalesModalLayerIds,
} from "./salesModalLayersService";

describe("getSalesModalLayerIds", () => {
  it("no devuelve capas cuando no hay modales abiertos", () => {
    expect(getSalesModalLayerIds({})).toEqual([]);
  });

  it.each(SALES_MODAL_FLAGS)(
    "registra una capa cuando %s esta activa",
    (flag) => {
      const layers = getSalesModalLayerIds({ [flag]: true });

      expect(layers).toHaveLength(1);
    }
  );

  it("asigna un identificador distinto a cada modal", () => {
    const all = Object.fromEntries(
      SALES_MODAL_FLAGS.map((flag) => [flag, true])
    );

    const layers = getSalesModalLayerIds(all);

    expect(new Set(layers).size).toBe(SALES_MODAL_FLAGS.length);
  });

  it("trata un objeto de venta exitosa como modal abierto", () => {
    expect(getSalesModalLayerIds({ saleSuccessData: { id: "s1" } })).toEqual([
      "sales-success",
    ]);
  });
});
