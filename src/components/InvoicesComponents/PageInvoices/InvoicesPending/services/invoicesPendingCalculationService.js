/**
 * invoicesPendingCalculationService.js
 * Derivaciones puras de la lista de ventas por facturar.
 *
 * Servicio puro: sin React, sin Supabase y sin I/O.
 */

import {
  getShortFolio,
  hasFiscalCustomerData,
} from "../../../utils/invoiceFormatters";

/**
 * Rango del dia en ISO, con el desfase de Cancun (`-05:00`) que usa el filtro
 * de la pantalla para no perder las ventas de la madrugada.
 *
 * Devuelve `null` cuando no hay fecha, que es como la vista pedia el listado
 * completo.
 */
export const buildSalesDayRange = (dateFilter) => {
  if (!dateFilter) return null;

  const start = new Date(`${dateFilter}T00:00:00-05:00`);
  const end = new Date(`${dateFilter}T23:59:59.999-05:00`);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
};

/**
 * Una venta queda pendiente si no tiene ninguna factura asociada.
 */
export const filterSalesWithoutInvoice = (sales = []) =>
  sales.filter((sale) => !sale.invoices || sale.invoices.length === 0);

/**
 * Filtra por folio, razon social, RFC o cajero.
 */
export const filterPendingSales = (sales, searchTerm) => {
  const search = searchTerm.trim().toLowerCase();

  if (!search) return sales;

  return sales.filter((sale) => {
    const folio = getShortFolio(sale).toLowerCase();
    const businessName = sale.customers?.razon_social?.toLowerCase() || "";
    const rfc = sale.customers?.rfc?.toLowerCase() || "";
    const cashier =
      sale.users?.username?.toLowerCase() ||
      sale.users?.email?.toLowerCase() ||
      "";

    return (
      folio.includes(search) ||
      businessName.includes(search) ||
      rfc.includes(search) ||
      cashier.includes(search)
    );
  });
};

/**
 * Nombre del cliente de la venta, o la etiqueta de venta de mostrador cuando
 * la venta fue publica.
 */
export const getPendingSaleCustomerName = (sale) =>
  sale.customers?.razon_social || "PÚBLICO EN GENERAL";

/**
 * Cajero que cobro la venta.
 */
export const getPendingSaleCashier = (sale) =>
  sale.users?.username || sale.users?.email || "SIN CAJERO";

/**
 * El boton "Facturar" se habilita con datos fiscales completos; si faltan, el
 * modal deja elegir o crear el cliente.
 */
export const isSaleReadyToInvoice = (sale) =>
  hasFiscalCustomerData(sale.customers);
