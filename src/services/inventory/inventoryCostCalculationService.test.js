import { describe, it, expect } from "vitest";

import { calculateWeightedAverageCost } from "./inventoryCostCalculationService";

describe("inventoryCostCalculationService", () => {
  describe("calculateWeightedAverageCost - caso real de negocio", () => {
    it("pondera 10 @ $100 con la entrada de 10 @ $400 y da $250.00", () => {
      const result = calculateWeightedAverageCost({
        currentStock: 10,
        currentCost: 100,
        incomingQty: 10,
        incomingCost: 400,
      });

      expect(result).toBe(250);
    });

    it("vuelve a ponderar el resultado con la entrada de 10 @ $200 y da $233.33", () => {
      const first = calculateWeightedAverageCost({
        currentStock: 10,
        currentCost: 100,
        incomingQty: 10,
        incomingCost: 400,
      });

      const second = calculateWeightedAverageCost({
        currentStock: 20,
        currentCost: first,
        incomingQty: 10,
        incomingCost: 200,
      });

      expect(first).toBe(250);
      expect(second).toBe(233.33);
    });

    it("arrastra el valor acumulado a lo largo de tres entradas sucesivas", () => {
      const step1 = calculateWeightedAverageCost({
        currentStock: 10,
        currentCost: 100,
        incomingQty: 10,
        incomingCost: 400,
      });

      const step2 = calculateWeightedAverageCost({
        currentStock: 20,
        currentCost: step1,
        incomingQty: 10,
        incomingCost: 200,
      });

      const step3 = calculateWeightedAverageCost({
        currentStock: 30,
        currentCost: step2,
        incomingQty: 20,
        incomingCost: 50,
      });

      expect(step1).toBe(250);
      expect(step2).toBe(233.33);
      expect(step3).toBe(160);
    });
  });

  describe("calculateWeightedAverageCost - casos borde de cantidad", () => {
    it("devuelve exactamente el costo entrante cuando el stock inicial es 0", () => {
      const result = calculateWeightedAverageCost({
        currentStock: 0,
        currentCost: 100,
        incomingQty: 10,
        incomingCost: 400,
      });

      expect(result).toBe(400);
    });

    it("devuelve 0 con stock inicial 0 y costo entrante ausente", () => {
      const result = calculateWeightedAverageCost({
        currentStock: 0,
        currentCost: 100,
        incomingQty: 10,
        incomingCost: null,
      });

      expect(result).toBe(0);
    });

    it("conserva el costo vigente cuando la cantidad entrante es 0", () => {
      const result = calculateWeightedAverageCost({
        currentStock: 10,
        currentCost: 100,
        incomingQty: 0,
        incomingCost: 400,
      });

      expect(result).toBe(100);
    });

    it("conserva el costo vigente cuando la cantidad entrante es negativa", () => {
      const result = calculateWeightedAverageCost({
        currentStock: 10,
        currentCost: 100,
        incomingQty: -5,
        incomingCost: 400,
      });

      expect(result).toBe(100);
    });

    it("devuelve 0 si no hay stock ni entrada", () => {
      const result = calculateWeightedAverageCost({
        currentStock: 0,
        currentCost: 0,
        incomingQty: 0,
        incomingCost: 0,
      });

      expect(result).toBe(0);
    });

    it("pondera entradas fraccionadas con precision decimal", () => {
      const result = calculateWeightedAverageCost({
        currentStock: 2.5,
        currentCost: 10,
        incomingQty: 1.5,
        incomingCost: 20,
      });

      expect(result).toBe(13.75);
    });

    it("redondea a 2 decimales un promedio que no es exacto", () => {
      const result = calculateWeightedAverageCost({
        currentStock: 3,
        currentCost: 10,
        incomingQty: 1,
        incomingCost: 11.11,
      });

      expect(result).toBe(10.28);
    });

    it("redondea con .5 hacia arriba como hace numeric en PostgreSQL", () => {
      const result = calculateWeightedAverageCost({
        currentStock: 0,
        currentCost: 0,
        incomingQty: 1,
        incomingCost: 2.675,
      });

      expect(result).toBe(2.68);
    });
  });

  describe("calculateWeightedAverageCost - proteccion R2 contra negativos", () => {
    it("trata el stock negativo como stock 0 y toma el costo entrante", () => {
      const result = calculateWeightedAverageCost({
        currentStock: -10,
        currentCost: 100,
        incomingQty: 10,
        incomingCost: 400,
      });

      expect(result).toBe(400);
    });

    it("ignora un costo entrante negativo en lugar de arrastrarlo al promedio", () => {
      const result = calculateWeightedAverageCost({
        currentStock: 10,
        currentCost: 100,
        incomingQty: 10,
        incomingCost: -400,
      });

      expect(result).toBe(50);
    });

    it("nunca devuelve un costo negativo con costo actual y entrante negativos", () => {
      const result = calculateWeightedAverageCost({
        currentStock: 10,
        currentCost: -100,
        incomingQty: 10,
        incomingCost: -400,
      });

      expect(result).toBe(0);
    });

    it("nunca devuelve un costo negativo cuando la entrada casi cancela el valor", () => {
      const result = calculateWeightedAverageCost({
        currentStock: 1,
        currentCost: 10,
        incomingQty: 999,
        incomingCost: -1000,
      });

      expect(result).toBe(0.01);
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it("normaliza a 0 un costo entrante negativo con stock previo existente", () => {
      const result = calculateWeightedAverageCost({
        currentStock: 8,
        currentCost: 25,
        incomingQty: 12,
        incomingCost: -999,
      });

      expect(result).toBe(10);
    });
  });

  describe("calculateWeightedAverageCost - coercion de entradas sucias", () => {
    it("coerciona strings numericos en stock, costo y cantidad", () => {
      const result = calculateWeightedAverageCost({
        currentStock: "10",
        currentCost: "100.50",
        incomingQty: "10",
        incomingCost: "400",
      });

      expect(result).toBe(250.25);
    });

    it("coerciona a 0 los null y undefined de forma uniforme", () => {
      const result = calculateWeightedAverageCost({
        currentStock: null,
        currentCost: undefined,
        incomingQty: null,
        incomingCost: undefined,
      });

      expect(result).toBe(0);
    });

    it("usa el costo entrante cuando el costo vigente es null", () => {
      const result = calculateWeightedAverageCost({
        currentStock: null,
        currentCost: null,
        incomingQty: 5,
        incomingCost: 33,
      });

      expect(result).toBe(33);
    });

    it("no propaga NaN y devuelve 0 cuando todos los valores son invalidos", () => {
      const result = calculateWeightedAverageCost({
        currentStock: NaN,
        currentCost: NaN,
        incomingQty: NaN,
        incomingCost: NaN,
      });

      expect(result).toBe(0);
      expect(Number.isNaN(result)).toBe(false);
    });

    it("no propaga Infinity y colapsa a 0", () => {
      const result = calculateWeightedAverageCost({
        currentStock: Infinity,
        currentCost: Infinity,
        incomingQty: 10,
        incomingCost: Infinity,
      });

      expect(result).toBe(0);
      expect(Number.isFinite(result)).toBe(true);
    });

    it("ignora strings no numericos y los trata como 0", () => {
      const result = calculateWeightedAverageCost({
        currentStock: "diez",
        currentCost: "ciento",
        incomingQty: 5,
        incomingCost: "20",
      });

      expect(result).toBe(20);
    });

    it("devuelve 0 ante una invocacion sin argumentos", () => {
      expect(calculateWeightedAverageCost()).toBe(0);
    });

    it("devuelve 0 ante un objeto vacio", () => {
      expect(calculateWeightedAverageCost({})).toBe(0);
    });

    it("siempre devuelve un Number finito y no negativo", () => {
      const result = calculateWeightedAverageCost({
        currentStock: 10,
        currentCost: 100,
        incomingQty: 10,
        incomingCost: 400,
      });

      expect(typeof result).toBe("number");
      expect(Number.isFinite(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });
});
