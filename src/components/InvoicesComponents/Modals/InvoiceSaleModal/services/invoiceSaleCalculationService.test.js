import { describe, it, expect } from "vitest";

import {
  DEFAULT_CLAVE_PROD_SERV,
  DEFAULT_PAYMENT_FORM,
  DEFAULT_PAYMENT_METHOD,
  buildInvoiceConfirmMessage,
  buildInvoiceItems,
  buildInvoicePayments,
  buildInvoicePayload,
  buildInvoiceTotals,
  filterFiscalCustomers,
  getCfdiUseDescription,
  validateInvoiceBeforeSave,
} from "./invoiceSaleCalculationService";

const saleDetails = [
  {
    id: 1,
    product_id: 10,
    quantity: 2,
    unit_price: 100,
    final_unit_price: 90,
    discount_amount: 0,
    products: { name: "ALIMENTO" },
  },
  {
    id: 2,
    product_id: null,
    quantity: 1,
    unit_price: 50,
    discount_amount: 10,
  },
];

const customer = {
  id: "c1",
  rfc: "GODE561231GR8",
  razon_social: "CLIENTE SA DE CV",
  tax_regime: "601",
  postal_code: "77500",
  status: true,
};

describe("invoiceSaleCalculationService", () => {
  describe("buildInvoiceTotals", () => {
    it("normaliza los totales de la venta a numero", () => {
      expect(
        buildInvoiceTotals({ subtotal: "100.5", tax: "16.08", total: "116.58" })
      ).toEqual({ subtotal: 100.5, tax: 16.08, total: 116.58 });
    });

    it("deja los totales en cero cuando la venta no los trae", () => {
      expect(buildInvoiceTotals({})).toEqual({ subtotal: 0, tax: 0, total: 0 });
      expect(buildInvoiceTotals(null)).toEqual({
        subtotal: 0,
        tax: 0,
        total: 0,
      });
    });
  });

  describe("buildInvoiceItems", () => {
    it("prefiere el precio final sobre el precio de lista", () => {
      const items = buildInvoiceItems({
        saleDetails,
        invoiceId: "inv1",
        branchId: 3,
      });

      expect(items[0].unit_price).toBe(90);
    });

    it("descuenta el descuento de la linea antes de calcular el IVA", () => {
      const items = buildInvoiceItems({
        saleDetails,
        invoiceId: "inv1",
        branchId: 3,
      });

      // 1 x 50 - 10 = 40; IVA 16% = 6.40; total 46.40
      expect(items[1].unit_price).toBe(50);
      expect(items[1].discount).toBe(10);
      expect(items[1].tax_amount).toBe(6.4);
      expect(items[1].total).toBe(46.4);
    });

    it("redondea el IVA y el total a dos decimales", () => {
      const items = buildInvoiceItems({
        saleDetails: [
          {
            id: 3,
            quantity: 3,
            unit_price: 33.33,
            discount_amount: 0,
            products: { name: "X" },
          },
        ],
        invoiceId: "inv1",
        branchId: 3,
      });

      // 3 x 33.33 = 99.99; IVA = 15.9984 -> 16.00
      expect(items[0].tax_amount).toBe(16);
      expect(items[0].total).toBe(115.99);
    });

    it("usa la clave de producto por defecto del SAT", () => {
      const items = buildInvoiceItems({
        saleDetails,
        invoiceId: "inv1",
        branchId: 3,
      });

      expect(items[0].clave_prod_serv).toBe(DEFAULT_CLAVE_PROD_SERV);
    });

    it("sustituye la descripcion cuando el producto no trae nombre", () => {
      const items = buildInvoiceItems({
        saleDetails,
        invoiceId: "inv1",
        branchId: 3,
      });

      expect(items[1].description).toBe("CONCEPTO FACTURADO");
    });

    it("conserva el producto cuando existe y lo nullea cuando no", () => {
      const items = buildInvoiceItems({
        saleDetails,
        invoiceId: "inv1",
        branchId: 3,
      });

      expect(items[0].product_id).toBe(10);
      expect(items[1].product_id).toBeNull();
    });

    it("sella cada concepto con la factura y la sucursal", () => {
      const items = buildInvoiceItems({
        saleDetails,
        invoiceId: "inv1",
        branchId: 3,
      });

      expect(items[0].invoice_id).toBe("inv1");
      expect(items[0].branch_id).toBe(3);
      expect(Number.isNaN(Date.parse(items[0].created_at))).toBe(false);
    });

    it("devuelve un concepto por cada detalle de la venta", () => {
      const items = buildInvoiceItems({
        saleDetails,
        invoiceId: "inv1",
        branchId: 3,
      });

      expect(items).toHaveLength(2);
    });

    it("devuelve arreglo vacio sin detalles", () => {
      expect(
        buildInvoiceItems({ saleDetails: [], invoiceId: "inv1", branchId: 3 })
      ).toEqual([]);
    });
  });

  describe("buildInvoicePayments", () => {
    it("traslada los pagos de la venta a la factura", () => {
      const payments = buildInvoicePayments({
        salePayments: [
          { payment_method_id: 1, amount: "50.5", currency: "USD" },
          { payment_method_id: 2, amount: 60 },
        ],
        invoiceId: "inv1",
      });

      expect(payments[0]).toMatchObject({
        invoice_id: "inv1",
        payment_method_id: 1,
        amount: 50.5,
        currency: "USD",
      });
      expect(payments[1].currency).toBe("MXN");
    });

    it("devuelve arreglo vacio cuando la venta no tiene pagos", () => {
      expect(
        buildInvoicePayments({ salePayments: [], invoiceId: "inv1" })
      ).toEqual([]);
    });
  });

  describe("buildInvoicePayload", () => {
    it("arma la cabecera con la forma de pago por defecto", () => {
      const payload = buildInvoicePayload({
        sale: { id: "s1" },
        customerId: "c1",
        branchId: 3,
        userId: "u1",
        cfdiUse: "G03",
        totals: { subtotal: 100, tax: 16, total: 116 },
      });

      expect(payload).toMatchObject({
        sale_id: "s1",
        customer_id: "c1",
        branch_id: 3,
        user_id: "u1",
        cfdi_use: "G03",
        payment_method: DEFAULT_PAYMENT_METHOD,
        payment_form: DEFAULT_PAYMENT_FORM,
        is_canceled: false,
      });
    });

    it("copia los totales de la venta a la cabecera", () => {
      const payload = buildInvoicePayload({
        sale: { id: "s1" },
        customerId: "c1",
        branchId: 3,
        userId: "u1",
        cfdiUse: "G03",
        totals: { subtotal: 100, tax: 16, total: 116 },
      });

      expect(payload.subtotal).toBe(100);
      expect(payload.tax).toBe(16);
      expect(payload.total).toBe(116);
    });

    it("sella la fecha de emision y la de alta", () => {
      const payload = buildInvoicePayload({
        sale: { id: "s1" },
        customerId: "c1",
        branchId: 3,
        userId: "u1",
        cfdiUse: "G03",
        totals: { subtotal: 0, tax: 0, total: 0 },
      });

      expect(Number.isNaN(Date.parse(payload.invoice_date))).toBe(false);
      expect(Number.isNaN(Date.parse(payload.created_at))).toBe(false);
    });
  });

  describe("validateInvoiceBeforeSave", () => {
    const baseArgs = {
      sale: { id: "s1" },
      branchId: 3,
      userId: "u1",
      customer,
      cfdiUse: "G03",
      saleDetails: [{ id: 1 }],
    };

    it("acepta la venta con todos los datos", () => {
      expect(validateInvoiceBeforeSave(baseArgs)).toBe("");
    });

    it("exige venta, sucursal y usuario antes de cliente", () => {
      expect(validateInvoiceBeforeSave({ ...baseArgs, sale: null })).toBe(
        "No se encontró la venta."
      );
      expect(validateInvoiceBeforeSave({ ...baseArgs, branchId: null })).toBe(
        "No se encontró la sucursal."
      );
      expect(validateInvoiceBeforeSave({ ...baseArgs, userId: null })).toBe(
        "No se encontró el usuario."
      );
    });

    it("exige cliente fiscal con datos completos", () => {
      expect(validateInvoiceBeforeSave({ ...baseArgs, customer: null })).toBe(
        "Selecciona un cliente fiscal con datos completos."
      );

      expect(
        validateInvoiceBeforeSave({
          ...baseArgs,
          customer: { ...customer, rfc: "" },
        })
      ).toBe("Selecciona un cliente fiscal con datos completos.");
    });

    it("exige el uso de CFDI de la factura", () => {
      expect(validateInvoiceBeforeSave({ ...baseArgs, cfdiUse: "" })).toBe(
        "Selecciona el uso CFDI para esta factura."
      );
    });

    it("exige que la venta tenga conceptos", () => {
      expect(validateInvoiceBeforeSave({ ...baseArgs, saleDetails: [] })).toBe(
        "La venta no tiene productos o servicios."
      );
    });
  });

  describe("filterFiscalCustomers", () => {
    const customers = [
      {
        id: "c1",
        rfc: "GODE561231GR8",
        razon_social: "CLIENTE SA DE CV",
        phone: "5512345678",
        fiscal_email: "fiscal@correo.com",
      },
      { id: "c2", rfc: "XAXX010101ABC", razon_social: "OTRO CLIENTE" },
    ];

    it("devuelve la lista completa cuando no hay texto", () => {
      expect(filterFiscalCustomers(customers, "  ")).toHaveLength(2);
    });

    it("busca en RFC, razon social, telefono, correo y C.P.", () => {
      expect(filterFiscalCustomers(customers, "GODE")[0].id).toBe("c1");
      expect(filterFiscalCustomers(customers, "otro")[0].id).toBe("c2");
      expect(filterFiscalCustomers(customers, "551234")[0].id).toBe("c1");
      expect(filterFiscalCustomers(customers, "fiscal@")[0].id).toBe("c1");
    });

    it("no distingue mayusculas", () => {
      expect(filterFiscalCustomers(customers, "cliente sa")).toHaveLength(1);
    });

    it("devuelve vacio cuando nada coincide", () => {
      expect(filterFiscalCustomers(customers, "zzz")).toEqual([]);
    });
  });

  describe("getCfdiUseDescription", () => {
    const cfdiUses = [{ id: "G03", description: "Gastos en general" }];

    it("devuelve la descripcion del uso elegido", () => {
      expect(getCfdiUseDescription(cfdiUses, "G03")).toBe("Gastos en general");
    });

    it("devuelve cadena vacia si aun no hay uso elegido", () => {
      expect(getCfdiUseDescription(cfdiUses, "")).toBe("");
      expect(getCfdiUseDescription(cfdiUses, "S01")).toBe("");
    });
  });

  describe("buildInvoiceConfirmMessage", () => {
    it("incluye folio, RFC, razon social, uso y total", () => {
      const message = buildInvoiceConfirmMessage({
        sale: { id: "abcdef12-3456", total: 116.58 },
        customer,
        cfdiUse: "G03",
      });

      expect(message).toContain("ABCDEF12");
      expect(message).toContain("GODE561231GR8");
      expect(message).toContain("CLIENTE SA DE CV");
      expect(message).toContain("$116.58");
    });
  });
});
