/**
 * customersListCalculationService.js
 * Calculos puros del listado de clientes: saldo de puntos por cliente, filtrado,
 * ordenamiento y etiquetas. Sin I/O, sin React y sin Supabase.
 */

import { normalizePhoneDigits } from "../../utils/customerFormatters";

/**
 * Tipos de movimiento que descuentan puntos.
 *
 * La base de datos solo admite `earn` y `redeem` (CHECK en `customer_points`),
 * y los canjes se guardan con `points` negativo. El `Math.abs` mantiene el
 * resultado correcto aun si algun movimiento llegara con signo positivo.
 */
const REDEEMING_MOVEMENT_MARKERS = ["canje", "redeem", "used", "uso", "resta"];

/**
 * Red de seguridad: clasifica el signo de un movimiento a partir de su tipo.
 */
const isRedeemingMovement = (movementType) => {
  const normalizedType = String(movementType || "").toLowerCase();

  return REDEEMING_MOVEMENT_MARKERS.some((marker) =>
    normalizedType.includes(marker)
  );
};

/**
 * Calcula el saldo de puntos indexado por `customer_id`.
 *
 * Los movimientos que gastan puntos se restan por valor absoluto; el resto se
 * suman con su signo, de modo que un `earn` negativo (reversion) tambien descuenta.
 *
 * @param {Array<{customer_id?: string, points?: number, movement_type?: string}>} pointsRows
 * @returns {Record<string, number>} Mapa `customer_id` -> saldo.
 */
export const calculatePointsBalanceByCustomer = (pointsRows = []) => {
  const pointsMap = {};

  for (const row of pointsRows) {
    const customerId = row.customer_id;
    const rawPoints = Number(row.points || 0);

    if (!customerId) continue;

    if (!pointsMap[customerId]) {
      pointsMap[customerId] = 0;
    }

    if (isRedeemingMovement(row.movement_type)) {
      pointsMap[customerId] -= Math.abs(rawPoints);
    } else {
      pointsMap[customerId] += rawPoints;
    }
  }

  return pointsMap;
};

/**
 * Filtra por estado y busqueda libre, y ordena inactivos al final y por nombre.
 */
export const filterAndSortCustomers = ({
  customers = [],
  searchTerm = "",
  statusFilter = "all",
} = {}) => {
  const search = searchTerm.trim().toLowerCase();

  return customers
    .filter((customer) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && customer.status !== false) ||
        (statusFilter === "inactive" && customer.status === false);

      if (!matchesStatus) return false;

      if (!search) return true;

      const values = [customer.name, customer.phone, customer.email];

      return values.some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(search)
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
