import { describe, it, expect } from "vitest";

import {
  getPaymentLabel,
  getPaymentAmountInMxn,
  getTotalPaidInMxn,
  shouldShowReceivedAndChange,
} from "./ticketPaymentService";

describe("ticketPaymentService", () => {
  describe("getPaymentLabel", () => {
    it("etiqueta como SIN PAGO cuando hay recompensas y total cero", () => {
      expect(
        getPaymentLabel([], "", { total: 0, points_used: 10 }, [])
      ).toBe("SIN PAGO");
    });

    it("usa el metodo por defecto cuando no hay pagos", () => {
      expect(getPaymentLabel([], "EFECTIVO", {}, [])).toBe("EFECTIVO");
      expect(getPaymentLabel([], "", {}, [])).toBe("SIN PAGOS");
    });

    it("normaliza el nombre unico o devuelve MIXTO", () => {
      expect(
        getPaymentLabel([{ payment_method_name: "efectivo" }], "", {}, [])
      ).toBe("EFECTIVO");
      expect(
        getPaymentLabel(
          [
            { payment_method_name: "efectivo" },
            { paymentMethod: "tarjeta" },
          ],
          "",
          {},
          []
        )
      ).toBe("MIXTO");
      expect(getPaymentLabel([{}], "", {}, [])).toBe("SIN PAGOS");
    });
  });

  describe("getPaymentAmountInMxn", () => {
    it("convierte dolares a pesos usando el tipo de cambio", () => {
      expect(
        getPaymentAmountInMxn({ amount: 100, currency: "USD", exchange_rate: 20 })
      ).toBe(2000);
    });

    it("devuelve cero si faltan el tipo de cambio", () => {
      expect(
        getPaymentAmountInMxn({ amount: 100, currency: "USD" })
      ).toBe(0);
    });

    it("deja los montos en MXN iguales", () => {
      expect(getPaymentAmountInMxn({ amount: 150 })).toBe(150);
      expect(getPaymentAmountInMxn({ amount: "160" })).toBe(160);
    });
  });

  describe("getTotalPaidInMxn", () => {
    it("suma los pagos o usa el monto por defecto", () => {
      expect(getTotalPaidInMxn([{ amount: 80 }, { amount: 20 }])).toBe(100);
      expect(getTotalPaidInMxn([], 232)).toBe(232);
    });
  });

  describe("shouldShowReceivedAndChange", () => {
    it("muestra recibimos/cambio con efectivo, USD o pagos multiples", () => {
      expect(
        shouldShowReceivedAndChange([{ payment_method_name: "EFECTIVO" }])
      ).toBe(true);
      expect(
        shouldShowReceivedAndChange([{ currency: "USD" }])
      ).toBe(true);
      expect(
        shouldShowReceivedAndChange([
          { payment_method_name: "TARJETA" },
          { payment_method_name: "EFECTIVO" },
        ])
      ).toBe(true);
      expect(
        shouldShowReceivedAndChange([{ payment_method_name: "TARJETA" }])
      ).toBe(false);
    });

    it("con fallback, solo efectivo o USD", () => {
      expect(shouldShowReceivedAndChange([], "EFECTIVO")).toBe(true);
      expect(shouldShowReceivedAndChange([], "USD")).toBe(true);
      expect(shouldShowReceivedAndChange([], "TARJETA")).toBe(false);
    });
  });
});
