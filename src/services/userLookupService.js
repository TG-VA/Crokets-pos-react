import { supabase } from "../lib/supabaseClient";
import {
  getCachedValue,
  isMissingColumnError,
  setCachedValue,
} from "../components/InventoryComponents/PageInventory/PageMovementsReport/services/movementServiceUtils";
import { fetchByIdsInBatches } from "./supabase/paginatedQuery";

// Se conserva la clave historica para no invalidar el select ya cacheado.
const USERS_SELECT_KEY = "movementsReportUsersSelect_v1";

/**
 * Carga usuarios por id en lotes. Prueba primero el select cacheado y luego
 * selects mas pequenos si la tabla no tiene alguna columna.
 */
export const loadUsers = async (userIds) => {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return [];
  }

  const cachedSelect = getCachedValue(USERS_SELECT_KEY);

  const candidates = [cachedSelect, "id, username", "id"].filter(Boolean);

  for (const selectFields of candidates) {
    const response = await fetchByIdsInBatches(userIds, (batch) =>
      supabase.from("users").select(selectFields).in("id", batch)
    );

    if (!response.error) {
      setCachedValue(USERS_SELECT_KEY, selectFields);

      return Array.isArray(response.data) ? response.data : [];
    }

    if (isMissingColumnError(response.error)) {
      continue;
    }

    throw response.error;
  }

  return [];
};
