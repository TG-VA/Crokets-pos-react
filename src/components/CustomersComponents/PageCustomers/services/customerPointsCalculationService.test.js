import { describe, it, expect } from "vitest";

import { calculatePointsBalance } from "./customerPointsCalculationService";

describe("customerPointsCalculationService", () => {
  describe("calculatePointsBalance", () => {
    it("devuelve 0 cuando no hay movimientos", () => {
      expect(calculatePointsBalance([])).toBe(0);
      expect(calculatePointsBalance()).toBe(0);
    });

    it("suma los movimientos con signo", () => {
      expect(calculatePointsBalance([{ points: 120 }, { points: -40 }])).toBe(
        80
      );
    });

    it("descueta los canjes guardados como negativos", () => {
      const movements = [
        { movement_type: "earn", points: 100 },
        { movement_type: "redeem", points: -30 },
        { movement_type: "earn", points: 5 },
      ];

      expect(calculatePointsBalance(movements)).toBe(75);
    });

    it("tolera valores textuales y nulos", () => {
      const movements = [
        { points: "50" },
        { points: null },
        { points: undefined },
        {},
        { points: -20 },
      ];

      expect(calculatePointsBalance(movements)).toBe(30);
    });

    it("permite saldo negativo cuando se canjean mas puntos de los ganados", () => {
      expect(calculatePointsBalance([{ points: -10 }])).toBe(-10);
    });
  });
});
