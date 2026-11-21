/**
 * pointsHistoryService.js
 * Consultas del historial global de puntos de Clientes.
 */

import { supabase } from "../../../../../lib/supabaseClient";
import { fetchAllPages } from "../../../../../services/supabase/paginatedQuery";
import { sortByDateDesc } from "../../../../../utils/sortByDateDesc";

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
 * El resumen y los filtros se calculan en memoria sobre el historial completo,
 * por eso se leen todas las paginas en vez de paginar en servidor.
 */
export const fetchPointsMovements = async () => {
  const { data, error } = await fetchAllPages(() =>
    supabase.from("customer_points").select(POINTS_MOVEMENT_COLUMNS)
  );

  if (error) throw error;

  return sortByDateDesc(data);
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
