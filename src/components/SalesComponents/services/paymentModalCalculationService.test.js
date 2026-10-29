import { describe, it, expect } from "vitest";

import {
  ceilWholeDollars,
  getDollarsDueInUsd,
  getMixedRemainingUsd,
  getPaymentTotalInMxn,
  isValidExchangeRate,
  roundCurrency,
} from "./paymentModalCalculationService";

describe("paymentModalCalculationService", () => {
  describe("redondeo", () => {
    it("redondea montos a centavos de forma consistente", () => {
      expect(roundCurrency(10.005)).toBe(10.01);
      expect(roundCurrency("12.344")).toBe(12.34);
      expect(roundCurrency(null)).toBe(0);
    });

    it("redondea hacia arriba a dolares enteros para garantizar cobertura", () => {
      expect(ceilWholeDollars(19.29)).toBe(20);
      expect(ceilWholeDollars(18.01)).toBe(19);
      expect(ceilWholeDollars(18)).toBe(18);
    });

    it("no sube un dolar por ruido de punto flotante", () => {
      expect(ceilWholeDollars(20.000000000000004)).toBe(20);
    });

    it("sube un dolar cuando la fraccion real es pequena pero existe", () => {
      expect(ceilWholeDollars(20.0039)).toBe(21);
    });
  });

  describe("getDollarsDueInUsd", () => {
    it("calcula los dolares exactos para un total divisible", () => {
      expect(getDollarsDueInUsd(370, 18.5)).toBe(20);
      expect(getDollarsDueInUsd(100, 20)).toBe(5);
    });

    it("redondea hacia arriba a dolares enteros cuando el total no es divisible", () => {
      expect(getDollarsDueInUsd(100, 18)).toBe(6);
      expect(getDollarsDueInUsd(10, 3)).toBe(4);
      expect(getDollarsDueInUsd(357, 18.5)).toBe(20);
    });

    it("cubre el total cuando la fraccion de dolar es menor a un centavo de dolar", () => {
      // 360.07 / 18 = 20.0038...: con solo dos decimales quedaria en 20 USD
      // (360 MXN) y no cubriria el total.
      expect(getDollarsDueInUsd(360.07, 18)).toBe(21);
    });

    it("nunca devuelve un monto que deje sin cubrir el total", () => {
      const total = 356.99;
      const rate = 18.5;

      expect(getDollarsDueInUsd(total, rate) * rate).toBeGreaterThanOrEqual(
        total
      );
    });

    it("devuelve 0 con total o tipo de cambio invalidos", () => {
      expect(getDollarsDueInUsd(0, 18.5)).toBe(0);
      expect(getDollarsDueInUsd(-10, 18.5)).toBe(0);
      expect(getDollarsDueInUsd(100, 0)).toBe(0);
      expect(getDollarsDueInUsd(100, "")).toBe(0);
      expect(getDollarsDueInUsd(100, "abc")).toBe(0);
    });
  });

  describe("getMixedRemainingUsd", () => {
    it("descuenta efectivo y tarjeta del adeudo", () => {
      expect(
        getMixedRemainingUsd({
          totalMxn: 1000,
          cashMxn: 400,
          cardMxn: 100,
          exchangeRate: 20,
        })
      ).toBe(25);
    });

    it("devuelve 0 cuando los pagos en MXN ya cubren el total", () => {
      expect(
        getMixedRemainingUsd({
          totalMxn: 500,
          cashMxn: 300,
          cardMxn: 200,
          exchangeRate: 18.5,
        })
      ).toBe(0);
    });

    it("calcula el adeudo parcial con redondeo hacia arriba", () => {
      expect(
        getMixedRemainingUsd({
          totalMxn: 100,
          cashMxn: 50,
          exchangeRate: 18,
        })
      ).toBe(3);
    });

    it("devuelve 0 con tipo de cambio invalido o vacio", () => {
      expect(
        getMixedRemainingUsd({
          totalMxn: 100,
          cashMxn: 0,
          exchangeRate: 0,
        })
      ).toBe(0);
      expect(
        getMixedRemainingUsd({
          totalMxn: 100,
          exchangeRate: "",
        })
      ).toBe(0);
    });
  });

  describe("getPaymentTotalInMxn", () => {
    it("suma el pago mixto y redondea a centavos", () => {
      expect(
        getPaymentTotalInMxn({
          method: "Mixto",
          exchangeRate: 18.5,
          mixed: { efectivo: "100", tarjeta: "50", dolares: "10" },
        })
      ).toBe(335);
    });

    it("convierte dolares con el tipo de cambio", () => {
      expect(
        getPaymentTotalInMxn({
          method: "Dolares",
          amount: 20,
          exchangeRate: 18.5,
        })
      ).toBe(370);
    });

    it("ignora montos invalidos", () => {
      expect(getPaymentTotalInMxn({ method: "Efectivo", amount: "abc" })).toBe(
        0
      );
      expect(getPaymentTotalInMxn({ method: "Otro", amount: 100 })).toBe(0);
    });
  });

  describe("isValidExchangeRate", () => {
    it("valida tipos de cambio positivos y numericos", () => {
      expect(isValidExchangeRate(18.5)).toBe(true);
      expect(isValidExchangeRate("18.5")).toBe(true);
      expect(isValidExchangeRate(0)).toBe(false);
      expect(isValidExchangeRate("")).toBe(false);
      expect(isValidExchangeRate(null)).toBe(false);
    });
  });
});
