import {
  useBranch,
} from "../../../../../contexts/BranchContext";

import {
  useProducts,
} from "../../../../../contexts/ProductsContext";

import useKardexDateRange from "./useKardexDateRange";
import useKardexMovements from "./useKardexMovements";
import useKardexProducts from "./useKardexProducts";

const useKardex = () => {
  const {
    kardexProducts:
      contextKardexProducts,
  } = useProducts();

  const {
    branch,
  } = useBranch();

  const branchId =
    branch?.id ?? null;

  const productSelection =
    useKardexProducts({
      products:
        contextKardexProducts,
    });

  const {
    products:
      branchKardexProducts,
    selectedProducts,
    selectedProductIds,
  } = productSelection;

  const dateRange =
    useKardexDateRange();

  const {
    appliedDateFrom,
    appliedDateTo,
    filterVersion,
  } = dateRange;

  const movementData =
    useKardexMovements({
      branchId,
      selectedProducts,
      selectedProductIds,
      appliedDateFrom,
      appliedDateTo,
      filterVersion,
    });

  return {
    ...productSelection,
    ...dateRange,
    ...movementData,

    products:
      branchKardexProducts,

    branch,
    branchId,
  };
};

export default useKardex;