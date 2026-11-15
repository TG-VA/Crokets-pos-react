import { supabase } from "../lib/supabaseClient";
import { BRANCH_TYPES } from "./branchScopeCalculationService";

/**
 * Fuente unica de las consultas de sucursales por alcance. Ningun otro modulo debe filtrar por
 * branch_type directamente.
 */
export {
  BRANCH_TYPES,
  isAdminBranch,
  isOperationalBranch,
} from "./branchScopeCalculationService";

const DEFAULT_COLUMNS = "id, name, code";

const runBranchesQuery = async ({
  columns = DEFAULT_COLUMNS,
  activeOnly = false,
  operationalOnly,
}) => {
  let query = supabase.from("branches").select(columns);
  if (operationalOnly) {
    query = query.eq("branch_type", BRANCH_TYPES.OPERATIONAL);
  }
  if (activeOnly) query = query.eq("is_active", true);

  const { data, error } = await query.order("name", { ascending: true });
  return { data: data || [], error: error || null };
};

/** Sucursales con stock y ventas. Devuelve `{ data, error }`; data siempre es arreglo. */
export const fetchOperationalBranches = (options = {}) =>
  runBranchesQuery({ ...options, operationalOnly: true });

/** Todas las sucursales, incluidas las admin (ajustes, login, perfil de terminal). */
export const fetchAllBranches = (options = {}) =>
  runBranchesQuery({ ...options, operationalOnly: false });

/**
 * Tipo vigente de una sucursal. Sirve para refrescar la sucursal en cache del dispositivo, que
 * puede venir de antes de branch_type o de un cambio de tipo. Nunca lanza: `{ data, error }`.
 */
export const fetchBranchType = async (branchId) => {
  try {
    const { data, error } = await supabase
      .from("branches")
      .select("branch_type")
      .eq("id", branchId)
      .maybeSingle();
    return { data: data?.branch_type ?? null, error: error || null };
  } catch (error) {
    return { data: null, error };
  }
};
