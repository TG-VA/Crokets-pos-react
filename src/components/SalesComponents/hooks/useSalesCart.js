import { useCallback } from "react";

import {
  isRewardCartItem,
  isSameCartItem,
} from "../utils/salesCartUtils";

const calculateDiscountedProduct = (basePrice, product) => {
  const originalPrice = Number(basePrice || 0);

  const discountEnabled =
    Boolean(product?.discount_enabled) &&
    Number(product?.discount_percent || 0) > 0;

  if (!discountEnabled) {
    return {
      precioOriginal: originalPrice,
      precioFinal: originalPrice,
      descuentoTipo: null,
      descuentoValor: 0,
      descuentoMontoUnitario: 0,
      discountPercent: 0,
      discountConcept: "",
    };
  }

  const discountPercent = Number(product.discount_percent || 0);
  const descuentoMontoUnitario =
    originalPrice * (discountPercent / 100);

  return {
    precioOriginal: originalPrice,
    precioFinal: Math.max(
      originalPrice - descuentoMontoUnitario,
      0,
    ),
    descuentoTipo: "percent",
    descuentoValor: discountPercent,
    descuentoMontoUnitario,
    discountPercent,
    discountConcept: product.discount_concept || "",
  };
};

const updateCartItemQuantity = ({
  item,
  quantity,
  stock,
}) => {
  const precioOriginal = Number(
    item.precioOriginal ?? item.precio ?? 0,
  );

  const precioFinal = Number(item.precio ?? 0);

  const descuentoUnitario = Math.max(
    precioOriginal - precioFinal,
    0,
  );

  const tracksInventory = Boolean(
    item.tracks_inventory,
  );

  const resolvedStock =
    stock !== undefined
      ? Number(stock || 0)
      : Number(item.stockReal || 0);

  return {
    ...item,
    cantidad: quantity,
    importe: quantity * precioFinal,
    descuentoMonto: descuentoUnitario * quantity,
    stockReal: tracksInventory
      ? resolvedStock
      : item.stockReal,
    existencia: tracksInventory
      ? Math.max(resolvedStock - quantity, 0)
      : "∞",
  };
};

