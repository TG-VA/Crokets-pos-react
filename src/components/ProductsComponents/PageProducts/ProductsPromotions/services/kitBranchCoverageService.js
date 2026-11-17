import { supabase } from "../../../../../lib/supabaseClient";
import { fetchOperationalBranches } from "../../../../../services/branchScopeService";
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

  const { data, error } = await supabase
    .from("branch_inventory")
    .select("product_id, is_active, branches:branch_id (name, is_active)")
    .in("product_id", productIds);

  if (error) throw error;
  return groupBranchNamesByProduct(data);
};
