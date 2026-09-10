import { useEffect, useState } from "react";
import { supabase } from "../../../../../lib/supabaseClient";

const useInventoryBranchDetails = (selectedBranchId) => {
  const [expandedProductId, setExpandedProductId] = useState(null);
  const [otherStocksByProduct, setOtherStocksByProduct] = useState({});
  const [loadingDetailsByProduct, setLoadingDetailsByProduct] =
    useState({});
  const [detailsErrorByProduct, setDetailsErrorByProduct] =
    useState({});

  useEffect(() => {
    setExpandedProductId(null);
    setOtherStocksByProduct({});
    setLoadingDetailsByProduct({});
    setDetailsErrorByProduct({});
  }, [selectedBranchId]);

  const clearExpandedProduct = () => {
    setExpandedProductId(null);
  };

  const handleToggleOtherStocks = async (productId) => {
    if (!productId || !selectedBranchId) return;

    if (expandedProductId === productId) {
      setExpandedProductId(null);
      return;
    }

    setExpandedProductId(productId);

    if (
      Object.prototype.hasOwnProperty.call(
        otherStocksByProduct,
        productId
      ) ||
      loadingDetailsByProduct[productId]
    ) {
      return;
    }

    setLoadingDetailsByProduct((previous) => ({
      ...previous,
      [productId]: true,
    }));

    setDetailsErrorByProduct((previous) => ({
      ...previous,
      [productId]: "",
    }));

    try {
      const selectCandidates = [
        `
          id,
          branch_id,
          stock,
          min_stock,
          max_stock,
          is_active,
          branches:branch_id(
            id,
            name,
            code
          )
        `,
        `
          id,
          branch_id,
          stock,
          min_stock,
          max_stock,
          is_active,
          branches(
            id,
            name,
            code
          )
        `,
      ];

      let detailRows = [];
      let lastError = null;

      for (const selectClause of selectCandidates) {
        const baseQuery = supabase
          .from("branch_inventory")
          .select(selectClause)
          .eq("product_id", productId)
          .neq("branch_id", selectedBranchId)
          .or("is_active.eq.true,has_been_stocked.eq.true,stock.gt.0")
          .order("created_at", { ascending: false });

        const result = await baseQuery;

        if (result.error) {
          lastError = result.error;
          continue;
        }

        detailRows = result.data ?? [];
        lastError = null;
        break;
      }

      if (lastError) {
        throw lastError;
      }

      setOtherStocksByProduct((previous) => ({
        ...previous,
        [productId]: detailRows,
      }));
    } catch (detailsError) {
      console.error(
        "Error cargando otras sucursales:",
        detailsError
      );

      setOtherStocksByProduct((previous) => ({
        ...previous,
        [productId]: [],
      }));

      setDetailsErrorByProduct((previous) => ({
        ...previous,
        [productId]:
          "No se pudo cargar stock de otras sucursales.",
      }));
    } finally {
      setLoadingDetailsByProduct((previous) => ({
        ...previous,
        [productId]: false,
      }));
    }
  };

  return {
    expandedProductId,
    otherStocksByProduct,
    loadingDetailsByProduct,
    detailsErrorByProduct,
    clearExpandedProduct,
    handleToggleOtherStocks,
  };
};

export default useInventoryBranchDetails;