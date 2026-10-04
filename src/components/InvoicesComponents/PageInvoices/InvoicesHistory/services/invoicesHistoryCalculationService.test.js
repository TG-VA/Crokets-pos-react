import { describe, it, expect } from "vitest";

import {
  buildInvoicesDateRange,
  filterInvoicesBySearch,
  getInvoicesTableColSpan,
  sumInvoicesTotal,
} from "./invoicesHistoryCalculationService";

const invoices = [
  {
    id: "abcdef12-3456",
    serie: "A",
    folio: 12,
    uuid: "uuid-1",
    is_canceled: false,
    total: 116.58,
    cfdi_use: "G03",
    payment_method: "01",
    payment_form: "PUE",
    customers: { rfc: "GODE561231GR8", razon_social: "CLIENTE UNO" },
    branches: { code: "S1", name: "Sucursal Uno" },
  },
  {
    id: "yyyyyyyy-9999",
    uuid: "uuid-2",
    is_canceled: true,
    total: 50,
    customers: { rfc: "XAXX010101ABC", razon_social: "CLIENTE DOS" },
  },
];

describe("invoicesHistoryCalculationService", () => {
  describe("filterInvoicesBySearch", () => {
    it("devuelve la lista intacta cuando no hay texto", () => {
      expect(filterInvoicesBySearch(invoices, "  ")).toBe(invoices);
    });

    it("busca por folio, UUID, RFC y razon social", () => {
      expect(filterInvoicesBySearch(invoices, "GODE")).toHaveLength(1);
      expect(filterInvoicesBySearch(invoices, "uuid-2")).toHaveLength(1);
      expect(filterInvoicesBySearch(invoices, "A-000012")).toHaveLength(1);
      expect(filterInvoicesBySearch(invoices, "cliente dos")).toHaveLength(1);
    });

    it("busca por sucursal cuando viene la relacion embebida", () => {
      expect(filterInvoicesBySearch(invoices, "Sucursal Uno")).toHaveLength(1);
    });

    it("busca por el uso de CFDI y la forma de pago", () => {
      expect(filterInvoicesBySearch(invoices, "PUE")).toHaveLength(1);
      expect(filterInvoicesBySearch(invoices, "G03")).toHaveLength(1);
    });

    it("no distingue mayusculas ni acentos en el texto buscado", () => {
      expect(filterInvoicesBySearch(invoices, "CLIENTE UNO")).toHaveLength(1);
    });

    it("no muta la lista de entrada", () => {
      const list = [...invoices];

      filterInvoicesBySearch(list, "GODE");

      expect(list).toEqual(invoices);
    });

    it("tolera facturas sin relacion de cliente", () => {
      expect(filterInvoicesBySearch([{ id: "solo" }], "solo")).toHaveLength(1);
    });

    it("devuelve vacio cuando nada coincide", () => {
      expect(filterInvoicesBySearch(invoices, "zzz")).toEqual([]);
    });
  });

  describe("sumInvoicesTotal", () => {
    it("suma los totales de las facturas mostradas", () => {
      expect(sumInvoicesTotal(invoices)).toBeCloseTo(166.58, 2);
    });

    it("normaliza los totales que llegan como cadena", () => {
      expect(
        sumInvoicesTotal([{ total: "10.5" }, { total: "4.5" }])
      ).toBeCloseTo(15, 2);
    });

    it("trata el total ausente como cero", () => {
      expect(sumInvoicesTotal([{ total: null }, {}])).toBe(0);
    });

    it("devuelve cero para lista vacia", () => {
      expect(sumInvoicesTotal([])).toBe(0);
    });
  });

  describe("getInvoicesTableColSpan", () => {
    it("agrega la columna de sucursal solo en la vista global", () => {
      expect(getInvoicesTableColSpan(true)).toBe(9);
      expect(getInvoicesTableColSpan(false)).toBe(8);
    });
  });

  describe("buildInvoicesDateRange", () => {
    it("expande el rango al dia completo", () => {
      expect(buildInvoicesDateRange("2026-03-01", "2026-03-31")).toEqual({
        start: "2026-03-01T00:00:00",
        end: "2026-03-31T23:59:59",
      });
    });
  });
});
