/**
 * invoiceCustomersCalculationService.js
 * Derivaciones puras de la administracion de clientes fiscales.
 *
 * Servicio puro: sin React, sin Supabase y sin I/O. Concentra el orden por
 * estado y razon social, el filtrado de la tabla y la deteccion del cliente de
 * puntos que aun no es cliente fiscal.
 */

import { normalizePhoneDigits } from "../../../utils/invoiceFormatters";

/**
 * Clave de orden del cliente: razon social, nombre comercial o RFC.
 */
export const getCustomerSortName = (customer) =>
  String(
    customer.razon_social || customer.name || customer.rfc || "SIN RAZÓN SOCIAL"
  ).trim();

/**
 * Nombre con el que se identifica al cliente en confirmaciones y avisos.
 */
export const getCustomerDisplayName = (customer) =>
  customer?.razon_social ||
  customer?.name ||
  customer?.rfc ||
  "SIN RAZÓN SOCIAL";

/**
 * Etiqueta de estado de la tabla.
 */
export const formatCustomerStatus = (status) =>
  status === false ? "INACTIVO" : "ACTIVO";

/**
 * Ordena por estado primero (activos antes que inactivos) y despues por razon
 * social, con comparacion insensible a mayusculas y acentos.
 *
 * No muta la lista recibida: devuelve una copia ordenada.
 */
export const sortCustomersByStatusAndName = (customersList = []) =>
  [...customersList].sort((a, b) => {
    const statusA = a.status === false ? 1 : 0;
    const statusB = b.status === false ? 1 : 0;

    if (statusA !== statusB) {
      return statusA - statusB;
    }

    return getCustomerSortName(a).localeCompare(getCustomerSortName(b), "es", {
      sensitivity: "base",
      numeric: true,
    });
  });

/**
 * Filtra por estado y por texto libre sobre los campos con los que se busca en
 * la tabla, y vuelve a aplicar el orden.
 */
export const filterInvoiceCustomers = (customers, searchTerm, statusFilter) => {
  const search = searchTerm.trim().toLowerCase();

  const filtered = customers.filter((customer) => {
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && customer.status !== false) ||
      (statusFilter === "inactive" && customer.status === false);

    if (!matchesStatus) return false;

    if (!search) return true;

    const values = [
      customer.rfc,
      customer.razon_social,
      customer.name,
      customer.phone,
      customer.fiscal_email,
      customer.email,
      customer.postal_code,
      customer.tax_regime,
      customer.cfdi_use,
    ];

    return values.some((value) =>
      String(value || "")
        .toLowerCase()
        .includes(search)
    );
  });

  return sortCustomersByStatusAndName(filtered);
};

/**
 * Indice `id -> descripcion` de un catalogo del SAT, para pintar la
 * descripcion del regimen y del uso de CFDI junto a su clave.
 */
export const buildCatalogMap = (catalog = []) => {
  const map = {};

  for (const item of catalog) {
    map[item.id] = item.description;
  }

  return map;
};

/**
 * Un telefono de diez digitos ya esta dado de alta como cliente fiscal: no hay
 * que buscarlo en el modulo de puntos ni ofrecer convertirlo.
 */
export const isPhoneAlreadyFiscalCustomer = (customers, phone) => {
  const target = normalizePhoneDigits(phone);

  if (!target) return false;

  return customers.some(
    (customer) => normalizePhoneDigits(customer.phone) === target
  );
};

/**
 * Prepara el cliente de puntos para abrir el modal de datos fiscales sobre el,
 * sin duplicar el registro: se completa lo que la tabla de puntos no trae.
 */
export const buildPointsCustomerForFiscalModal = (pointsCustomer) => ({
  ...pointsCustomer,
  razon_social: pointsCustomer.razon_social || "",
  phone: pointsCustomer.phone || "",
  fiscal_email: pointsCustomer.fiscal_email || pointsCustomer.email || "",
  status: pointsCustomer.status !== false,
});

/**
 * Texto de confirmacion para activar o desactivar un cliente fiscal.
 */
export const buildStatusConfirmMessage = (customer, nextStatus) =>
  `¿Seguro que deseas ${
    nextStatus ? "activar" : "desactivar"
  } al cliente fiscal "${getCustomerDisplayName(customer)}"?`;

/**
 * Texto de exito tras activar o desactivar un cliente fiscal.
 */
export const buildStatusSuccessMessage = (customer, nextStatus) =>
  `El cliente fiscal "${getCustomerDisplayName(
    customer
  )}" fue ${nextStatus ? "activado" : "desactivado"} correctamente.`;

/**
 * Texto del aviso de autorizacion administrativa al desactivar.
 */
export const buildAdminAuthMessage = (customer) =>
  customer
    ? `Para desactivar al cliente fiscal "${getCustomerDisplayName(
        customer
      )}", se requiere autorización de un administrador.`
    : "Para desactivar este cliente fiscal, se requiere autorización de un administrador.";
