import {
  useCallback,
  useMemo,
  useState,
} from "react";

const getProductId = (product) => {
  return (
    product?.product_id ??
    product?.id ??
    null
  );
};

const normalizeSearchValue = (value) => {
  return String(value ?? "")
    .trim()
    .toLowerCase();
};

const useInventorySearchResults = ({
  products = [],
  selectedProductIds = [],
  selectedIndex = -1,
} = {}) => {
  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const selectedIds =
    useMemo(() => {
      const source =
        Array.isArray(
          selectedProductIds
        )
          ? selectedProductIds
          : [];

      return new Set(
        source
          .filter(Boolean)
          .map(String)
      );
    }, [selectedProductIds]);

  const isAlreadySelected =
    useCallback(
      (product) => {
        const productId =
          getProductId(product);

        if (!productId) {
          return false;
        }

        return selectedIds.has(
          String(productId)
        );
      },
      [selectedIds]
    );

  const searchResults =
    useMemo(() => {
      const source =
        Array.isArray(products)
          ? products
          : [];

      const term =
        normalizeSearchValue(
          searchTerm
        );

      if (!term) {
        return source.slice(
          0,
          100
        );
      }

      return source
        .filter((product) => {
          const code =
            normalizeSearchValue(
              product?.codigo ??
                product?.barcode
            );

          const description =
            normalizeSearchValue(
              product?.descripcion ??
                product?.name
            );

          const department =
            normalizeSearchValue(
              product?.departamento ??
                product?.department_name
            );

          return (
            code.includes(term) ||
            description.includes(
              term
            ) ||
            department.includes(
              term
            )
          );
        })
        .slice(0, 100);
    }, [
      products,
      searchTerm,
    ]);

  const selectedProduct =
    selectedIndex >= 0
      ? searchResults[
          selectedIndex
        ] ?? null
      : null;

  const selectedProductIsOpen =
    selectedProduct
      ? isAlreadySelected(
          selectedProduct
        )
      : false;

  const handleSearchChange =
    useCallback((value) => {
      setSearchTerm(
        String(value ?? "")
      );
    }, []);

  const clearSearch =
    useCallback(() => {
      setSearchTerm("");
    }, []);

  return {
    searchTerm,
    searchResults,
    selectedProduct,
    selectedProductIsOpen,

    isAlreadySelected,
    handleSearchChange,
    clearSearch,
  };
};

export default useInventorySearchResults;