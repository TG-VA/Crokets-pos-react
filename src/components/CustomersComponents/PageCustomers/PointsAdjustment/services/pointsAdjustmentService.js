/**
 * pointsAdjustmentService.js
 * Consultas y mutaciones del ajuste manual de puntos, incluida la validacion del
 * perfil de administrador.
 */

import { supabase } from "../../../../../lib/supabaseClient";

const POINTS_CUSTOMER_COLUMNS =
  "id, name, phone, email, status, is_points_customer";

/**
 * Sesion del usuario autenticado.
 */
export const fetchCurrentAuthUser = async () => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;

  return user || null;
};

/**
 * Perfil del usuario con el nombre de su rol.
 */
export const fetchUserProfileWithRole = async (userId) => {
  const { data, error } = await supabase
    .from("users")
    .select(
      `
          id,
          status,
          roles (
            name
          )
        `
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  return data || null;
};

/**
 * Clientes de puntos activos que coinciden con el termino de busqueda.
 */
export const searchPointsCustomers = async (searchTerm, limit = 10) => {
  const cleanSearch = String(searchTerm || "").trim();

  if (cleanSearch.length < 2) return [];

  const { data, error } = await supabase
    .from("customers")
    .select(POINTS_CUSTOMER_COLUMNS)
    .eq("status", true)
    .eq("is_points_customer", true)
    .or(
      `name.ilike.%${cleanSearch}%,phone.ilike.%${cleanSearch}%,email.ilike.%${cleanSearch}%`
    )
    .order("name", { ascending: true, nullsFirst: false })
    .limit(limit);

  if (error) throw error;

  return data || [];
};

/**
 * Movimientos de puntos de un cliente. Devuelve `[]` sin consultar si no hay id.
 */
export const fetchCustomerPointMovements = async (customerId) => {
  if (!customerId) return [];

  const { data, error } = await supabase
    .from("customer_points")
    .select("points")
    .eq("customer_id", customerId);

  if (error) throw error;

  return data || [];
};

/**
 * Inserta el movimiento de ajuste manual ya firmado (positivo suma, negativo resta).
 */
export const insertPointsMovement = async (payload) => {
  const { error } = await supabase.from("customer_points").insert([payload]);

  if (error) throw error;
};
