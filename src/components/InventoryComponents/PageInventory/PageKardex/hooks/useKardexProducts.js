import {
  useCallback,
  useMemo,
} from "react";

import {
  filterBranchKardexProducts,
} from "../utils/kardexProductUtils";

import useKardexProductSearch from "./useKardexProductSearch";
import useKardexProductSelection from "./useKardexProductSelection";
import useKardexProductShortcuts from "./useKardexProductShortcuts";

const useKardexProducts = ({
  products = [],
} = {}) => {
  const branchKardexProducts =
    useMemo(() => {
      return filterBranchKardexProducts(
        products
      );
    }, [products]);

  const productSelection =
    useKardexProductSelection({
      products:
        branchKardexProducts,
    });

  const {
    selectedProducts,
    selectedProductIds,

    selectProduct,
    removeProduct,
    clearSelectedProducts,
    getNextAvailableSlot,
  } = productSelection;

  const productSearch =
    useKardexProductSearch({
      products:
        branchKardexProducts,

      selectedProducts,
      selectProduct,
      getNextAvailableSlot,
    });

  const {
    modalTargetSlot,
    searchModalOpen,
    barcode,

    setBarcode,
    setModalTargetSlot,

    openProductSearch,
    closeProductSearch,
    resetProductSearch,

    findProductByBarcode,
    selectProductFromSearch,
    searchBarcode,
  } = productSearch;

  useKardexProductShortcuts({
    onOpenProductSearch:
      openProductSearch,
  });

  const clearProducts =
    useCallback(() => {
      clearSelectedProducts();
      resetProductSearch();
    }, [
      clearSelectedProducts,
      resetProductSearch,
    ]);

  return {
    products:
      branchKardexProducts,

    selectedProducts,
    selectedProductIds,

    modalTargetSlot,
    searchModalOpen,
    barcode,

    setBarcode,
    setModalTargetSlot,

    openProductSearch,
    closeProductSearch,

    selectProduct:
      selectProductFromSearch,

    removeProduct,
    clearProducts,

    findProductByBarcode,
    searchBarcode,
    getNextAvailableSlot,
  };
};

export default useKardexProducts;