import { describe, it, expect } from "vitest";

import {
  getCustomerSortName,
  normalizePhoneDigits,
  normalizeText,
  sortCustomersByName,
} from "./customerFormatters";

describe("customerFormatters", () => {
  describe("getCustomerSortName", () => {
    it("usa el nombre cuando existe", () => {
      expect(getCustomerSortName({ name: "ANA" })).toBe("ANA");
    });

    it("cae a telefono y correo cuando no hay nombre", () => {
      expect(getCustomerSortName({ phone: "5512345678" })).toBe("5512345678");
      expect(getCustomerSortName({ email: "a@b.com" })).toBe("a@b.com");
    });

    it("devuelve SIN NOMBRE cuando no hay nada", () => {
      expect(getCustomerSortName({})).toBe("SIN NOMBRE");
      expect(getCustomerSortName(null)).toBe("SIN NOMBRE");
    });

    it("recorta espacios", () => {
      expect(getCustomerSortName({ name: "  ANA  " })).toBe("ANA");
    });
  });

  describe("sortCustomersByName", () => {
    it("ordena alfabeticamente sin distinguir mayusculas", () => {
      const sorted = sortCustomersByName([
        { name: "carlos" },
        { name: "Ana" },
        { name: "BEATRIZ" },
      ]);

      expect(sorted.map((customer) => customer.name)).toEqual([
        "Ana",
        "BEATRIZ",
        "carlos",
      ]);
    });

    it("ordena numericamente de forma natural", () => {
      const sorted = sortCustomersByName([
        { name: "CLIENTE 10" },
        { name: "CLIENTE 2" },
        { name: "CLIENTE 1" },
      ]);

      expect(sorted.map((customer) => customer.name)).toEqual([
        "CLIENTE 1",
        "CLIENTE 2",
        "CLIENTE 10",
      ]);
    });

    it("no muta el arreglo original", () => {
      const original = [{ name: "B" }, { name: "A" }];
      const copy = [...original];

      sortCustomersByName(original);

      expect(original).toEqual(copy);
    });

    it("acepta lista vacia o indefinida", () => {
      expect(sortCustomersByName()).toEqual([]);
      expect(sortCustomersByName([])).toEqual([]);
    });
  });

  describe("normalizePhoneDigits", () => {
    it("deja solo digitos", () => {
      expect(normalizePhoneDigits("55 (1234) 5678")).toBe("5512345678");
      expect(normalizePhoneDigits("+52 55 1234 5678")).toBe("5255123456");
    });

    it("recorta a 10 digitos", () => {
      expect(normalizePhoneDigits("551234567890123")).toBe("5512345678");
    });

    it("tolera valores nulos", () => {
      expect(normalizePhoneDigits(null)).toBe("");
      expect(normalizePhoneDigits(undefined)).toBe("");
    });
  });

  describe("normalizeText", () => {
    it("colapsa espacios, recorta y pasa a mayusculas", () => {
      expect(normalizeText("  pago   con  tarjeta ")).toBe("PAGO CON TARJETA");
    });

    it("tolera valores nulos", () => {
      expect(normalizeText(null)).toBe("");
    });
  });
});