const useSalesCart = ({
  productosRef,
  selectedProduct,
  setProductos,
  setSelectedProduct,
  getBranchInventoryRow,
  getKitAvailableStock,
  showAppWarning,
  syncCurrentSaleRewardsWithCart,
}) => {
  const commitCart = useCallback(
    (nextProducts, nextSelectedProduct) => {
      productosRef.current = nextProducts;
      setProductos(nextProducts);

      if (nextSelectedProduct !== undefined) {
        setSelectedProduct(nextSelectedProduct);
      }
    },
    [
      productosRef,
      setProductos,
      setSelectedProduct,
    ],
  );

  const updateExistingProduct = useCallback(
    ({
      currentProducts,
      productId,
      quantity,
      stock,
    }) => {
      return currentProducts.map((item) => {
        if (
          item.id !== productId ||
          isRewardCartItem(item)
        ) {
          return item;
        }

        return updateCartItemQuantity({
          item,
          quantity,
          stock,
        });
      });
    },
    [],
  );

  const getUpdatedSelectedProduct = useCallback(
    ({
      nextProducts,
      productId,
    }) => {
      if (selectedProduct?.id !== productId) {
        return undefined;
      }

      return (
        nextProducts.find(
          (item) =>
            item.id === productId &&
            !isRewardCartItem(item),
        ) || null
      );
    },
    [selectedProduct],
  );

  const createCartProduct = useCallback(
    ({
      product,
      salePrice,
      costPrice,
      stock,
      tracksInventory,
      isKit,
    }) => {
      const discountData =
        calculateDiscountedProduct(
          salePrice,
          product,
        );

      return {
        id: product.id,
        codigo: product.barcode,
        nombre: product.name,
        precioOriginal:
          discountData.precioOriginal,
        precio: discountData.precioFinal,
        costo: costPrice,
        cantidad: 1,
        importe: discountData.precioFinal,
        descuentoTipo:
          discountData.descuentoTipo,
        descuentoValor:
          discountData.descuentoValor,
        descuentoMonto:
          discountData.descuentoMontoUnitario,
        discountPercent:
          discountData.discountPercent,
        discountConcept:
          discountData.discountConcept,
        stockReal: tracksInventory
          ? Number(stock || 0)
          : null,
        existencia: tracksInventory
          ? Math.max(Number(stock || 0) - 1, 0)
          : "∞",
        is_kit: Boolean(isKit),
        tracks_inventory:
          Boolean(tracksInventory),
      };
    },
    [],
  );

  const addProductToCart = useCallback(
    async (product) => {
      if (!product?.id) {
        return false;
      }

      const currentProducts =
        productosRef.current || [];

      if (product.is_kit) {
        const kitAvailability =
          await getKitAvailableStock(
            product.id,
          );

        const stock = Number(
          kitAvailability?.availableStock || 0,
        );

        if (
          !kitAvailability?.isValid ||
          stock <= 0
        ) {
          showAppWarning(
            kitAvailability?.message ||
              "Este kit no tiene inventario suficiente en sus componentes.",
          );

          return false;
        }

        const existingProduct =
          currentProducts.find(
            (item) =>
              item.id === product.id &&
              !isRewardCartItem(item),
          );

        if (existingProduct) {
          const nextQuantity =
            Number(
              existingProduct.cantidad || 0,
            ) + 1;

          if (nextQuantity > stock) {
            showAppWarning(
              "No hay suficiente inventario para vender otro kit.",
            );

            return false;
          }

          const nextProducts =
            updateExistingProduct({
              currentProducts,
              productId: product.id,
              quantity: nextQuantity,
              stock,
            });

          commitCart(
            nextProducts,
            getUpdatedSelectedProduct({
              nextProducts,
              productId: product.id,
            }),
          );

          return true;
        }

        const newProduct = createCartProduct({
          product,
          salePrice: Number(
            product.sale_price ?? 0,
          ),
          costPrice: Number(
            product.cost_price ?? 0,
          ),
          stock,
          tracksInventory: true,
          isKit: true,
        });

        commitCart([
          ...currentProducts,
          newProduct,
        ]);

        return true;
      }

      const tracksInventory = Boolean(
        product.tracks_inventory,
      );

      if (tracksInventory) {
        const inventoryRow =
          await getBranchInventoryRow(
            product.id,
          );

        if (
          !inventoryRow ||
          inventoryRow.is_active === false
        ) {
          showAppWarning(
            "Este producto no está activo en el inventario de esta sucursal.",
          );

          return false;
        }

        const stock = Number(
          inventoryRow.stock || 0,
        );

        const hasBeenStocked = Boolean(
          inventoryRow.has_been_stocked,
        );

        if (!hasBeenStocked && stock <= 0) {
          showAppWarning(
            "Este producto aún no tiene inventario inicial registrado.",
          );

          return false;
        }

        if (stock <= 0) {
          showAppWarning(
            "No hay existencia disponible.",
          );

          return false;
        }

        const existingProduct =
          currentProducts.find(
            (item) =>
              item.id === product.id &&
              !isRewardCartItem(item),
          );

        if (existingProduct) {
          const nextQuantity =
            Number(
              existingProduct.cantidad || 0,
            ) + 1;

          if (nextQuantity > stock) {
            showAppWarning(
              "No hay suficiente inventario.",
            );

            return false;
          }

          const nextProducts =
            updateExistingProduct({
              currentProducts,
              productId: product.id,
              quantity: nextQuantity,
              stock,
            });

          commitCart(
            nextProducts,
            getUpdatedSelectedProduct({
              nextProducts,
              productId: product.id,
            }),
          );

          return true;
        }

        const newProduct = createCartProduct({
          product,
          salePrice: Number(
            inventoryRow.sale_price ??
              product.sale_price ??
              0,
          ),
          costPrice: Number(
            inventoryRow.cost_price ??
              product.cost_price ??
              0,
          ),
          stock,
          tracksInventory: true,
          isKit: product.is_kit,
        });

        commitCart([
          ...currentProducts,
          newProduct,
        ]);

        return true;
      }

      const existingProduct =
        currentProducts.find(
          (item) =>
            item.id === product.id &&
            !isRewardCartItem(item),
        );

      if (existingProduct) {
        const nextQuantity =
          Number(
            existingProduct.cantidad || 0,
          ) + 1;

        const nextProducts =
          updateExistingProduct({
            currentProducts,
            productId: product.id,
            quantity: nextQuantity,
          });

        commitCart(
          nextProducts,
          getUpdatedSelectedProduct({
            nextProducts,
            productId: product.id,
          }),
        );

        return true;
      }

      const newProduct = createCartProduct({
        product,
        salePrice: Number(
          product.sale_price ?? 0,
        ),
        costPrice: Number(
          product.cost_price ?? 0,
        ),
        stock: null,
        tracksInventory: false,
        isKit: product.is_kit,
      });

      commitCart([
        ...currentProducts,
        newProduct,
      ]);

      return true;
    },
    [
      commitCart,
      createCartProduct,
      getBranchInventoryRow,
      getKitAvailableStock,
      getUpdatedSelectedProduct,
      productosRef,
      showAppWarning,
      updateExistingProduct,
    ],
  );

  const increaseSelectedProductQuantity =
    useCallback(() => {
      if (!selectedProduct) {
        return;
      }

      if (
        isRewardCartItem(selectedProduct)
      ) {
        showAppWarning(
          "No puedes modificar la cantidad de un producto aplicado como recompensa.",
        );

        return;
      }

      const currentProducts =
        productosRef.current || [];

      const currentProduct =
        currentProducts.find((item) =>
          isSameCartItem(
            item,
            selectedProduct,
          ),
        );

      if (!currentProduct) {
        return;
      }

      const currentQuantity = Number(
        currentProduct.cantidad || 0,
      );

      const stock = Number(
        currentProduct.stockReal || 0,
      );

      if (
        currentProduct.tracks_inventory &&
        currentQuantity >= stock
      ) {
        showAppWarning(
          "No hay suficiente inventario.",
        );

        return;
      }

      const nextQuantity =
        currentQuantity + 1;

      const nextProducts =
        currentProducts.map((item) => {
          if (
            !isSameCartItem(
              item,
              selectedProduct,
            )
          ) {
            return item;
          }

          return updateCartItemQuantity({
            item,
            quantity: nextQuantity,
          });
        });

      const nextSelected =
        nextProducts.find((item) =>
          isSameCartItem(
            item,
            selectedProduct,
          ),
        ) || null;

      commitCart(
        nextProducts,
        nextSelected,
      );
    }, [
      commitCart,
      productosRef,
      selectedProduct,
      showAppWarning,
    ]);

  const decreaseSelectedProductQuantity =
    useCallback(() => {
      if (!selectedProduct) {
        return;
      }

      if (
        isRewardCartItem(selectedProduct)
      ) {
        showAppWarning(
          "No puedes modificar la cantidad de un producto aplicado como recompensa.",
        );

        return;
      }

      const currentProducts =
        productosRef.current || [];

      const currentProduct =
        currentProducts.find((item) =>
          isSameCartItem(
            item,
            selectedProduct,
          ),
        );

      if (!currentProduct) {
        return;
      }

      const currentQuantity = Number(
        currentProduct.cantidad || 0,
      );

      if (currentQuantity <= 1) {
        const nextProducts =
          currentProducts.filter(
            (item) =>
              !isSameCartItem(
                item,
                selectedProduct,
              ),
          );

        commitCart(nextProducts, null);

        syncCurrentSaleRewardsWithCart?.(
          nextProducts,
        );

        return;
      }

      const nextQuantity =
        currentQuantity - 1;

      const nextProducts =
        currentProducts.map((item) => {
          if (
            !isSameCartItem(
              item,
              selectedProduct,
            )
          ) {
            return item;
          }

          return updateCartItemQuantity({
            item,
            quantity: nextQuantity,
          });
        });

      const nextSelected =
        nextProducts.find((item) =>
          isSameCartItem(
            item,
            selectedProduct,
          ),
        ) || null;

      commitCart(
        nextProducts,
        nextSelected,
      );
    }, [
      commitCart,
      productosRef,
      selectedProduct,
      showAppWarning,
      syncCurrentSaleRewardsWithCart,
    ]);

  const handleDeleteSelectedProduct =
    useCallback(() => {
      if (!selectedProduct) {
        return;
      }

      const currentProducts =
        productosRef.current || [];

      const nextProducts =
        currentProducts.filter(
          (item) =>
            !isSameCartItem(
              item,
              selectedProduct,
            ),
        );

      commitCart(nextProducts, null);

      syncCurrentSaleRewardsWithCart?.(
        nextProducts,
      );
    }, [
      commitCart,
      productosRef,
      selectedProduct,
      syncCurrentSaleRewardsWithCart,
    ]);

  return {
    addProductToCart,
    increaseSelectedProductQuantity,
    decreaseSelectedProductQuantity,
    handleDeleteSelectedProduct,
  };
};

export default useSalesCart;