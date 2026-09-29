import { describe, it, expect, beforeEach, vi } from "vitest";

const fromCalls = [];

const buildResult = (value) => {
  const result = { data: value, error: null };

  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => result),
    then: (resolve) => resolve(result),
  };

  return builder;
};

const buildErrorChain = (error) => {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => ({ data: null, error })),
    then: (resolve) => resolve({ data: null, error }),
  };

  return builder;
};

let results = {};
let nextResult = null;

vi.mock("../../../lib/supabaseClient", () => ({
  supabase: {
    from: (table) => {
      fromCalls.push(table);

      if (nextResult) {
        const result = nextResult;
        nextResult = null;
        return result;
      }

      return buildResult(results[table] ?? []);
    },
  },
}));

import {
  fetchCfdiUses,
  fetchFiscalCatalogs,
  fetchTaxRegimes,
  lookupPostalCode,
} from "./invoicesCatalogService";

describe("invoicesCatalogService", () => {
  beforeEach(() => {
    fromCalls.length = 0;
    results = {};
    nextResult = null;
  });

  it("consulta los usos de CFDI activos", async () => {
    results.cfdi_uses = [{ id: "G03", description: "Gastos en general" }];

    const uses = await fetchCfdiUses();

    expect(fromCalls).toEqual(["cfdi_uses"]);
    expect(uses).toEqual([{ id: "G03", description: "Gastos en general" }]);
  });

  it("devuelve arreglo vacio cuando el catalogo no trae filas", async () => {
    results.cfdi_uses = null;

    expect(await fetchCfdiUses()).toEqual([]);
  });

  it("propaga el error de la consulta sin tragarselo", async () => {
    nextResult = buildErrorChain(new Error("boom"));

    await expect(fetchCfdiUses()).rejects.toThrow("boom");
  });

  it("consulta los regimenes fiscales activos", async () => {
    results.tax_regimes = [{ id: "601", description: "Persona moral" }];

    const regimes = await fetchTaxRegimes();

    expect(fromCalls).toEqual(["tax_regimes"]);
    expect(regimes).toEqual([{ id: "601", description: "Persona moral" }]);
  });

  it("trae los dos catalogos en una sola llamada", async () => {
    results.cfdi_uses = [{ id: "G03", description: "Gastos en general" }];
    results.tax_regimes = [{ id: "601", description: "Persona moral" }];

    const catalogs = await fetchFiscalCatalogs();

    expect(fromCalls).toEqual(["cfdi_uses", "tax_regimes"]);
    expect(catalogs).toEqual({
      cfdiUses: [{ id: "G03", description: "Gastos en general" }],
      taxRegimes: [{ id: "601", description: "Persona moral" }],
    });
  });

  describe("lookupPostalCode", () => {
    it("devuelve la ficha del catalogo SEPOMEX", async () => {
      nextResult = buildResult({
        postal_code: "77500",
        municipality: "Benito Juarez",
        state: "Quintana Roo",
        city: "Cancun",
      });

      const info = await lookupPostalCode("77500");

      expect(info.municipality).toBe("Benito Juarez");
    });

    it("devuelve null cuando el C.P. no existe en el catalogo", async () => {
      nextResult = buildResult(null);

      expect(await lookupPostalCode("99999")).toBeNull();
    });

    it("no consulta la base cuando el C.P. esta incompleto", async () => {
      expect(await lookupPostalCode("775")).toBeNull();
      expect(await lookupPostalCode("")).toBeNull();
      expect(await lookupPostalCode(null)).toBeNull();
      expect(fromCalls).toEqual([]);
    });

    it("propaga el error de la consulta para que la vista lo distinga", async () => {
      nextResult = buildErrorChain(new Error("timeout"));

      await expect(lookupPostalCode("77500")).rejects.toThrow("timeout");
    });
  });
});
