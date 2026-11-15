import { describe, it, expect } from "vitest";

import {
  getBranchFallback,
  getProductId,
  getProductPrices,
  buildTransferItems,
  validateTransferItems,
  normalizeReceivedQuantity,
  hasReceivedUnits,
} from "./transfersCalculationService";

describe("transfersCalculationService", () => {
  describe("normalizeReceivedQuantity", () => {
    it("conserva solo los digitos capturados", () => {
      expect(normalizeReceivedQuantity("1a2b", 20)).toBe("12");
    });

    it("recorta la captura al maximo solicitado", () => {
      expect(normalizeReceivedQuantity("99", 8)).toBe("8");
    });

    it("devuelve 0 cuando no hay digitos", () => {
      expect(normalizeReceivedQuantity("abc", 8)).toBe("0");
      expect(normalizeReceivedQuantity(null, 8)).toBe("0");
    });
  });

  describe("hasReceivedUnits", () => {
    it("devuelve false sin items o sin capturas", () => {
      expect(hasReceivedUnits([], {})).toBe(false);
      expect(hasReceivedUnits(undefined, undefined)).toBe(false);
    });

    it("devuelve false cuando todas las capturas estan en 0", () => {
      const items = [{ productId: "p1" }, { productId: "p2" }];
      expect(hasReceivedUnits(items, { p1: "0", p2: "0" })).toBe(false);
    });

    it("ignora capturas con texto sin digitos", () => {
      const items = [{ productId: "p1" }];
      expect(hasReceivedUnits(items, { p1: "abc" })).toBe(false);
    });

    it("devuelve true cuando al menos una captura es mayor a 0", () => {
      const items = [{ productId: "p1" }, { productId: "p2" }];
      expect(hasReceivedUnits(items, { p1: "0", p2: "3" })).toBe(true);
    });
  });

  describe("getBranchFallback", () => {
    it("devuelve arreglo vacio si no hay sucursal activa", () => {
      expect(getBranchFallback(null)).toEqual([]);
      expect(getBranchFallback({})).toEqual([]);
      expect(getBranchFallback({ name: "Sin id" })).toEqual([]);
    });

    it("devuelve la sucursal actual con nombre default si no tiene", () => {
      const result = getBranchFallback({ id: "b1", code: "CDMX" });
      expect(result).toEqual([
        { id: "b1", name: "Sucursal actual", code: "CDMX" },
      ]);
    });

    it("respeta nombre y codigo de la sucursal si vienen", () => {
      const result = getBranchFallback({
        id: "b1",
        name: "Centro",
        code: "CTR",
      });
      expect(result).toEqual([{ id: "b1", name: "Centro", code: "CTR" }]);
    });
  });

  describe("getProductId", () => {
    it("prioriza productId, luego product_id, luego id", () => {
      expect(getProductId({ productId: "a", product_id: "b", id: "c" })).toBe(
        "a"
      );
      expect(getProductId({ product_id: "b", id: "c" })).toBe("b");
      expect(getProductId({ id: "c" })).toBe("c");
    });

    it("devuelve null si no hay id", () => {
      expect(getProductId({})).toBeNull();
      expect(getProductId(null)).toBeNull();
    });
  });

  describe("getProductPrices", () => {
    it("lee costo/precio desde costo/precio o costPrice/salePrice", () => {
      expect(getProductPrices({ costo: 10, precio: 20 })).toEqual({
        costPrice: 10,
        salePrice: 20,
      });
      expect(getProductPrices({ costPrice: 15, salePrice: 25 })).toEqual({
        costPrice: 15,
        salePrice: 25,
      });
    });

    it("devuelve 0 si no hay precios", () => {
      expect(getProductPrices({})).toEqual({ costPrice: 0, salePrice: 0 });
      expect(getProductPrices(null)).toEqual({ costPrice: 0, salePrice: 0 });
    });
  });

  describe("buildTransferItems", () => {
    it("construye items con las claves esperadas y cantidades en 0", () => {
      const items = [
        {
          productId: "p1",
          barcode: "BAR-1",
          name: "Croquetas",
          quantity: 5,
          costo: 10,
          precio: 20,
        },
      ];
      const result = buildTransferItems(items);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        productId: "p1",
        barcode: "BAR-1",
        name: "Croquetas",
        requestedQty: 5,
        receivedQty: 0,
        returnedQty: 0,
        costPrice: 10,
        salePrice: 20,
      });
    });

    it("usa fallback de nombre y barcode si vienen vacios", () => {
      const result = buildTransferItems([{ productId: "p1" }]);
      expect(result[0].barcode).toBe("—");
      expect(result[0].name).toBe("PRODUCTO SIN NOMBRE");
    });

    it("acepta requestedQty como alias de quantity", () => {
      const result = buildTransferItems([{ productId: "p1", requestedQty: 8 }]);
      expect(result[0].requestedQty).toBe(8);
    });
  });

  describe("validateTransferItems", () => {
    it("filtra items sin productId o con cantidad 0", () => {
      const items = [
        { productId: "p1", quantity: 5 },
        { productId: "p2", quantity: 0 },
        { quantity: 3 },
      ];
      const result = validateTransferItems(items);
      expect(result).toHaveLength(1);
      expect(result[0].productId).toBe("p1");
    });

    it("lanza error si no quedan items validos", () => {
      expect(() => validateTransferItems([])).toThrow(
        "Agrega al menos un producto al traspaso."
      );
      expect(() => validateTransferItems([{ quantity: 0 }])).toThrow(
        "Agrega al menos un producto al traspaso."
      );
    });
  });
});
