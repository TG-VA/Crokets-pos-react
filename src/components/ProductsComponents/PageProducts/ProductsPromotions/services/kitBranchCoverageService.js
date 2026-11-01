import { supabase } from "../../../../../lib/supabaseClient";
import { computeMissingBranches } from "./kitBranchCoverageCalculationService";

export const fetchMissingBranchesForProduct = async (productId) => {
  const [branchesResult, inventoryResult] = await Promise.all([
    supabase
      .from("branches")
      .select("id, name")
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("branch_inventory")
      .select("branch_id, is_active")
      .eq("product_id", productId),
  ]);

  if (branchesResult.error) throw branchesResult.error;
  if (inventoryResult.error) throw inventoryResult.error;

  return computeMissingBranches(branchesResult.data, inventoryResult.data);
};
