/**
 * customersListCalculationService.js
 * Calculos puros del listado de clientes: filtrado,
 * ordenamiento y etiquetas. Sin I/O, sin React y sin Supabase.
 */

import { normalizePhoneDigits } from "../../utils/customerFormatters";

const PHONE_LIKE_PATTERN = /^[\d\s()+.-]+$/;

/**
 * Filtra por estado y busqueda libre, y ordena inactivos al final y por nombre.
 * Si el termino tiene forma de telefono (solo digitos y separadores) tambien
 * compara el telefono solo por digitos, para que "55-1234-5678" encuentre
 * "5512345678". Un termino de texto con digitos ("juan2") no usa esa rama.
 */
export const filterAndSortCustomers = ({
  customers = [],
  searchTerm = "",
  statusFilter = "all",
} = {}) => {
  const search = searchTerm.trim().toLowerCase();
  // Sin digitos queda vacio y no se compara: "" coincidiria con todos.
  const searchDigits = PHONE_LIKE_PATTERN.test(search)
    ? normalizePhoneDigits(search)
    : "";

  return customers
    .filter((customer) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && customer.status !== false) ||
        (statusFilter === "inactive" && customer.status === false);

      if (!matchesStatus) return false;

      if (!search) return true;

      const values = [customer.name, customer.phone, customer.email];

      const matchesText = values.some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(search)
      );

      if (matchesText) return true;

      return (
        searchDigits !== "" &&
        normalizePhoneDigits(customer.phone).includes(searchDigits)
      );
    })
    .sort((a, b) => {
      const statusA = a.status === false ? 1 : 0;
      const statusB = b.status === false ? 1 : 0;

      if (statusA !== statusB) {
        return statusA - statusB;
      }

      return String(a.name || "SIN NOMBRE").localeCompare(
        String(b.name || "SIN NOMBRE"),
        "es",
        { sensitivity: "base" }
      );
    });
};

/**
 * Etiqueta de estado de la tabla. Solo `status === false` es inactivo.
 */
export const formatCustomerStatus = (status) =>
  status === false ? "INACTIVO" : "ACTIVO";

/**
 * Adapta un cliente fiscal encontrado a la forma que espera `CustomerModal`.
 */
export const buildPointsCustomerFromFiscal = (fiscalCustomer) => {
  if (!fiscalCustomer?.id) return null;

  return {
    ...fiscalCustomer,
    name: fiscalCustomer.name || fiscalCustomer.razon_social || "",
    email: fiscalCustomer.email || "",
    phone: fiscalCustomer.phone || "",
    status: fiscalCustomer.status !== false,
  };
};

/**
 * Un telefono solo es candidato a busqueda fiscal cuando tiene 10 digitos.
 */
export const isCompletePhone = (phone) => String(phone || "").length === 10;

/**
 * `true` si ningun cliente de puntos usa ya ese telefono.
 *
 * @param {object} params
 * @param {Array<{phone?: string}>} params.customers Clientes de puntos ya cargados.
 * @param {string} params.phone Telefono de 10 digitos a comprobar.
 */
export const isPhoneAvailableInPoints = ({ customers = [], phone }) => {
  const normalizedPhone = normalizePhoneDigits(phone);

  return !customers.some(
    (customer) => normalizePhoneDigits(customer.phone) === normalizedPhone
  );
};
