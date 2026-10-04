/**
 * pointsHistoryService.js
 * Consultas del historial global de puntos de Clientes.
 */

import { supabase } from "../../../../../lib/supabaseClient";

const POINTS_MOVEMENT_COLUMNS = `
          *,
          customers:customer_id (
            id,
            name,
            phone,
            email
          ),
          rewards:reward_id (
            id,
            name
          ),
          users:user_id (
            id,
            username
          ),
          branches:branch_id (
            id,
            name,
            code
          )
        `;

/**
 * Movimientos de puntos con sus relaciones, del mas reciente al mas antiguo.
 */
export const fetchPointsMovements = async () => {
  const { data, error } = await supabase
    .from("customer_points")
    .select(POINTS_MOVEMENT_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data || [];
};

/**
 * Sucursales para el filtro de la tabla.
 */
export const fetchBranches = async () => {
  const { data, error } = await supabase
    .from("branches")
    .select("id, name, code, state")
    .order("name", { ascending: true });

  if (error) throw error;

  return data || [];
};
