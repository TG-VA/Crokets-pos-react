import { supabase } from "../../../../../lib/supabaseClient";
import { fetchOperationalBranches } from "../../../../../services/branchScopeService";
import { fetchByIdsInBatches } from "../../../../../services/supabase/paginatedQuery";
import {
  computeMissingBranches,
  groupBranchNamesByProduct,
} from "./kitBranchCoverageCalculationService";

export const fetchMissingBranchesForProduct = async (productId) => {
  const [branchesResult, inventoryResult] = await Promise.all([
    fetchOperationalBranches({ columns: "id, name", activeOnly: true }),
    supabase
      .from("branch_inventory")
      .select("branch_id, is_active")
      .eq("product_id", productId),
  ]);

  if (branchesResult.error) throw branchesResult.error;
  if (inventoryResult.error) throw inventoryResult.error;

  return computeMissingBranches(branchesResult.data, inventoryResult.data);
};

export const fetchBranchNamesByProduct = async (productIds) => {
  if (!productIds || productIds.length === 0) return {};

  // Cada producto tiene una fila por sucursal: un lote de kits pasa pronto de
  // 1000 filas de inventario.
  const { data, error } = await fetchByIdsInBatches(productIds, (batch) =>
    supabase
      .from("branch_inventory")
      .select("id, product_id, is_active, branches:branch_id (name, is_active)")
      .in("product_id", batch)
  );

  if (error) throw error;
  return groupBranchNamesByProduct(data);
};
