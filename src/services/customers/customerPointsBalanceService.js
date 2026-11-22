/**
 * customerPointsBalanceService.js
 * Saldo de puntos de clientes: suma de todos sus movimientos en `customer_points`.
 *
 * Es la unica lectura de saldo; un saldo leido sin paginar se subestima en
 * silencio cuando el cliente pasa de 1000 movimientos (tope de PostgREST).
 */

import { supabase } from "../../lib/supabaseClient";
import { fetchByIdsInBatches } from "../supabase/paginatedQuery";

/**
 * Saldo por cliente como `{ [customerId]: puntos }`. Los clientes sin
 * movimientos no aparecen en el mapa. Lanza el error de cualquier pagina.
 */
export const fetchPointsBalanceByCustomer = async (customerIds = []) => {
  const ids = [...new Set(customerIds.filter(Boolean))];

  if (ids.length === 0) return {};

  const { data, error } = await fetchByIdsInBatches(ids, (batch) =>
    supabase
      .from("customer_points")
      .select("id, customer_id, points")
      .in("customer_id", batch)
  );

  if (error) throw error;

  return data.reduce((balances, row) => {
    balances[row.customer_id] =
      (balances[row.customer_id] || 0) + Number(row.points || 0);
    return balances;
  }, {});
};

/**
 * Saldo de un cliente. Devuelve 0 sin id o sin movimientos.
 */
export const fetchCustomerPointsBalance = async (customerId) => {
  if (!customerId) return 0;

  const balances = await fetchPointsBalanceByCustomer([customerId]);

  return balances[customerId] || 0;
};
