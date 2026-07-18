import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createEmptyProductSlots,
  getKardexProductIds,
  getKardexTargetSlot,
  getNextKardexSlot,
  isBranchKardexProduct,
} from "../utils/kardexProductUtils";

import {
  getKardexProductId,
} from "../utils/kardexMovementUtils";

const useKardexProductSelection = ({
  products = [],
} = {}) => {
  const [
    selectedProducts,
    setSelectedProducts,
  ] = useState(
    createEmptyProductSlots
  );

  const selectedProductIds =
    useMemo(() => {
      return getKardexProductIds(
        selectedProducts
      );
    }, [selectedProducts]);

  const getNextAvailableSlot =
    useCallback(() => {
      return getNextKardexSlot(
        selectedProducts
      );
    }, [selectedProducts]);

  const selectProduct =
    useCallback(
      (
        product,
        slot = 0
      ) => {
        if (
          !isBranchKardexProduct(
            product
          )
        ) {
          return false;
        }

        const productId =
          getKardexProductId(
            product
          );

        if (!productId) {
          return false;
        }

        const targetSlot =
          getKardexTargetSlot(
            slot
          );

        const existingSlot =
          selectedProducts.findIndex(
            (currentProduct) => {
              const currentProductId =
                getKardexProductId(
                  currentProduct
                );

              return (
                currentProductId &&
                String(
                  currentProductId
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
          return false;
        }

        setSelectedProducts(
          (currentProducts) => {
            const nextProducts = [
              ...currentProducts,
            ];

            nextProducts[
              targetSlot
            ] = product;

            return nextProducts;
          }
        );

        return true;
      },
      [selectedProducts]
    );

  const removeProduct =
    useCallback((slot) => {
      const targetSlot =
        getKardexTargetSlot(
          slot
        );

      setSelectedProducts(
        (currentProducts) => {
          if (
            !currentProducts[
              targetSlot
            ]
          ) {
            return currentProducts;
          }

          const nextProducts = [
            ...currentProducts,
          ];

          nextProducts[
            targetSlot
          ] = null;

          return nextProducts;
        }
      );
    }, []);

  const clearSelectedProducts =
    useCallback(() => {
      setSelectedProducts(
        createEmptyProductSlots()
      );
    }, []);

  useEffect(() => {
    const availableProductIds =
      new Set(
        getKardexProductIds(
          products
        )
          .filter(Boolean)
          .map(String)
      );

    setSelectedProducts(
      (currentProducts) => {
        let changed = false;

        const nextProducts =
          currentProducts.map(
            (product) => {
              if (!product) {
                return null;
              }

              const productId =
                getKardexProductId(
                  product
                );

              if (
                productId &&
                availableProductIds.has(
                  String(
                    productId
                  )
                )
              ) {
                return product;
              }

              changed = true;

              return null;
            }
          );

        return changed
          ? nextProducts
          : currentProducts;
      }
    );
  }, [products]);

  return {
    selectedProducts,
    selectedProductIds,

    selectProduct,
    removeProduct,
    clearSelectedProducts,
    getNextAvailableSlot,
  };
};

export default useKardexProductSelection;