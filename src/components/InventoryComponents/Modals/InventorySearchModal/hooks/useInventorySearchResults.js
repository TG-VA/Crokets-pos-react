import { useCallback, useMemo, useState } from "react";

import {
  filterInventorySearchProducts,
  getProductStock,
  isGlobalProduct,
  isInventoryTrackedProduct,
  isKitProduct,
} from "../../../../../services/inventory/inventoryProductCalculationService";

const getProductId = (product) => {
  return product?.product_id ?? product?.id ?? null;
};

const useInventorySearchResults = ({
  products = [],
  selectedProductIds = [],
  selectedIndex = -1,
  restrictLocalProducts = false,
  showStock = false,
} = {}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const selectedIds = useMemo(() => {
    const source = Array.isArray(selectedProductIds) ? selectedProductIds : [];

    return new Set(source.filter(Boolean).map(String));
  }, [selectedProductIds]);

  const isAlreadySelected = useCallback(
    (product) => {
      const productId = getProductId(product);

      if (!productId) {
        return false;
      }

      return selectedIds.has(String(productId));
    },
    [selectedIds]
  );

  // Motivo por el que un producto no se puede agregar. El motivo local tiene
  // prioridad porque es el unico que se puede resolver con doble clic.
  const getDisabledReason = useCallback(
    (product) => {
      if (restrictLocalProducts && !isGlobalProduct(product)) {
        return "local";
      }

      if (showStock && getProductStock(product) <= 0) {
        return "outOfStock";
      }

      return null;
    },
    [restrictLocalProducts, showStock]
  );

  const isProductDisabled = useCallback(
    (product) => getDisabledReason(product) !== null,
    [getDisabledReason]
  );

  const searchResults = useMemo(
    // Un kit o un producto sin inventario no tiene existencias propias, por lo
    // que ningun flujo del buscador (pedidos, ajustes, traspasos, kardex,
    // altas) debe ofrecerlo.
    () =>
      filterInventorySearchProducts(
        products.filter(
          (product) =>
            !isKitProduct(product) && isInventoryTrackedProduct(product)
        ),
        { searchTerm }
      ).slice(0, 100),
    [products, searchTerm]
  );

  const selectedProduct =
    selectedIndex >= 0 ? (searchResults[selectedIndex] ?? null) : null;

  const selectedProductIsOpen = selectedProduct
    ? isAlreadySelected(selectedProduct)
    : false;

  const selectedProductIsDisabled = selectedProduct
    ? isProductDisabled(selectedProduct)
    : false;

  const selectedProductDisabledReason = selectedProduct
    ? getDisabledReason(selectedProduct)
    : null;

  const handleSearchChange = useCallback((value) => {
    setSearchTerm(String(value ?? ""));
  }, []);

  const clearSearch = useCallback(() => {
    setSearchTerm("");
  }, []);

  return {
    searchTerm,
    searchResults,
    selectedProduct,
    selectedProductIsOpen,
    selectedProductIsDisabled,
    selectedProductDisabledReason,
    isAlreadySelected,
    isProductDisabled,
    getDisabledReason,
    handleSearchChange,
    clearSearch,
  };
};

export default useInventorySearchResults;
