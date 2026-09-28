/**
 * rewardsAvailabilityService.js
 * Consultas de la pantalla de disponibilidad de recompensas.
 */

import { supabase } from "../../../../../lib/supabaseClient";

const ACTIVE_REWARDS_COLUMNS = `
          id,
          name,
          description,
          points_required,
          is_active,
          reward_type,
          discount_type,
          discount_value
        `;

const POINTS_CUSTOMER_COLUMNS = `
          id,
          name,
          phone,
          email,
          status,
          is_points_customer,
          is_billing_customer,
          rfc,
          razon_social
        `;

/**
 * Recompensas que se pueden canjear, de menor a mayor requisito de puntos.
 */
export const fetchActiveRewards = async () => {
  const { data, error } = await supabase
    .from("rewards")
    .select(ACTIVE_REWARDS_COLUMNS)
    .eq("is_active", true)
    .order("points_required", { ascending: true })
    .order("name", { ascending: true, nullsFirst: false });

  if (error) throw error;

  return data || [];
};

/**
 * Clientes de puntos activos que coinciden con el termino de busqueda.
 */
export const searchActivePointsCustomers = async (searchTerm, limit = 20) => {
  const cleanSearch = String(searchTerm || "")
    .trim()
    .toLowerCase();
  const like = `%${cleanSearch}%`;

  const { data, error } = await supabase
    .from("customers")
    .select(POINTS_CUSTOMER_COLUMNS)
    .eq("status", true)
    .eq("is_points_customer", true)
    .or(`name.ilike.${like},phone.ilike.${like},email.ilike.${like}`)
    .order("name", { ascending: true, nullsFirst: false })
    .limit(limit);

  if (error) throw error;

  return data || [];
};

/**
 * Movimientos de puntos de un cliente, para derivar su saldo.
 */
export const fetchCustomerPointsMovements = async (customerId) => {
  const { data, error } = await supabase
    .from("customer_points")
    .select("points")
    .eq("customer_id", customerId);

  if (error) throw error;

  return data || [];
};
