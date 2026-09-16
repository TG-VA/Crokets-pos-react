import { describe, it, expect } from "vitest";

import {
  getCustomerName,
  getCustomerPhone,
  getEarnedPoints,
  getPartialReturnPointsFromMovements,
  getPartialReturnPointsFromReturns,
  getReturnedPoints,
  getCustomerPointsBalance,
} from "./ticketPointsService";

describe("ticketPointsService", () => {
  describe("getCustomerName", () => {
    it("resuelve el nombre en mayusculas", () => {
      expect(getCustomerName({ customer_name: "tristan" })).toBe("TRISTAN");
      expect(getCustomerName({ customerName: "ana" })).toBe("ANA");
      expect(getCustomerName({ customer: { name: "luz" } })).toBe("LUZ");
      expect(getCustomerName({ customer: { full_name: "luis" } })).toBe("LUIS");
      expect(getCustomerName({})).toBe("");
    });
  });

  describe("getCustomerPhone", () => {
    it("resuelve el telefono normalizando espacios", () => {
      expect(getCustomerPhone({ customer_phone: "998  123 4567" })).toBe(
        "998 123 4567"
      );
      expect(getCustomerPhone({ customer: { phone: "9981112233" } })).toBe(
        "9981112233"
      );
      expect(getCustomerPhone({})).toBe("");
    });
  });

  describe("getEarnedPoints", () => {
    it("lee los puntos ganados", () => {
      expect(getEarnedPoints({ points_earned: 120 })).toBe(120);
      expect(getEarnedPoints({ customer_points_earned: 121 })).toBe(121);
      expect(getEarnedPoints({ earned_points: "122" })).toBe(122);
      expect(getEarnedPoints({ pointsEarned: 123 })).toBe(123);
      expect(getEarnedPoints({})).toBe(0);
    });
  });

  describe("getPartialReturnPointsFromMovements", () => {
    it("suma movimientos parciales retornados de la venta", () => {
      const sale = {
        id: "v-1",
        customer_points_movements: [
          { source: "partial_return", points: -30, related_sale_id: "v-1" },
          { source: "earn", points: 100, related_sale_id: "v-1" },
          { source: "partial_return", points: -20, related_sale_id: "v-2" },
        ],
      };

      expect(getPartialReturnPointsFromMovements(sale)).toBe(30);
    });
  });

  describe("getPartialReturnPointsFromReturns", () => {
    it("suma puntos devueltos de la lista de returns", () => {
      const sale = {
        partial_returns: [
          { points_returned: 15 },
          { returnedPoints: 25 },
          { customer_points_returned: 10 },
        ],
      };

      expect(getPartialReturnPointsFromReturns(sale)).toBe(50);
      expect(getPartialReturnPointsFromReturns({})).toBe(0);
    });
  });

  describe("getReturnedPoints", () => {
    it("prioriza el valor directo sobre movimientos y returns", () => {
      expect(getReturnedPoints({ points_returned: 40 })).toBe(40);
      expect(
        getReturnedPoints({
          customer_points_movements: [
            { source: "partial_return", points: -50 },
          ],
        })
      ).toBe(50);
      expect(
        getReturnedPoints({ partial_returns: [{ points_returned: 12 }] })
      ).toBe(12);
      expect(getReturnedPoints({})).toBe(0);
    });
  });

  describe("getCustomerPointsBalance", () => {
    it("devuelve el saldo o null cuando no existe", () => {
      expect(getCustomerPointsBalance({ customer_points_balance: 800 })).toBe(800);
      expect(getCustomerPointsBalance({ points_balance: "810" })).toBe(810);
      expect(getCustomerPointsBalance({ customer: { points: 900 } })).toBe(900);
      expect(getCustomerPointsBalance({ points_balance: "" })).toBeNull();
      expect(getCustomerPointsBalance({})).toBeNull();
    });
  });
});
