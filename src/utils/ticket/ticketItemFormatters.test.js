import { describe, it, expect } from "vitest";

import {
  toNumber,
  getItemDescription,
  getItemQuantity,
  getItemLineTotal,
  getItemOriginalUnitPrice,
  getItemFinalUnitPrice,
  getItemPaidUnitPrice,
  getItemDiscountAmount,
} from "./ticketItemFormatters";

describe("ticketItemFormatters", () => {
  describe("toNumber", () => {
    it("convierte valores numericos y cae en cero ante nulos", () => {
      expect(toNumber("12.5")).toBe(12.5);
      expect(toNumber(7)).toBe(7);
      expect(toNumber(null)).toBe(0);
      expect(toNumber(undefined)).toBe(0);
      expect(toNumber("abc")).toBe(0);
      expect(toNumber(Infinity)).toBe(0);
    });
  });

  describe("getItemDescription", () => {
    it("resuelve el nombre en mayusculas con varios alias", () => {
      expect(getItemDescription({ description: "snack" })).toBe("SNACK");
      expect(getItemDescription({ product_name: "croqueta" })).toBe("CROQUETA");
      expect(getItemDescription({ productName: "premio" })).toBe("PREMIO");
      expect(getItemDescription({ name: "balin" })).toBe("BALIN");
      expect(getItemDescription({ nombre: "juguete" })).toBe("JUGUETE");
    });

    it("usa PRODUCTO como fallback", () => {
      expect(getItemDescription({})).toBe("PRODUCTO");
      expect(getItemDescription()).toBe("PRODUCTO");
    });
  });

  describe("getItemQuantity", () => {
    it("devuelve 1 si no hay cantidad o es invalida", () => {
      expect(getItemQuantity({ quantity: 3 })).toBe(3);
      expect(getItemQuantity({ qty: 4 })).toBe(4);
      expect(getItemQuantity({ cantidad: 5 })).toBe(5);
      expect(getItemQuantity({ quantity: 0 })).toBe(1);
      expect(getItemQuantity({})).toBe(1);
    });
  });

  describe("getItemLineTotal", () => {
    it("resuelve el total de la linea", () => {
      expect(getItemLineTotal({ total: 80 })).toBe(80);
      expect(getItemLineTotal({ line_total: "81" })).toBe(81);
      expect(getItemLineTotal({ total_price: 82.5 })).toBe(82.5);
      expect(getItemLineTotal({ importe: 83 })).toBe(83);
      expect(getItemLineTotal({})).toBe(0);
    });
  });

  describe("getItemOriginalUnitPrice", () => {
    it("da prioridad al precio original", () => {
      expect(getItemOriginalUnitPrice({ original_unit_price: 90, price: 80 })).toBe(90);
      expect(getItemOriginalUnitPrice({ originalUnitPrice: 91, price: 81 })).toBe(91);
      expect(getItemOriginalUnitPrice({ precioOriginal: 92, precio: 82 })).toBe(92);
      expect(getItemOriginalUnitPrice({ unit_price: 83 })).toBe(83);
      expect(getItemOriginalUnitPrice({})).toBe(0);
    });
  });

  describe("getItemFinalUnitPrice", () => {
    it("resuelve el precio unitario final", () => {
      expect(getItemFinalUnitPrice({ final_unit_price: 45 })).toBe(45);
      expect(getItemFinalUnitPrice({ finalUnitPrice: 46 })).toBe(46);
      expect(getItemFinalUnitPrice({ unit_price: 47 })).toBe(47);
      expect(getItemFinalUnitPrice({ price: "48" })).toBe(48);
      expect(getItemFinalUnitPrice({ precio: 49 })).toBe(49);
      expect(getItemFinalUnitPrice({})).toBe(0);
    });
  });

  describe("getItemPaidUnitPrice", () => {
    it("calcula el precio pagado por unidad desde el total", () => {
      expect(getItemPaidUnitPrice({ quantity: 2, total: 160 })).toBe(80);
    });

    it("cae al precio final si no hay total", () => {
      expect(getItemPaidUnitPrice({ quantity: 0, unit_price: 30 })).toBe(30);
      expect(getItemPaidUnitPrice({ total: 0, unit_price: 30 })).toBe(30);
    });
  });

  describe("getItemDiscountAmount", () => {
    it("resuelve el monto de descuento", () => {
      expect(getItemDiscountAmount({ reward_discount_amount: 20 })).toBe(20);
      expect(getItemDiscountAmount({ rewardDiscountAmount: 21 })).toBe(21);
      expect(getItemDiscountAmount({ discount_amount: 22 })).toBe(22);
      expect(getItemDiscountAmount({ discountAmount: 23 })).toBe(23);
      expect(getItemDiscountAmount({ descuentoMonto: 24 })).toBe(24);
      expect(getItemDiscountAmount({})).toBe(0);
    });
  });
});
