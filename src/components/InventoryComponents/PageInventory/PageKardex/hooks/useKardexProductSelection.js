import {
  useCallback,
  useMemo,
  useState,
} from "react";

import { useDidChange } from "../../../../../hooks/useDidChange";

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

/**
 * Descarta de los slots los productos que ya no estan disponibles.
 *
 * Funcion pura a proposito: la reconciliacion es estado derivado y se resuelve
 * durante el render, no desde un efecto con un setState sincrono.
 *
 * @returns {Array} Los mismos slots si no cambio nada, para que React omita el
 *   re-render.
 */
const reconcileSelectedProducts = (
  currentProducts,
  availableProductIds
) => {
  let changed = false;

  const nextProducts = currentProducts.map(
    (product) => {
      if (!product) {
        return null;
      }

      const productId = getKardexProductId(product);

      if (
        productId &&
        availableProductIds.has(String(productId))
      ) {
        return product;
      }

      changed = true;

      return null;
    }
  );

  return changed ? nextProducts : currentProducts;
};

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

  // La seleccion se reconcilia con el catalogo disponible cada vez que este
  // cambia. Se ajusta durante el render porque es estado derivado: hacerlo en un
  // efecto obligaba a React a confirmar un segundo render con productos que ya no
  // existian.
  const availableProductIdsKey = JSON.stringify(
    getKardexProductIds(products)
      .filter(Boolean)
      .map(String)
  );

  if (useDidChange(availableProductIdsKey)) {
    const availableProductIds = new Set(
      JSON.parse(availableProductIdsKey)
    );

    setSelectedProducts(
      (currentProducts) =>
        reconcileSelectedProducts(
          currentProducts,
          availableProductIds
        )
    );
  }

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
