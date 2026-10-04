import { describe, it, expect } from "vitest";

import {
  buildSalesDayRange,
  filterPendingSales,
  filterSalesWithoutInvoice,
  getPendingSaleCashier,
  getPendingSaleCustomerName,
  isSaleReadyToInvoice,
} from "./invoicesPendingCalculationService";

const fiscalCustomer = {
  rfc: "GODE561231GR8",
  razon_social: "CLIENTE UNO",
  tax_regime: "601",
  cfdi_use: "G03",
  postal_code: "77500",
  status: true,
};

const sales = [
  {
    id: "abcdef12-3456",
    invoices: [],
    total: 116.58,
    customers: fiscalCustomer,
    users: { username: "cajero1" },
  },
  {
    id: "zzzzzzzz-9999",
    invoices: [{ id: "inv1" }],
    customers: null,
    users: { email: "cajero2@correo.com" },
  },
];

describe("invoicesPendingCalculationService", () => {
  describe("buildSalesDayRange", () => {
    it("devuelve null cuando la vista pide el listado completo", () => {
      expect(buildSalesDayRange("")).toBeNull();
      expect(buildSalesDayRange(null)).toBeNull();
    });

    it("expande el dia al rango completo con el desfase de Cancun", () => {
      const range = buildSalesDayRange("2026-03-15");

      expect(range).not.toBeNull();
      expect(new Date(range.start) < new Date(range.end)).toBe(true);
    });

    it("usa -05:00 como desfase, para no perder la madrugada", () => {
      const range = buildSalesDayRange("2026-03-15");

      // Medianoche en Cancun es 05:00 UTC del mismo dia.
      expect(range.start).toBe("2026-03-15T05:00:00.000Z");
    });
  });

  describe("filterSalesWithoutInvoice", () => {
    it("deja solo las ventas sin factura asociada", () => {
      expect(filterSalesWithoutInvoice(sales)).toHaveLength(1);
    });

    it("trata la relacion ausente como venta pendiente", () => {
      expect(filterSalesWithoutInvoice([{ id: "s1" }])).toHaveLength(1);
    });

    it("devuelve vacio sin argumentos", () => {
      expect(filterSalesWithoutInvoice()).toEqual([]);
    });
  });

  describe("filterPendingSales", () => {
    it("devuelve la lista intacta cuando no hay texto", () => {
      expect(filterPendingSales(sales, "  ")).toBe(sales);
    });

    it("busca por folio, razon social, RFC y cajero", () => {
      expect(filterPendingSales(sales, "ABCDEF12")).toHaveLength(1);
      expect(filterPendingSales(sales, "cliente uno")).toHaveLength(1);
      expect(filterPendingSales(sales, "GODE")).toHaveLength(1);
      expect(filterPendingSales(sales, "cajero2")).toHaveLength(1);
    });

    it("cae al correo del cajero cuando no hay username", () => {
      expect(filterPendingSales(sales, "cajero2@correo.com")).toHaveLength(1);
    });

    it("tolera ventas sin cliente ni cajero", () => {
      expect(filterPendingSales([{ id: "s1" }], "cualquier")).toHaveLength(0);
    });

    it("no muta la lista de entrada", () => {
      const list = [...sales];

      filterPendingSales(list, "GODE");

      expect(list).toEqual(sales);
    });
  });

  describe("getPendingSaleCustomerName", () => {
    it("usa la razon social del cliente", () => {
      expect(getPendingSaleCustomerName(sales[0])).toBe("CLIENTE UNO");
    });

    it("marca la venta publica cuando no hay cliente", () => {
      expect(getPendingSaleCustomerName(sales[1])).toBe("PÚBLICO EN GENERAL");
    });
  });

  describe("getPendingSaleCashier", () => {
    it("usa el username cuando existe", () => {
      expect(getPendingSaleCashier(sales[0])).toBe("cajero1");
    });

    it("cae al correo y luego a la etiqueta por defecto", () => {
      expect(getPendingSaleCashier(sales[1])).toBe("cajero2@correo.com");
      expect(getPendingSaleCashier({})).toBe("SIN CAJERO");
    });
  });

  describe("isSaleReadyToInvoice", () => {
    it("habilita el boton cuando el cliente tiene datos fiscales completos", () => {
      expect(isSaleReadyToInvoice(sales[0])).toBe(true);
    });

    it("deshabilita el boton en la venta publica", () => {
      expect(isSaleReadyToInvoice(sales[1])).toBe(false);
    });

    it("deshabilita el boton si al cliente le falta el uso de CFDI", () => {
      expect(
        isSaleReadyToInvoice({ customers: { ...fiscalCustomer, cfdi_use: "" } })
      ).toBe(false);
    });
  });
});
