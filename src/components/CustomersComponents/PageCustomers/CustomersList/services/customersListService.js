/**
 * customersListService.js
 * Consultas y mutaciones de la tabla de clientes del modulo de Puntos.
 *
 * Solo este archivo conoce el cliente de Supabase y la forma de las tablas
 * `customers` y `customer_points` (DIP, AGENTS.md).
 */

import { supabase } from "../../../../../lib/supabaseClient";
import {
  fetchAllPages,
  fetchByIdsInBatches,
} from "../../../../../services/supabase/paginatedQuery";

const POINTS_CUSTOMER_COLUMNS = `
          id,
          name,
          phone,
          email,
          status,
          is_billing_customer,
          is_points_customer,
          created_at,
          updated_at
        `;

const FISCAL_CUSTOMER_COLUMNS = `
          id,
          name,
          phone,
          email,
          rfc,
          razon_social,
          fiscal_email,
          status,
          is_billing_customer,
          is_points_customer
        `;

/**
 * Clientes de puntos habilitados. Se leen por paginas sobre id; el orden de la
 * tabla lo aplica `filterAndSortCustomers` en memoria.
 */
export const fetchPointsCustomers = async () => {
  const { data, error } = await fetchAllPages(() =>
    supabase
      .from("customers")
      .select(POINTS_CUSTOMER_COLUMNS)
      .eq("is_points_customer", true)
  );

  if (error) throw error;

  return data || [];
};

/**
 * Movimientos de puntos de un conjunto de clientes. Devuelve `[]` sin tocar la
 * base cuando la lista de clientes es vacia.
 */
export const fetchPointsMovements = async (customerIds = []) => {
  if (customerIds.length === 0) return [];

  // Los saldos suman todos los movimientos: un lote truncado los subestima.
  const { data, error } = await fetchByIdsInBatches(customerIds, (batch) =>
    supabase
      .from("customer_points")
      .select("id, customer_id, points, movement_type")
      .in("customer_id", batch)
  );

  if (error) throw error;

  return data || [];
};

/**
 * Cliente fiscal con el mismo telefono que todavia no es cliente de puntos, para
 * ofrecerlo como alta sin duplicar el registro.
 */
export const searchFiscalCustomerByPhone = async (phone) => {
  const { data, error } = await supabase
    .from("customers")
    .select(FISCAL_CUSTOMER_COLUMNS)
    .eq("phone", phone)
    .eq("is_billing_customer", true)
    .or("is_points_customer.is.null,is_points_customer.eq.false")
    .maybeSingle();

  if (error) throw error;

  return data || null;
};

/**
 * Activa o desactiva un cliente de puntos.
 */
export const updateCustomerStatus = async ({ customerId, nextStatus }) => {
  const { error } = await supabase
    .from("customers")
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", customerId);

  if (error) throw error;
};
