import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("../../../../../lib/supabaseClient", () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from "../../../../../lib/supabaseClient";

import {
  DEFAULT_KARDEX_LIMIT,
  KARDEX_MOVEMENTS_TABLE,
  buildKardexIsoRange,
  loadKardexMovements,
  validateKardexDateRange,
} from "./kardexService";

const thenableQuery = (resolve = { data: null, error: null }) => {
  const q = {
    select: vi.fn(),
    eq: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
  };

  Object.values(q).forEach((fn) => fn.mockReturnValue(q));
  q.then = (onFulfilled, onRejected) =>
    Promise.resolve(resolve).then(onFulfilled, onRejected);

  return q;
};

const getLastQuery = () => supabase.from.mock.results.at(-1).value;

const getSelectedColumns = () => {
  const query = getLastQuery();

  return query.select.mock.calls[0][0];
};

const getSelectedColumnsAt = (index) =>
  supabase.from.mock.results[index].value.select.mock.calls[0][0];

/* Error de Postgres con el codigo de undefined_column. */
const buildMissingColumnCodeError = () =>
  Object.assign(new Error("undefined column"), { code: "42703" });

/* Mismo fallo descrito solo en el mensaje, sin codigo. */
const buildMissingColumnMessageError = () =>
  new Error('column "inventory_movements"."unit_cost" does not exist');

describe("kardexService", () => {
  beforeEach(() => {
    supabase.from.mockReset();
  });

  describe("constantes", () => {
    it("expone la tabla de movimientos y el limite por defecto", () => {
      expect(KARDEX_MOVEMENTS_TABLE).toBe("inventory_movements");
      expect(DEFAULT_KARDEX_LIMIT).toBe(1000);
    });
  });

  describe("buildKardexIsoRange", () => {
    it("arma el rango iso del dia completo para las fechas validas", () => {
      const range = buildKardexIsoRange({
        dateFrom: "2026-03-01",
        dateTo: "2026-03-31",
      });

      expect(range.fromIso).toBe(new Date("2026-03-01T00:00:00").toISOString());
      expect(range.toIso).toBe(
        new Date("2026-03-31T23:59:59.999").toISOString()
      );
    });

    it("omite el extremo cuando la fecha no es valida", () => {
      expect(buildKardexIsoRange({ dateFrom: "01-03-2026" })).toEqual({});
      expect(buildKardexIsoRange({ dateTo: "" })).toEqual({});
      expect(buildKardexIsoRange()).toEqual({});
    });
  });

  describe("validateKardexDateRange", () => {
    it("acepta rangos coherentes o incompletos", () => {
      expect(validateKardexDateRange({ dateFrom: "2026-03-01" }).valid).toBe(
        true
      );
      expect(
        validateKardexDateRange({
          dateFrom: "2026-03-01",
          dateTo: "2026-03-01",
        }).valid
      ).toBe(true);
    });

    it("rechaza un rango invertido", () => {
      const result = validateKardexDateRange({
        dateFrom: "2026-03-31",
        dateTo: "2026-03-01",
      });

      expect(result.valid).toBe(false);
      expect(result.message).toBe(
        "La fecha Desde no puede ser posterior a la fecha Hasta."
      );
    });
  });

  describe("loadKardexMovements", () => {
    it("selecciona unit_cost y total_cost junto al resto de columnas", async () => {
      const query = thenableQuery({ data: [], error: null });

      supabase.from.mockReturnValue(query);

      await loadKardexMovements({
        productId: "p1",
        branchId: "b1",
      });

      const columns = getSelectedColumns();

      expect(columns).toContain("unit_cost");
      expect(columns).toContain("total_cost");
      expect(columns).toContain("quantity");
      expect(columns).toContain("previous_stock");
      expect(columns).toContain("new_stock");
    });

    it("filtra por producto y sucursal, orden descendente y con limite", async () => {
      const query = thenableQuery({ data: [], error: null });

      supabase.from.mockReturnValue(query);

      await loadKardexMovements({
        productId: "p1",
        branchId: "b1",
        limit: 50,
      });

      expect(supabase.from).toHaveBeenCalledWith("inventory_movements");
      expect(query.eq.mock.calls).toEqual([
        ["product_id", "p1"],
        ["branch_id", "b1"],
      ]);
      expect(query.order).toHaveBeenCalledWith("created_at", {
        ascending: false,
        nullsFirst: false,
      });
      expect(query.limit).toHaveBeenCalledWith(50);
    });

    it("conserva los costos tal cual los entrega la base", async () => {
      const movements = [
        {
          id: "m1",
          quantity: 5,
          unit_cost: 120.5,
          total_cost: 602.5,
        },
        { id: "m2", quantity: 2, unit_cost: null, total_cost: null },
        { id: "m3", quantity: 1, unit_cost: 0, total_cost: 0 },
      ];

      supabase.from.mockReturnValue(thenableQuery({ data: movements }));

      const rows = await loadKardexMovements({
        productId: "p1",
        branchId: "b1",
      });

      expect(rows).toHaveLength(3);
      expect(rows[0].unit_cost).toBe(120.5);
      expect(rows[0].total_cost).toBe(602.5);
      expect(rows[1].unit_cost).toBeNull();
      expect(rows[2].total_cost).toBe(0);
    });

    it("aplica el filtro de rango solo con los extremos disponibles", async () => {
      const soloHasta = thenableQuery({ data: [], error: null });

      supabase.from.mockReturnValue(soloHasta);

      await loadKardexMovements({
        productId: "p1",
        branchId: "b1",
        dateTo: "2026-03-31",
      });

      expect(soloHasta.gte).not.toHaveBeenCalled();
      expect(soloHasta.lte).toHaveBeenCalledTimes(1);

      const soloDesde = thenableQuery({ data: [], error: null });

      supabase.from.mockReturnValue(soloDesde);

      await loadKardexMovements({
        productId: "p1",
        branchId: "b1",
        dateFrom: "2026-03-01",
      });

      expect(soloDesde.gte).toHaveBeenCalledTimes(1);
      expect(soloDesde.lte).not.toHaveBeenCalled();
    });

    it("no consulta sin producto y propaga el error de sucursal", async () => {
      expect(await loadKardexMovements({ branchId: "b1" })).toEqual([]);
      expect(supabase.from).not.toHaveBeenCalled();

      await expect(loadKardexMovements({ productId: "p1" })).rejects.toThrow(
        "No se pudo identificar la sucursal del kardex."
      );
    });

    it("propaga el error de rango invertido antes de consultar", async () => {
      await expect(
        loadKardexMovements({
          productId: "p1",
          branchId: "b1",
          dateFrom: "2026-03-31",
          dateTo: "2026-03-01",
        })
      ).rejects.toThrow(
        "La fecha Desde no puede ser posterior a la fecha Hasta."
      );

      expect(supabase.from).not.toHaveBeenCalled();
    });

    it("propaga el error de supabase y normaliza la respuesta", async () => {
      supabase.from.mockReturnValue(
        thenableQuery({ data: null, error: new Error("fallo de red") })
      );

      await expect(
        loadKardexMovements({ productId: "p1", branchId: "b1" })
      ).rejects.toThrow("fallo de red");

      supabase.from.mockReturnValue(thenableQuery({ data: null }));

      expect(
        await loadKardexMovements({ productId: "p1", branchId: "b1" })
      ).toEqual([]);
    });
  });

  describe("loadKardexMovements con fallback de columnas de valuacion", () => {
    let consoleErrorSpy;

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it("reintenta sin las columnas de costo cuando el error es 42703", async () => {
      supabase.from
        .mockReturnValueOnce(
          thenableQuery({ data: null, error: buildMissingColumnCodeError() })
        )
        .mockReturnValueOnce(
          thenableQuery({ data: [{ id: "m1", quantity: 5 }], error: null })
        );

      const movements = await loadKardexMovements({
        productId: "p1",
        branchId: "b1",
      });

      expect(supabase.from).toHaveBeenCalledTimes(2);

      const retryColumns = getSelectedColumnsAt(1);

      expect(retryColumns).not.toContain("unit_cost");
      expect(retryColumns).not.toContain("total_cost");
      expect(retryColumns).toContain("quantity");
      expect(retryColumns).toContain("previous_stock");
      expect(retryColumns).toContain("created_at");

      expect(movements).toEqual([
        { id: "m1", quantity: 5, unit_cost: null, total_cost: null },
      ]);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it("reintenta cuando el mensaje reporta la columna inexistente", async () => {
      supabase.from
        .mockReturnValueOnce(
          thenableQuery({ data: null, error: buildMissingColumnMessageError() })
        )
        .mockReturnValueOnce(
          thenableQuery({ data: [{ id: "m1", reason: "LOTE 1" }], error: null })
        );

      const movements = await loadKardexMovements({
        productId: "p1",
        branchId: "b1",
      });

      expect(supabase.from).toHaveBeenCalledTimes(2);
      expect(movements).toEqual([
        { id: "m1", reason: "LOTE 1", unit_cost: null, total_cost: null },
      ]);
    });

    it("no reintenta ante un error ajeno y lo propaga", async () => {
      supabase.from.mockReturnValue(
        thenableQuery({ data: null, error: new Error("fallo de red") })
      );

      await expect(
        loadKardexMovements({ productId: "p1", branchId: "b1" })
      ).rejects.toThrow("fallo de red");

      expect(supabase.from).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("propaga el error del reintento en vez de degradar en silencio", async () => {
      supabase.from
        .mockReturnValueOnce(
          thenableQuery({ data: null, error: buildMissingColumnCodeError() })
        )
        .mockReturnValueOnce(
          thenableQuery({ data: null, error: new Error("permiso denegado") })
        );

      await expect(
        loadKardexMovements({ productId: "p1", branchId: "b1" })
      ).rejects.toThrow("permiso denegado");

      expect(supabase.from).toHaveBeenCalledTimes(2);
    });

    it("no reintenta cuando la primera consulta es exitosa", async () => {
      supabase.from.mockReturnValue(
        thenableQuery({
          data: [{ id: "m1", unit_cost: 80, total_cost: 240 }],
          error: null,
        })
      );

      const movements = await loadKardexMovements({
        productId: "p1",
        branchId: "b1",
      });

      expect(supabase.from).toHaveBeenCalledTimes(1);
      expect(movements[0].unit_cost).toBe(80);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });
});
