/**
 * clientModalService.js
 * Consultas del modal de cliente de la venta: recompensas activas y busqueda de
 * clientes de puntos. El saldo sale de `customerPointsBalanceService`.
 */

import { supabase } from "../../../lib/supabaseClient";

const SEARCH_RESULTS_LIMIT = 12;

/**
 * Recompensas activas con sus productos, de menor a mayor costo en puntos.
 */
export const fetchActiveRewards = async () => {
  const { data, error } = await supabase
    .from("rewards")
    .select(
      `id, name, description, points_required, is_active, reward_type, reward_quantity, discount_type, discount_value, reward_products (id, product_id)`
    )
    .eq("is_active", true)
    .order("points_required", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;

  return data || [];
};

/**
 * Clientes de puntos activos cuyo nombre, telefono o correo contiene el termino.
 */
export const searchPointsCustomers = async (cleanSearch) => {
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, phone, email, status, is_points_customer")
    .eq("is_points_customer", true)
    .neq("status", false)
    .or(
      `name.ilike.%${cleanSearch}%,phone.ilike.%${cleanSearch}%,email.ilike.%${cleanSearch}%`
    )
    .order("name", { ascending: true })
    .limit(SEARCH_RESULTS_LIMIT);

  if (error) throw error;

  return data || [];
};
