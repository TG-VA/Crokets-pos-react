/**
 * invoiceSaleCalculationService.js
 * Derivaciones puras de la facturacion de una venta.
 *
 * Servicio puro: sin React, sin Supabase y sin I/O. Arma los conceptos y los
 * pagos de la factura, y valida que la venta tenga todo lo necesario antes de
 * escribir.
 */

import {
  formatCurrency,
  getShortFolio,
  isFiscalCustomerComplete,
} from "../../../utils/invoiceFormatters";

export const DEFAULT_CLAVE_PROD_SERV = "01010101";
export const DEFAULT_PAYMENT_METHOD = "PUE";
export const DEFAULT_PAYMENT_FORM = "99";
export const DEFAULT_TAX_RATE = 16;

/**
 * Totales de la venta, normalizados a numero. La venta viene de la consulta de
 * ventas y sus campos llegan como lo que devolvio Postgres.
 */
export const buildInvoiceTotals = (sale) => ({
  subtotal: Number(sale?.subtotal || 0),
  tax: Number(sale?.tax || 0),
  total: Number(sale?.total || 0),
});

/**
 * Conceptos de la factura a partir de los detalles de la venta.
 *
 * El precio unitario efectivo es el final cuando existe; el descuento se resta
 * de la linea antes de calcular el IVA, que es como lo hacia la vista original.
 */
export const buildInvoiceItems = ({ saleDetails, invoiceId, branchId }) =>
  saleDetails.map((item) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.final_unit_price || item.unit_price || 0);
    const discount = Number(item.discount_amount || 0);
    const lineSubtotal = quantity * unitPrice - discount;
    const taxRate = DEFAULT_TAX_RATE;
    const taxAmount = Number((lineSubtotal * 0.16).toFixed(2));
    const total = Number((lineSubtotal + taxAmount).toFixed(2));

    return {
      invoice_id: invoiceId,
      product_id: item.product_id || null,
      description: item.products?.name || "CONCEPTO FACTURADO",
      clave_prod_serv: DEFAULT_CLAVE_PROD_SERV,
      quantity,
      unit_price: unitPrice,
      discount,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total,
      branch_id: branchId,
      created_at: new Date().toISOString(),
    };
  });

/**
 * Pagos de la factura a partir de los pagos de la venta. Devuelve una lista
 * vacia cuando la venta no tiene pagos, y el llamador decide si se inserta.
 */
export const buildInvoicePayments = ({ salePayments, invoiceId }) => {
  if (!salePayments.length) return [];

  return salePayments.map((payment) => ({
    invoice_id: invoiceId,
    payment_method_id: payment.payment_method_id,
    amount: Number(payment.amount || 0),
    currency: payment.currency || "MXN",
    created_at: new Date().toISOString(),
  }));
};

/**
 * Cabecera de la factura.
 */
export const buildInvoicePayload = ({
  sale,
  customerId,
  branchId,
  userId,
  cfdiUse,
  totals,
}) => ({
  sale_id: sale.id,
  customer_id: customerId,
  branch_id: branchId,
  user_id: userId,
  cfdi_use: cfdiUse,
  payment_method: DEFAULT_PAYMENT_METHOD,
  payment_form: DEFAULT_PAYMENT_FORM,
  subtotal: Number(totals.subtotal || 0),
  tax: Number(totals.tax || 0),
  total: Number(totals.total || 0),
  is_canceled: false,
  invoice_date: new Date().toISOString(),
  created_at: new Date().toISOString(),
});

/**
 * Valida que la venta se pueda facturar y devuelve el primer mensaje de error,
 * o cadena vacia cuando si se puede.
 */
export const validateInvoiceBeforeSave = ({
  sale,
  branchId,
  userId,
  customer,
  cfdiUse,
  saleDetails,
}) => {
  if (!sale?.id) return "No se encontró la venta.";
  if (!branchId) return "No se encontró la sucursal.";
  if (!userId) return "No se encontró el usuario.";

  if (!isFiscalCustomerComplete(customer)) {
    return "Selecciona un cliente fiscal con datos completos.";
  }

  if (!cfdiUse) {
    return "Selecciona el uso CFDI para esta factura.";
  }

  if (saleDetails.length === 0) {
    return "La venta no tiene productos o servicios.";
  }

  return "";
};

/**
 * Filtra los clientes fiscales por texto libre sobre los campos con los que
 * el cajero busca: RFC, razon social, telefono, correo y codigo postal.
 */
export const filterFiscalCustomers = (customers, searchTerm) => {
  const search = searchTerm.trim().toLowerCase();

  if (!search) return customers;

  return customers.filter((customer) => {
    const values = [
      customer.rfc,
      customer.razon_social,
      customer.phone,
      customer.fiscal_email,
      customer.email,
      customer.postal_code,
    ];

    return values.some((value) =>
      String(value || "")
        .toLowerCase()
        .includes(search)
    );
  });
};

/**
 * Descripcion del uso CFDI elegido, para mostrarla como ayuda bajo el select.
 */
export const getCfdiUseDescription = (cfdiUses, selectedCfdiUse) =>
  cfdiUses.find((item) => item.id === selectedCfdiUse)?.description || "";

/**
 * Texto de confirmacion antes de generar la factura interna.
 */
export const buildInvoiceConfirmMessage = ({ sale, customer, cfdiUse }) =>
  `¿Deseas generar la factura interna de la venta ${getShortFolio(
    sale
  )}?\n\nRFC: ${customer.rfc}\nRazón social: ${
    customer.razon_social
  }\nUso CFDI: ${cfdiUse}\nTotal: ${formatCurrency(sale.total)}`;
