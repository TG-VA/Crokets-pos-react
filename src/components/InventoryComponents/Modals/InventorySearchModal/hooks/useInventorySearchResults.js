import { useCallback, useMemo, useState } from "react";

import {
  filterInventorySearchProducts,
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

  const isProductDisabled = useCallback(
    (product) => restrictLocalProducts && !isGlobalProduct(product),
    [restrictLocalProducts]
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
    isAlreadySelected,
    isProductDisabled,
    handleSearchChange,
    clearSearch,
  };
};

export default useInventorySearchResults;
