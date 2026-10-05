import { useCallback, useEffect, useMemo, useState } from "react";

import { filterTransferProducts } from "../utils/transfersUtils";

const useProductLookup = ({
  products,
  activeTab,
  getProductByCodigo,
  clearFeedback,
  setError,
  onProductSelected,
  resetAfterSelection,
}) => {
  const [productSearch, setProductSearch] = useState("");
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  const searchableProducts = useMemo(() => {
    return filterTransferProducts({
      products,
      searchTerm: "",
    });
  }, [products]);

  const openSearchModal = useCallback(() => {
    setSearchModalOpen(true);
  }, []);

  const closeSearchModal = useCallback(() => {
    setSearchModalOpen(false);
  }, []);

  const clearLookupSelection = useCallback(() => {
    setProductSearch("");
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (event) => {
      if (event.key !== "F10") {
        return;
      }

      if (activeTab !== "send") {
        return;
      }

      event.preventDefault();
      openSearchModal();
    };

    document.addEventListener("keydown", handleGlobalKeyDown);

    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [activeTab, openSearchModal]);

  const handleLookupProductSearchChange = useCallback((value) => {
    setProductSearch(value);
  }, []);

  const handleLookupProduct = useCallback(() => {
    const cleanSearch = String(productSearch || "").trim();

    if (!cleanSearch) {
      setError("Escanea o escribe un código, o presiona F10 para buscar.");
      return;
    }

    const byCode = getProductByCodigo(cleanSearch);
    if (byCode) {
      setError("");
      onProductSelected(byCode, 1);
      if (typeof resetAfterSelection === "function") {
        resetAfterSelection();
      }
      return;
    }

    const searchKey = cleanSearch.trim().toLowerCase();
    const searchTokens = searchKey.split(/\s+/).filter(Boolean);

    const exactMatch = searchableProducts.find(
      (product) =>
        String(product?.descripcion || "")
          .trim()
          .toLowerCase() === searchKey
    );
    if (exactMatch) {
      setError("");
      onProductSelected(exactMatch, 1);
      if (typeof resetAfterSelection === "function") {
        resetAfterSelection();
      }
      return;
    }

    const partialMatches = searchableProducts.filter((product) => {
      const desc = String(product?.descripcion || "")
        .trim()
        .toLowerCase();
      const dept = String(product?.departamento || "")
        .trim()
        .toLowerCase();
      const code = String(product?.codigo || "")
        .trim()
        .toLowerCase();

      if (searchTokens.length === 0) return false;

      return searchTokens.every(
        (token) =>
          code.includes(token) || desc.includes(token) || dept.includes(token)
      );
    });

    if (partialMatches.length === 1) {
      setError("");
      onProductSelected(partialMatches[0], 1);
      if (typeof resetAfterSelection === "function") {
        resetAfterSelection();
      }
      return;
    }

    if (partialMatches.length > 1) {
      setSearchModalOpen(true);
      setError(
        `Hay ${partialMatches.length} coincidencias. Selecciona una del modal.`
      );
      return;
    }

    setError(
      "No se encontró un producto con ese código. Presiona F10 para buscarlo."
    );
  }, [
    getProductByCodigo,
    onProductSelected,
    productSearch,
    searchableProducts,
    setError,
  ]);

  const loadProductForTransfer = useCallback(
    (product) => {
      if (!product) {
        return;
      }

      onProductSelected(product, 1);
      if (typeof resetAfterSelection === "function") {
        resetAfterSelection();
      }
    },
    [onProductSelected, resetAfterSelection]
  );

  return {
    productSearch,
    setProductSearch,
    handleLookupProductSearchChange,
    searchableProducts,
    searchModalOpen,
    setSearchModalOpen,
    openSearchModal,
    closeSearchModal,
    clearLookupSelection,
    handleLookupProduct,
    loadProductForTransfer,
  };
};

export default useProductLookup;
