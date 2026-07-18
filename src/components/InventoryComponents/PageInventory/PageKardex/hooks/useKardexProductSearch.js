import {
  useCallback,
  useState,
} from "react";

import {
  findKardexProductByBarcode,
  getKardexTargetSlot,
  normalizeKardexBarcode,
} from "../utils/kardexProductUtils";

import {
  getKardexProductId,
} from "../utils/kardexMovementUtils";

const useKardexProductSearch = ({
  products = [],
  selectedProducts = [],
  selectProduct,
  getNextAvailableSlot,
} = {}) => {
  const [
    modalTargetSlot,
    setModalTargetSlot,
  ] = useState(0);

  const [
    searchModalOpen,
    setSearchModalOpen,
  ] = useState(false);

  const [
    barcode,
    setBarcode,
  ] = useState("");

  const openProductSearch =
    useCallback(
      (slot = null) => {
        const hasExplicitSlot =
          slot === 0 ||
          slot === 1;

        const targetSlot =
          hasExplicitSlot
            ? getKardexTargetSlot(
                slot
              )
            : getNextAvailableSlot?.() ??
              0;

        setModalTargetSlot(
          targetSlot
        );

        setSearchModalOpen(true);
      },
      [getNextAvailableSlot]
    );

  const closeProductSearch =
    useCallback(() => {
      setSearchModalOpen(false);
    }, []);

  const resetProductSearch =
    useCallback(() => {
      setBarcode("");
      setSearchModalOpen(false);
      setModalTargetSlot(0);
    }, []);

  const findProductByBarcode =
    useCallback(
      (barcodeValue) => {
        return findKardexProductByBarcode(
          products,
          barcodeValue
        );
      },
      [products]
    );

  const selectProductFromSearch =
    useCallback(
      (
        product,
        slot = modalTargetSlot
      ) => {
        if (
          typeof selectProduct !==
          "function"
        ) {
          return false;
        }

        const wasSelected =
          selectProduct(
            product,
            slot
          );

        if (!wasSelected) {
          return false;
        }

        setBarcode("");
        setSearchModalOpen(false);

        return true;
      },
      [
        modalTargetSlot,
        selectProduct,
      ]
    );

  const searchBarcode =
    useCallback(() => {
      const cleanBarcode =
        normalizeKardexBarcode(
          barcode
        );

      if (!cleanBarcode) {
        return {
          found: false,
          product: null,
          reason: "empty",
        };
      }

      const targetSlot =
        getNextAvailableSlot?.() ??
        0;

      const product =
        findProductByBarcode(
          cleanBarcode
        );

      if (!product) {
        setModalTargetSlot(
          targetSlot
        );

        setSearchModalOpen(true);

        return {
          found: false,
          product: null,
          reason: "not_found",
        };
      }

      const productId =
        getKardexProductId(
          product
        );

      const existingSlot =
        selectedProducts.findIndex(
          (selectedProduct) => {
            const selectedProductId =
              getKardexProductId(
                selectedProduct
              );

            return (
              selectedProductId &&
              productId &&
              String(
                selectedProductId
              ) ===
                String(
                  productId
                )
            );
          }
        );

      if (
        existingSlot !== -1 &&
        existingSlot !==
          targetSlot
      ) {
        setBarcode("");

        return {
          found: false,
          product,
          slot: existingSlot,
          reason:
            "already_selected",
        };
      }

      const wasSelected =
        selectProductFromSearch(
          product,
          targetSlot
        );

      if (!wasSelected) {
        return {
          found: false,
          product,
          slot: targetSlot,
          reason:
            "selection_failed",
        };
      }

      return {
        found: true,
        product,
        slot: targetSlot,
        reason: "",
      };
    }, [
      barcode,
      findProductByBarcode,
      getNextAvailableSlot,
      selectProductFromSearch,
      selectedProducts,
    ]);

  return {
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
  };
};

export default useKardexProductSearch;