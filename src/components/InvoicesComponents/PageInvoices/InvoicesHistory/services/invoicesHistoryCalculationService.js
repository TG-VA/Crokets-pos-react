/**
 * invoicesHistoryCalculationService.js
 * Derivaciones puras del historial de facturas.
 *
 * Servicio puro: sin React, sin Supabase y sin I/O. Concentra el filtrado del
 * historial, la suma del total facturado y el calculo del numero de columnas,
 * que depende de si la vista global esta activa.
 */

import {
  getBranchLabel,
  getInvoiceFolio,
  getInvoiceStatusLabel,
} from "../../../utils/invoiceFormatters";

/**
 * Filtra el historial por texto libre. El rango de fechas, la sucursal y el
 * orden los aplica la consulta; aqui solo se busca dentro del resultado.
 */
export const filterInvoicesBySearch = (invoices, searchTerm) => {
  const search = searchTerm.trim().toLowerCase();

  if (!search) return invoices;

  return invoices.filter((invoice) => {
    const customer = invoice.customers || {};
    const invoiceBranch = invoice.branches || {};

    const values = [
      getInvoiceFolio(invoice),
      invoice.uuid,
      customer.rfc,
      customer.razon_social,
      customer.fiscal_email,
      invoice.cfdi_use,
      invoice.payment_method,
      invoice.payment_form,
      getInvoiceStatusLabel(invoice),
      getBranchLabel(invoiceBranch),
    ];

    return values.some((value) =>
      String(value || "")
        .toLowerCase()
        .includes(search)
    );
  });
};

/**
 * Total facturado de las facturas que se estan mostrando. Las canceladas suman
 * cero a proposito: no representan ingreso.
 */
export const sumInvoicesTotal = (invoices) =>
  invoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);

/**
 * Numero de columnas de la tabla. La vista global agrega la columna de
 * sucursal, y el `colspan` de las filas de estado tiene que acompañarla.
 */
export const getInvoicesTableColSpan = (isGlobalView) => (isGlobalView ? 9 : 8);

/**
 * Rango de fechas del filtro en el formato que espera la columna `created_at`.
 */
export const buildInvoicesDateRange = (startDate, endDate) => ({
  start: `${startDate}T00:00:00`,
  end: `${endDate}T23:59:59`,
});
