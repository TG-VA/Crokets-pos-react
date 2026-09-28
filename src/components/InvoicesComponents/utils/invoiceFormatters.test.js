import { describe, it, expect } from "vitest";

import {
  formatCurrency,
  formatDateTime,
  getBranchLabel,
  getInvoiceFolio,
  getInvoiceStatusKey,
  getInvoiceStatusLabel,
  getShortFolio,
  getTodayDateString,
  hasFiscalCustomerData,
  isFiscalCustomerComplete,
  normalizePhoneDigits,
} from "./invoiceFormatters";

describe("invoiceFormatters", () => {
  describe("formatCurrency", () => {
    it("formatea con el simbolo y dos decimales", () => {
      expect(formatCurrency(1234.5)).toBe("$1234.50");
    });

    it("trata null, undefined y vacio como cero", () => {
      expect(formatCurrency(null)).toBe("$0.00");
      expect(formatCurrency(undefined)).toBe("$0.00");
      expect(formatCurrency("")).toBe("$0.00");
    });

    it("cohace las cadenas numericas que llegan de Postgres", () => {
      expect(formatCurrency("99.9")).toBe("$99.90");
    });

    it("no falla con un valor no numerico", () => {
      expect(formatCurrency("abc")).toBe("$NaN");
    });
  });

  describe("formatDateTime", () => {
    it("usa el guion largo cuando no hay fecha", () => {
      expect(formatDateTime(null)).toBe("—");
      expect(formatDateTime("")).toBe("—");
    });

    it("formatea una marca de tiempo con el locale es-MX", () => {
      const formatted = formatDateTime("2026-03-15T18:30:00.000Z");

      expect(formatted).toContain("2026");
      expect(typeof formatted).toBe("string");
    });
  });

  describe("getTodayDateString", () => {
    it("devuelve el formato YYYY-MM-DD que espera el filtro de fechas", () => {
      expect(getTodayDateString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("getShortFolio", () => {
    it("toma los primeros ocho caracteres del id en mayusculas", () => {
      expect(getShortFolio({ id: "abcdef12-3456" })).toBe("ABCDEF12");
    });

    it("devuelve el guion largo sin id", () => {
      expect(getShortFolio({})).toBe("—");
      expect(getShortFolio(null)).toBe("—");
    });
  });

  describe("getInvoiceFolio", () => {
    it("arma SERIE-FOLIO con el folio de seis digitos cuando el PAC ya la asigno", () => {
      expect(getInvoiceFolio({ id: "abc", serie: "A", folio: 12 })).toBe(
        "A-000012"
      );
    });

    it("cae al prefijo del id en facturas internas sin serie", () => {
      expect(getInvoiceFolio({ id: "abcdef12-3456" })).toBe("ABCDEF12");
      expect(getInvoiceFolio({ id: "abcdef12-3456", serie: "A" })).toBe(
        "ABCDEF12"
      );
    });

    it("devuelve el guion largo sin id", () => {
      expect(getInvoiceFolio(null)).toBe("—");
    });
  });

  describe("getBranchLabel", () => {
    it("une codigo y nombre cuando estan los dos", () => {
      expect(getBranchLabel({ code: "S1", name: "Sucursal Uno" })).toBe(
        "S1 - Sucursal Uno"
      );
    });

    it("acepta los nombres alternativos de la relacion embebida", () => {
      expect(
        getBranchLabel({ branch_code: "S2", branch_name: "Sucursal Dos" })
      ).toBe("S2 - Sucursal Dos");
    });

    it("usa el campo disponible cuando falta el otro", () => {
      expect(getBranchLabel({ name: "Sucursal" })).toBe("Sucursal");
      expect(getBranchLabel({ code: "S1" })).toBe("S1");
    });

    it("avisa cuando la sucursal no viene", () => {
      expect(getBranchLabel(null)).toBe("Sucursal no disponible");
      expect(getBranchLabel({})).toBe("Sucursal no disponible");
    });
  });

  describe("getInvoiceStatusLabel", () => {
    it("prioriza la cancelacion sobre el UUID", () => {
      expect(getInvoiceStatusLabel({ is_canceled: true, uuid: "uuid-1" })).toBe(
        "Cancelada"
      );
    });

    it("distingue timbrada de interna", () => {
      expect(getInvoiceStatusLabel({ uuid: "uuid-1" })).toBe("Timbrada");
      expect(getInvoiceStatusLabel({ is_canceled: false })).toBe("Interna");
    });
  });

  describe("getInvoiceStatusKey", () => {
    it("devuelve la clave de clase que corresponde a la etiqueta", () => {
      expect(getInvoiceStatusKey({ is_canceled: true, uuid: "uuid-1" })).toBe(
        "canceled"
      );
      expect(getInvoiceStatusKey({ uuid: "uuid-1" })).toBe("stamped");
      expect(getInvoiceStatusKey({})).toBe("internal");
    });
  });

  describe("normalizePhoneDigits", () => {
    it("deja solo los diez digitos", () => {
      expect(normalizePhoneDigits("55-1234-5678")).toBe("5512345678");
    });

    it("tolera null", () => {
      expect(normalizePhoneDigits(null)).toBe("");
    });
  });

  describe("isFiscalCustomerComplete", () => {
    const baseCustomer = {
      id: "c1",
      rfc: "GODE561231GR8",
      razon_social: "CLIENTE",
      tax_regime: "601",
      postal_code: "77500",
      status: true,
    };

    it("acepta el cliente fiscal completo y activo", () => {
      expect(isFiscalCustomerComplete(baseCustomer)).toBe(true);
    });

    it("rechaza al cliente dado de baja", () => {
      expect(isFiscalCustomerComplete({ ...baseCustomer, status: false })).toBe(
        false
      );
    });

    it("tolera el status ausente como activo", () => {
      expect(
        isFiscalCustomerComplete({ ...baseCustomer, status: undefined })
      ).toBe(true);
    });

    it("rechaza cuando falta cualquier dato fiscal obligatorio", () => {
      expect(isFiscalCustomerComplete({ ...baseCustomer, rfc: "" })).toBe(
        false
      );
      expect(
        isFiscalCustomerComplete({ ...baseCustomer, razon_social: "" })
      ).toBe(false);
      expect(
        isFiscalCustomerComplete({ ...baseCustomer, tax_regime: "" })
      ).toBe(false);
      expect(
        isFiscalCustomerComplete({ ...baseCustomer, postal_code: "" })
      ).toBe(false);
      expect(isFiscalCustomerComplete({ ...baseCustomer, id: null })).toBe(
        false
      );
    });
  });

  describe("hasFiscalCustomerData", () => {
    const customer = {
      rfc: "GODE561231GR8",
      razon_social: "CLIENTE",
      tax_regime: "601",
      cfdi_use: "G03",
      postal_code: "77500",
      status: true,
    };

    it("no exige id porque el badge se evalua sobre una venta", () => {
      expect(hasFiscalCustomerData(customer)).toBe(true);
    });

    it("exige el uso de CFDI, que el badge de la tabla de ventas si necesita", () => {
      expect(hasFiscalCustomerData({ ...customer, cfdi_use: "" })).toBe(false);
    });

    it("rechaza clientes dados de baja", () => {
      expect(hasFiscalCustomerData({ ...customer, status: false })).toBe(false);
    });

    it("tolera null", () => {
      expect(hasFiscalCustomerData(null)).toBe(false);
    });
  });
});
