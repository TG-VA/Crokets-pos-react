/**
 * invoiceFormatters.js
 * Formateo visual compartido por el modulo de Facturacion.
 *
 * Funciones puras sin dependencias de Supabase ni de React, para que las vistas
 * no repitan la misma cadena de formato en cinco modulos distintos.
 */

export const INVOICE_TIME_ZONE = "America/Cancun";

/**
 * Monto en pesos con dos decimales. Los valores nulos, indefinidos y no
 * numericos se tratan como cero, igual que antes del refactor.
 */
export const formatCurrency = (value) => `$${Number(value || 0).toFixed(2)}`;

/**
 * Marca de tiempo en el formato regional mexicano de la zona horaria de
 * Cancun. Sin valor devuelve el guion largo.
 */
export const formatDateTime = (value) => {
  if (!value) return "—";

  return new Date(value).toLocaleString("es-MX", {
    timeZone: INVOICE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

/**
 * Fecha de hoy en `YYYY-MM-DD` para los filtros de rango.
 */
export const getTodayDateString = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Folio corto derivado del id, usado por ventas y por facturas sin serie.
 */
export const getShortFolio = (record) => {
  if (!record?.id) return "—";

  return record.id.slice(0, 8).toUpperCase();
};

/**
 * Folio completo de una factura: `SERIE-000001` cuando el PAC ya la asigno, y
 * el prefijo del id en las facturas internas que aun no lo tienen.
 */
export const getInvoiceFolio = (invoice) => {
  if (invoice?.serie && invoice?.folio) {
    return `${invoice.serie}-${String(invoice.folio).padStart(6, "0")}`;
  }

  return getShortFolio(invoice);
};

/**
 * Etiqueta de una sucursal a partir de cualquiera de los dos pares de columnas
 * con los que viaja en las relaciones embebidas.
 */
export const getBranchLabel = (branchData) => {
  if (!branchData) return "Sucursal no disponible";

  const code = branchData.code || branchData.branch_code || "";
  const name = branchData.name || branchData.branch_name || "";

  if (code && name) return `${code} - ${name}`;
  if (name) return name;
  if (code) return code;

  return "Sucursal no disponible";
};

/**
 * Etiqueta legible del estado de una factura segun su UUID y su cancelacion.
 */
export const getInvoiceStatusLabel = (invoice) => {
  if (invoice?.is_canceled) return "Cancelada";
  if (invoice?.uuid) return "Timbrada";
  return "Interna";
};

/**
 * Clave de la clase CSS Modules segun el estado de la factura. La clase se
 * resuelve en la vista para no arrastrar el modulo de estilos al formateador.
 */
export const getInvoiceStatusKey = (invoice) => {
  if (invoice?.is_canceled) return "canceled";
  if (invoice?.uuid) return "stamped";
  return "internal";
};

/**
 * Normaliza un telefono a sus 10 digitos.
 */
export const normalizePhoneDigits = (value) =>
  String(value || "")
    .replace(/\D/g, "")
    .slice(0, 10);

/**
 * Un cliente es facturable cuando tiene los datos fiscales completos y no esta
 * dado de baja.
 */
export const isFiscalCustomerComplete = (customer) =>
  !!customer?.id &&
  !!customer?.rfc &&
  !!customer?.razon_social &&
  !!customer?.tax_regime &&
  !!customer?.postal_code &&
  customer?.status !== false;

/**
 * Version sin `id`, para el badge de la tabla de ventas por facturar: ahi la
 * fila ya viene de una venta y no de un cliente.
 */
export const hasFiscalCustomerData = (customer) =>
  !!customer?.rfc &&
  !!customer?.razon_social &&
  !!customer?.tax_regime &&
  !!customer?.cfdi_use &&
  !!customer?.postal_code &&
  customer?.status !== false;
