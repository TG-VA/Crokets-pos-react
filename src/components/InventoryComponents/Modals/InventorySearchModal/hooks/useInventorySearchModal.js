import { useCallback, useRef, useState } from "react";

import useInventorySearchKeyboard from "./useInventorySearchKeyboard";
import useInventorySearchResults from "./useInventorySearchResults";
import { useDidChange } from "../../../../../hooks/useDidChange";

const useInventorySearchModal = ({
  isOpen = false,
  products = [],
  selectedProductIds = [],
  restrictLocalProducts = false,
  onClose,
  onSelect,
} = {}) => {
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const resultsListRef = useRef(null);

  const {
    searchTerm,
    searchResults,
    selectedProduct,
    selectedProductIsOpen,
    selectedProductIsDisabled,
    belowMinimumOnly,
    setBelowMinimumOnly,
    clearBelowMinimumFilter,

    isAlreadySelected,
    isProductDisabled,
    handleSearchChange: updateSearchTerm,
    clearSearch,
  } = useInventorySearchResults({
    products,
    selectedProductIds,
    selectedIndex,
    restrictLocalProducts,
  });

  const resetSearch = useCallback(() => {
    clearSearch();
    clearBelowMinimumFilter();
    setSelectedIndex(-1);
  }, [clearBelowMinimumFilter, clearSearch]);

  const handleClose = useCallback(() => {
    resetSearch();
    onClose?.();
  }, [onClose, resetSearch]);

  const handleSelectProduct = useCallback(
    (product) => {
      if (
        !product ||
        isProductDisabled(product) ||
        isAlreadySelected(product)
      ) {
        return false;
      }

      const wasSelected = onSelect?.(product);

      if (wasSelected === false) {
        return false;
      }

      handleClose();

      return true;
    },
    [handleClose, isAlreadySelected, isProductDisabled, onSelect]
  );

  const handleProductClick = useCallback(
    (product, index) => {
      if (isProductDisabled(product)) {
        return false;
      }

      setSelectedIndex(index);

      if (isAlreadySelected(product)) {
        return false;
      }

      return handleSelectProduct(product);
    },
    [handleSelectProduct, isAlreadySelected, isProductDisabled]
  );

  const handleSearchChange = useCallback(
    (value) => {
      updateSearchTerm(value);

      setSelectedIndex(-1);
    },
    [updateSearchTerm]
  );

  // La busqueda se limpia al abrir el modal, resuelto durante el render.
  if (useDidChange(isOpen) && isOpen) {
    resetSearch();
  }

  // El indice se recorta dentro del rango de resultados durante el render, en
  // lugar de un efecto que lo corregiria un render despues.
  if (selectedIndex >= searchResults.length) {
    setSelectedIndex(searchResults.length > 0 ? searchResults.length - 1 : -1);
  }

  useInventorySearchKeyboard({
    isOpen,
    searchResults,
    selectedIndex,
    setSelectedIndex,
    resultsListRef,
    isAlreadySelected,
    onClose: handleClose,
    onSelect: handleSelectProduct,
  });

  return {
    searchTerm,
    selectedIndex,
    searchResults,
    selectedProduct,
    selectedProductIsOpen,
    selectedProductIsDisabled,
    belowMinimumOnly,
    setBelowMinimumOnly,
    resultsListRef,

    setSelectedIndex,

    isAlreadySelected,
    isProductDisabled,
    handleSearchChange,
    handleProductClick,
    handleSelectProduct,
    handleClose,
  };
};

export default useInventorySearchModal;
