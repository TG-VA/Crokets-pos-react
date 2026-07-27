import {
  useCallback,
  useMemo,
} from "react";

import {
  getCartQuantityForProduct,
  isRewardCartItem,
  isSameCartItem,
  updateProductExistenceInCart,
} from "../utils/salesCartUtils";

import {
  getRewardRedeemQuantity,
  getRewardTotalPoints,
  getRewardType,
  getSyncedRewardsFromCart,
  isPendingProductDiscountReward,
  normalizeRewardsArray,
} from "../utils/salesRewardUtils";

const useSalesRewards = ({
  productos = [],
  productosRef,

  currentSaleReward = null,
  setCurrentSaleReward,

  setCurrentSaleClient,

  pendingProductDiscountRewards = [],
  setPendingProductDiscountRewards,

  setPendingFreeProductRewards,

  setActiveProductDiscountReward,

  setRewardProductModalOpen,
  setProductDiscountRewardModalOpen,

  setProductos,

  selectedProduct,
  setSelectedProduct,

  getBranchInventoryRow,

  showAppWarning,
}) => {
  const syncCurrentSaleRewardsWithCart =
    useCallback(
      (cartItems) => {
        setCurrentSaleReward(
          (previousReward) =>
            getSyncedRewardsFromCart(
              cartItems,
              previousReward,
            ),
        );
      },
      [setCurrentSaleReward],
    );

  const removeRewardItemsFromCart =
    useCallback(() => {
      const currentProducts =
        Array.isArray(
          productosRef?.current,
        )
          ? productosRef.current
          : [];

      const removedRewardProducts =
        currentProducts.filter(
          (product) =>
            isRewardCartItem(product),
        );

      if (
        removedRewardProducts.length ===
        0
      ) {
        return;
      }

      const affectedProductIds = [
        ...new Set(
          removedRewardProducts
            .map(
              (product) =>
                product?.id,
            )
            .filter(Boolean),
        ),
      ];

      let updatedProducts =
        currentProducts.filter(
          (product) =>
            !isRewardCartItem(
              product,
            ),
        );

      affectedProductIds.forEach(
        (productId) => {
          const stockSource =
            currentProducts.find(
              (product) =>
                product?.id ===
                  productId &&
                product
                  ?.tracks_inventory &&
                product?.stockReal !==
                  null &&
                product?.stockReal !==
                  undefined,
            );

          if (!stockSource) {
            return;
          }

          updatedProducts =
            updateProductExistenceInCart(
              updatedProducts,
              productId,
              Number(
                stockSource.stockReal ||
                  0,
              ),
            );
        },
      );

      setProductos(
        updatedProducts,
      );

      productosRef.current =
        updatedProducts;

      setSelectedProduct(
        (previousSelectedProduct) => {
          if (
            !previousSelectedProduct
          ) {
            return null;
          }

          if (
            isRewardCartItem(
              previousSelectedProduct,
            )
          ) {
            return null;
          }

          const stillExists =
            updatedProducts.find(
              (product) =>
                isSameCartItem(
                  product,
                  previousSelectedProduct,
                ),
            );

          return stillExists || null;
        },
      );
    }, [
      productosRef,
      setProductos,
      setSelectedProduct,
    ]);

  const mergeAppliedRewards =
    useCallback(
      (
        previousRewards,
        rewardsToAdd,
      ) => {
        const normalizedPrevious =
          normalizeRewardsArray(
            previousRewards,
          );

        const normalizedToAdd =
          normalizeRewardsArray(
            rewardsToAdd,
          );

        const mergedRewards = [
          ...normalizedPrevious,
        ];

        normalizedToAdd.forEach(
          (reward) => {
            const rewardRedeemQuantity =
              getRewardRedeemQuantity(
                reward,
              );

            const existingIndex =
              mergedRewards.findIndex(
                (item) =>
                  item?.id ===
                  reward?.id,
              );

            if (
              existingIndex >= 0
            ) {
              const existingReward =
                mergedRewards[
                  existingIndex
                ];

              mergedRewards[
                existingIndex
              ] = {
                ...existingReward,
                redeemQuantity:
                  getRewardRedeemQuantity(
                    existingReward,
                  ) +
                  rewardRedeemQuantity,
              };

              return;
            }

            mergedRewards.push({
              ...reward,
              redeemQuantity:
                rewardRedeemQuantity,
            });
          },
        );

        return mergedRewards;
      },
      [],
    );

  const openNextProductDiscountReward =
    useCallback(
      (
        queue =
          pendingProductDiscountRewards,
      ) => {
        const cleanQueue =
          normalizeRewardsArray(
            queue,
          ).filter(
            (reward) =>
              getRewardType(
                reward,
              ) ===
              "product_discount",
          );

        if (
          cleanQueue.length === 0
        ) {
          setPendingProductDiscountRewards(
            [],
          );

          setActiveProductDiscountReward(
            null,
          );

          setProductDiscountRewardModalOpen(
            false,
          );

          return;
        }

        setPendingProductDiscountRewards(
          cleanQueue,
        );

        setActiveProductDiscountReward(
          cleanQueue[0],
        );

        setProductDiscountRewardModalOpen(
          true,
        );
      },
      [
        pendingProductDiscountRewards,
        setPendingProductDiscountRewards,
        setActiveProductDiscountReward,
        setProductDiscountRewardModalOpen,
      ],
    );

  const handleCloseRewardProductModal =
    useCallback(() => {
      setRewardProductModalOpen(
        false,
      );

      setPendingFreeProductRewards(
        [],
      );
    }, [
      setRewardProductModalOpen,
      setPendingFreeProductRewards,
    ]);

  const handleCloseProductDiscountRewardModal =
    useCallback(() => {
      setProductDiscountRewardModalOpen(
        false,
      );

      setActiveProductDiscountReward(
        null,
      );

      setPendingProductDiscountRewards(
        [],
      );
    }, [
      setProductDiscountRewardModalOpen,
      setActiveProductDiscountReward,
      setPendingProductDiscountRewards,
    ]);

  const addRewardProductToCart =
    useCallback(
      async ({
        reward,
        product,
        quantity,
      }) => {
        if (
          !reward?.id ||
          !product?.id
        ) {
          return false;
        }

        const redeemQuantity =
          getRewardRedeemQuantity(
            reward,
          );

        const rewardQuantity =
          Math.max(
            Number(
              quantity ||
                Number(
                  reward.reward_quantity ||
                    1,
                ) *
                  redeemQuantity,
            ),
            1,
          );

        const tracksInventory =
          product.tracks_inventory !==
          false;

        let stock = null;

        let salePrice = Number(
          product.sale_price || 0,
        );

        let costPrice = Number(
          product.cost_price || 0,
        );

        if (tracksInventory) {
          const inventoryRow =
            await getBranchInventoryRow(
              product.id,
            );

          if (
            !inventoryRow ||
            inventoryRow.is_active ===
              false
          ) {
            showAppWarning(
              `El producto "${
                product.name ||
                product.barcode ||
                "PRODUCTO"
              }" no está activo en esta sucursal.`,
            );

            return false;
          }

          stock = Number(
            inventoryRow.stock || 0,
          );

          salePrice = Number(
            inventoryRow.sale_price ??
              product.sale_price ??
              0,
          );

          costPrice = Number(
            inventoryRow.cost_price ??
              product.cost_price ??
              0,
          );

          const currentCartQuantity =
            getCartQuantityForProduct(
              product.id,
              productosRef.current,
            );

          const availableToAdd =
            Math.max(
              stock -
                currentCartQuantity,
              0,
            );

          if (
            rewardQuantity >
            availableToAdd
          ) {
            showAppWarning(
              `No hay inventario suficiente para aplicar "${
                reward.name ||
                "RECOMPENSA"
              }". Disponible para agregar: ${availableToAdd}.`,
            );

            return false;
          }
        }

        const discountAmount =
          salePrice *
          rewardQuantity;

        const cartQuantityBeforeAdd =
          getCartQuantityForProduct(
            product.id,
            productosRef.current,
          );

        const cartQuantityAfterAdd =
          cartQuantityBeforeAdd +
          rewardQuantity;

        const rewardItem = {
          cartLineId:
            `reward_${reward.id}_${product.id}_` +
            `${Date.now()}_` +
            `${Math.random()
              .toString(16)
              .slice(2)}`,

          id: product.id,
          codigo: product.barcode,
          nombre: product.name,

          precioOriginal:
            salePrice,

          precio: 0,
          costo: costPrice,
          cantidad:
            rewardQuantity,
          importe: 0,

          descuentoTipo:
            "reward",

          descuentoValor:
            salePrice,

          descuentoMonto:
            discountAmount,

          discountPercent: 100,

          discountConcept:
            reward.name ||
            "RECOMPENSA",

          stockReal: stock,

          existencia:
            tracksInventory &&
            stock !== null
              ? Math.max(
                  stock -
                    cartQuantityAfterAdd,
                  0,
                )
              : "∞",

          is_kit:
            Boolean(
              product.is_kit,
            ),

          tracks_inventory:
            tracksInventory,

          is_reward_item: true,

          reward_id:
            reward.id,

          reward_name:
            reward.name ||
            "RECOMPENSA",

          reward_points_required:
            getRewardTotalPoints(
              reward,
            ),

          reward_line_points_required:
            Number(
              reward.points_required ||
                0,
            ) *
            (rewardQuantity /
              Math.max(
                Number(
                  reward.reward_quantity ||
                    1,
                ),
                1,
              )),

          reward_redeem_quantity:
            redeemQuantity,

          reward_product_quantity:
            rewardQuantity,
        };

        setProductos(
          (previousProducts) => {
            const existingIndex =
              previousProducts.findIndex(
                (item) =>
                  item
                    ?.is_reward_item &&
                  item?.reward_id ===
                    reward.id &&
                  item?.id ===
                    product.id,
              );

            let updatedProducts;

            if (
              existingIndex === -1
            ) {
              updatedProducts = [
                ...previousProducts,
                rewardItem,
              ];
            } else {
              updatedProducts =
                previousProducts.map(
                  (
                    item,
                    index,
                  ) => {
                    if (
                      index !==
                      existingIndex
                    ) {
                      return item;
                    }

                    const nextQuantity =
                      Number(
                        item.cantidad ||
                          0,
                      ) +
                      rewardQuantity;

                    const nextDiscountAmount =
                      salePrice *
                      nextQuantity;

                    return {
                      ...item,

                      cantidad:
                        nextQuantity,

                      importe: 0,

                      descuentoMonto:
                        nextDiscountAmount,

                      existencia:
                        tracksInventory &&
                        stock !== null
                          ? Math.max(
                              stock -
                                cartQuantityAfterAdd,
                              0,
                            )
                          : "∞",

                      reward_points_required:
                        Number(
                          item.reward_points_required ||
                            0,
                        ) +
                        getRewardTotalPoints(
                          reward,
                        ),

                      reward_line_points_required:
                        Number(
                          item.reward_line_points_required ||
                            0,
                        ) +
                        Number(
                          reward.points_required ||
                            0,
                        ) *
                          (rewardQuantity /
                            Math.max(
                              Number(
                                reward.reward_quantity ||
                                  1,
                              ),
                              1,
                            )),

                      reward_redeem_quantity:
                        Number(
                          item.reward_redeem_quantity ||
                            0,
                        ) +
                        redeemQuantity,

                      reward_product_quantity:
                        Number(
                          item.reward_product_quantity ||
                            0,
                        ) +
                        rewardQuantity,
                    };
                  },
                );
            }

            if (
              tracksInventory &&
              stock !== null
            ) {
              updatedProducts =
                updateProductExistenceInCart(
                  updatedProducts,
                  product.id,
                  stock,
                );
            }

            productosRef.current =
              updatedProducts;

            return updatedProducts;
          },
        );

        setSelectedProduct(
          (
            previousSelectedProduct,
          ) => {
            if (
              !previousSelectedProduct ||
              previousSelectedProduct
                ?.id !== product.id
            ) {
              return previousSelectedProduct;
            }

            const sameRewardLine =
              previousSelectedProduct
                ?.is_reward_item &&
              previousSelectedProduct
                ?.reward_id ===
                reward.id &&
              previousSelectedProduct
                ?.id === product.id;

            if (!sameRewardLine) {
              if (
                tracksInventory &&
                stock !== null
              ) {
                return {
                  ...previousSelectedProduct,

                  stockReal: stock,

                  existencia:
                    Math.max(
                      stock -
                        cartQuantityAfterAdd,
                      0,
                    ),
                };
              }

              return previousSelectedProduct;
            }

            const nextQuantity =
              Number(
                previousSelectedProduct
                  .cantidad || 0,
              ) +
              rewardQuantity;

            return {
              ...previousSelectedProduct,

              cantidad:
                nextQuantity,

              importe: 0,

              descuentoMonto:
                salePrice *
                nextQuantity,

              existencia:
                tracksInventory &&
                stock !== null
                  ? Math.max(
                      stock -
                        cartQuantityAfterAdd,
                      0,
                    )
                  : "∞",

              reward_points_required:
                Number(
                  previousSelectedProduct
                    .reward_points_required ||
                    0,
                ) +
                getRewardTotalPoints(
                  reward,
                ),

              reward_line_points_required:
                Number(
                  previousSelectedProduct
                    .reward_line_points_required ||
                    0,
                ) +
                Number(
                  reward.points_required ||
                    0,
                ) *
                  (rewardQuantity /
                    Math.max(
                      Number(
                        reward.reward_quantity ||
                          1,
                      ),
                      1,
                    )),

              reward_redeem_quantity:
                Number(
                  previousSelectedProduct
                    .reward_redeem_quantity ||
                    0,
                ) +
                redeemQuantity,

              reward_product_quantity:
                Number(
                  previousSelectedProduct
                    .reward_product_quantity ||
                    0,
                ) +
                rewardQuantity,
            };
          },
        );

        return true;
      },
      [
        getBranchInventoryRow,
        productosRef,
        setProductos,
        setSelectedProduct,
        showAppWarning,
      ],
    );

  const validateRewardSelectionsInventory =
    useCallback(
      async (
        rewardSelections = [],
      ) => {
        const quantityByProduct =
          {};

        for (
          const selection of
          rewardSelections || []
        ) {
          const product =
            selection?.product;

          const quantity = Number(
            selection?.quantity || 0,
          );

          if (
            !product?.id ||
            quantity <= 0 ||
            product.tracks_inventory ===
              false
          ) {
            continue;
          }

          quantityByProduct[
            product.id
          ] =
            Number(
              quantityByProduct[
                product.id
              ] || 0,
            ) + quantity;
        }

        for (
          const [
            productId,
            quantityToAdd,
          ] of Object.entries(
            quantityByProduct,
          )
        ) {
          const inventoryRow =
            await getBranchInventoryRow(
              productId,
            );

          const stock = Number(
            inventoryRow?.stock || 0,
          );

          const currentCartQuantity =
            getCartQuantityForProduct(
              productId,
              productosRef.current,
            );

          const availableToAdd =
            Math.max(
              stock -
                currentCartQuantity,
              0,
            );

          if (
            !inventoryRow ||
            inventoryRow.is_active ===
              false
          ) {
            showAppWarning(
              "Uno de los productos de recompensa ya no está activo en esta sucursal.",
            );

            return false;
          }

          if (
            inventoryRow.has_been_stocked !==
              true &&
            stock <= 0
          ) {
            showAppWarning(
              "Uno de los productos de recompensa aún no tiene inventario inicial.",
            );

            return false;
          }

          if (
            Number(
              quantityToAdd,
            ) > availableToAdd
          ) {
            showAppWarning(
              `No hay inventario suficiente para aplicar las recompensas. Disponible para agregar: ${availableToAdd}.`,
            );

            return false;
          }
        }

        return true;
      },
      [
        getBranchInventoryRow,
        productosRef,
        showAppWarning,
      ],
    );

  const handleConfirmRewardProducts =
    useCallback(
      async (
        rewardSelections = [],
      ) => {
        try {
          const inventoryIsValid =
            await validateRewardSelectionsInventory(
              rewardSelections,
            );

          if (
            !inventoryIsValid
          ) {
            return;
          }

          const appliedRewards =
            [];

          for (
            const selection of
            rewardSelections
          ) {
            const wasApplied =
              await addRewardProductToCart(
                selection,
              );

            if (
              !wasApplied ||
              !selection?.reward
                ?.id
            ) {
              continue;
            }

            const rewardToApply =
              {
                ...selection.reward,

                redeemQuantity:
                  getRewardRedeemQuantity(
                    selection.reward,
                  ),

                appliedProductQuantity:
                  Math.max(
                    Number(
                      selection.quantity ||
                        1,
                    ),
                    1,
                  ),
              };

            const alreadyAdded =
              appliedRewards.some(
                (reward) =>
                  reward.id ===
                  rewardToApply.id,
              );

            if (
              !alreadyAdded
            ) {
              appliedRewards.push(
                rewardToApply,
              );
            }
          }

          if (
            appliedRewards.length ===
            0
          ) {
            showAppWarning(
              "No se aplicó ninguna recompensa. Revisa que el producto tenga inventario disponible.",
            );

            return;
          }

          setCurrentSaleReward(
            (previousRewards) =>
              mergeAppliedRewards(
                previousRewards,
                appliedRewards,
              ),
          );

          setRewardProductModalOpen(
            false,
          );

          setPendingFreeProductRewards(
            [],
          );

          if (
            pendingProductDiscountRewards.length >
            0
          ) {
            openNextProductDiscountReward(
              pendingProductDiscountRewards,
            );
          }
        } catch (error) {
          console.error(
            "Error aplicando productos de recompensa:",
            error,
          );

          showAppWarning(
            error?.message ||
              "No se pudieron aplicar las recompensas.",
          );
        }
      },
      [
        validateRewardSelectionsInventory,
        addRewardProductToCart,
        setCurrentSaleReward,
        mergeAppliedRewards,
        setRewardProductModalOpen,
        setPendingFreeProductRewards,
        pendingProductDiscountRewards,
        openNextProductDiscountReward,
        showAppWarning,
      ],
    );

  const handleAssignClient =
    useCallback(
      (
        client,
        rewards = [],
      ) => {
        const normalizedRewards =
          normalizeRewardsArray(
            rewards,
          );

        if (!client) {
          removeRewardItemsFromCart();

          setCurrentSaleClient(
            null,
          );

          setCurrentSaleReward(
            [],
          );

          setPendingFreeProductRewards(
            [],
          );

          setRewardProductModalOpen(
            false,
          );

          setPendingProductDiscountRewards(
            [],
          );

          setActiveProductDiscountReward(
            null,
          );

          setProductDiscountRewardModalOpen(
            false,
          );

          return;
        }

        setCurrentSaleClient(
          client,
        );

        if (
          normalizedRewards.length ===
          0
        ) {
          setCurrentSaleReward(
            [],
          );

          setPendingFreeProductRewards(
            [],
          );

          setRewardProductModalOpen(
            false,
          );

          setPendingProductDiscountRewards(
            [],
          );

          setActiveProductDiscountReward(
            null,
          );

          setProductDiscountRewardModalOpen(
            false,
          );

          return;
        }

        const freeProductRewards =
          normalizedRewards.filter(
            (reward) =>
              getRewardType(
                reward,
              ) ===
              "free_product",
          );

        const productDiscountRewards =
          normalizedRewards
            .filter(
              (reward) =>
                getRewardType(
                  reward,
                ) ===
                "product_discount",
            )
            .map((reward) => ({
              ...reward,

              reward_application_status:
                "pending_product_discount",
            }));

        setPendingProductDiscountRewards(
          productDiscountRewards,
        );

        if (
          freeProductRewards.length >
          0
        ) {
          setPendingFreeProductRewards(
            freeProductRewards,
          );

          setRewardProductModalOpen(
            true,
          );

          setProductDiscountRewardModalOpen(
            false,
          );

          setActiveProductDiscountReward(
            null,
          );

          return;
        }

        setPendingFreeProductRewards(
          [],
        );

        setRewardProductModalOpen(
          false,
        );

        if (
          productDiscountRewards.length >
          0
        ) {
          openNextProductDiscountReward(
            productDiscountRewards,
          );
        }
      },
      [
        removeRewardItemsFromCart,
        setCurrentSaleClient,
        setCurrentSaleReward,
        setPendingFreeProductRewards,
        setRewardProductModalOpen,
        setPendingProductDiscountRewards,
        setActiveProductDiscountReward,
        setProductDiscountRewardModalOpen,
        openNextProductDiscountReward,
      ],
    );

  const addRewardDiscountProductToCart =
    useCallback(
      async ({
        reward,
        product,
        quantity,
        originalUnitPrice,
        discountAmount,
        finalUnitPrice,
        discountType,
        discountValue,
        totalPoints,
      }) => {
        if (
          !reward?.id ||
          !product?.id
        ) {
          return false;
        }

        const cleanQuantity =
          Math.max(
            Number(
              quantity || 1,
            ),
            1,
          );

        const tracksInventory =
          product.tracks_inventory !==
            false &&
          product.use_inventory !==
            false;

        let stock = null;

        let salePrice = Number(
          originalUnitPrice ??
            product.sale_price ??
            0,
        );

        let costPrice = Number(
          product.cost_price || 0,
        );

        if (tracksInventory) {
          const inventoryRow =
            await getBranchInventoryRow(
              product.id,
            );

          if (
            !inventoryRow ||
            inventoryRow.is_active ===
              false
          ) {
            showAppWarning(
              `El producto "${
                product.name ||
                product.barcode ||
                "PRODUCTO"
              }" no está activo en esta sucursal.`,
            );

            return false;
          }

          stock = Number(
            inventoryRow.stock || 0,
          );

          salePrice = Number(
            originalUnitPrice ??
              inventoryRow.sale_price ??
              product.sale_price ??
              0,
          );

          costPrice = Number(
            inventoryRow.cost_price ??
              product.cost_price ??
              0,
          );

          const currentCartQuantity =
            getCartQuantityForProduct(
              product.id,
              productosRef.current,
            );

          const availableToAdd =
            Math.max(
              stock -
                currentCartQuantity,
              0,
            );

          if (
            cleanQuantity >
            availableToAdd
          ) {
            showAppWarning(
              `No hay inventario suficiente para aplicar "${
                reward.name ||
                "RECOMPENSA"
              }". Disponible para agregar: ${availableToAdd}.`,
            );

            return false;
          }
        }

        const cleanDiscountAmount =
          Math.max(
            Math.floor(
              Number(
                discountAmount ||
                  0,
              ),
            ),
            0,
          );

        const cleanFinalUnitPrice =
          Math.max(
            Number(
              finalUnitPrice ??
                salePrice -
                  cleanDiscountAmount,
            ),
            0,
          );

        const discountTotal =
          cleanDiscountAmount *
          cleanQuantity;

        const cartQuantityBeforeAdd =
          getCartQuantityForProduct(
            product.id,
            productosRef.current,
          );

        const cartQuantityAfterAdd =
          cartQuantityBeforeAdd +
          cleanQuantity;

        const rewardDiscountItem =
          {
            cartLineId:
              `reward_discount_${reward.id}_${product.id}_` +
              `${Date.now()}_` +
              `${Math.random()
                .toString(16)
                .slice(2)}`,

            id: product.id,
            codigo:
              product.barcode,
            nombre:
              product.name,

            precioOriginal:
              salePrice,

            precio:
              cleanFinalUnitPrice,

            costo:
              costPrice,

            cantidad:
              cleanQuantity,

            importe:
              cleanFinalUnitPrice *
              cleanQuantity,

            descuentoTipo:
              "amount",

            descuentoValor:
              cleanDiscountAmount,

            descuentoMonto:
              discountTotal,

            discountPercent:
              discountType ===
              "percent"
                ? Number(
                    discountValue ||
                      0,
                  )
                : 0,

            discountConcept:
              reward.name ||
              "RECOMPENSA",

            stockReal:
              stock,

            existencia:
              tracksInventory &&
              stock !== null
                ? Math.max(
                    stock -
                      cartQuantityAfterAdd,
                    0,
                  )
                : "∞",

            is_kit:
              Boolean(
                product.is_kit,
              ),

            tracks_inventory:
              tracksInventory,

            is_reward_discount_item:
              true,

            reward_id:
              reward.id,

            reward_name:
              reward.name ||
              "RECOMPENSA",

            reward_points_required:
              Number(
                totalPoints ||
                  getRewardTotalPoints(
                    reward,
                  ),
              ),

            reward_line_points_required:
              Number(
                totalPoints ||
                  getRewardTotalPoints(
                    reward,
                  ),
              ),

            reward_redeem_quantity:
              cleanQuantity /
              Math.max(
                Number(
                  reward.reward_quantity ||
                    1,
                ),
                1,
              ),

            reward_product_quantity:
              cleanQuantity,

            reward_discount_type:
              discountType ||
              reward.discount_type ||
              null,

            reward_discount_value:
              Number(
                discountValue ??
                  reward.discount_value ??
                  0,
              ),

            reward_discount_amount:
              discountTotal,
          };

        setProductos(
          (previousProducts) => {
            let updatedProducts =
              [
                ...previousProducts,
                rewardDiscountItem,
              ];

            if (
              tracksInventory &&
              stock !== null
            ) {
              updatedProducts =
                updateProductExistenceInCart(
                  updatedProducts,
                  product.id,
                  stock,
                );
            }

            productosRef.current =
              updatedProducts;

            return updatedProducts;
          },
        );

        setSelectedProduct(
          rewardDiscountItem,
        );

        return true;
      },
      [
        getBranchInventoryRow,
        productosRef,
        setProductos,
        setSelectedProduct,
        showAppWarning,
      ],
    );

  const handleConfirmProductDiscountReward =
    useCallback(
      async (payload) => {
        if (
          !payload?.reward?.id
        ) {
          return;
        }

        const selections =
          Array.isArray(
            payload?.selections,
          )
            ? payload.selections
            : payload?.product?.id
              ? [payload]
              : [];

        if (
          selections.length === 0
        ) {
          return;
        }

        try {
          const appliedSelections =
            [];

          for (
            const selection of
            selections
          ) {
            const selectionPayload =
              {
                ...selection,

                reward:
                  selection.reward ||
                  payload.reward,
              };

            const wasApplied =
              await addRewardDiscountProductToCart(
                selectionPayload,
              );

            if (wasApplied) {
              appliedSelections.push(
                selectionPayload,
              );
            }
          }

          if (
            appliedSelections.length ===
            0
          ) {
            return;
          }

          const appliedProductQuantity =
            appliedSelections.reduce(
              (
                sum,
                selection,
              ) =>
                sum +
                Math.max(
                  Number(
                    selection.quantity ||
                      1,
                  ),
                  1,
                ),
              0,
            );

          const appliedDiscountAmount =
            appliedSelections.reduce(
              (
                sum,
                selection,
              ) =>
                sum +
                Math.max(
                  Math.floor(
                    Number(
                      selection.discountAmount ||
                        0,
                    ),
                  ),
                  0,
                ) *
                  Math.max(
                    Number(
                      selection.quantity ||
                        1,
                    ),
                    1,
                  ),
              0,
            );

          const appliedProductNames =
            appliedSelections
              .map(
                (selection) =>
                  selection.product
                    ?.name ||
                  selection.product
                    ?.barcode ||
                  "PRODUCTO",
              )
              .join(", ");

          const appliedReward = {
            ...payload.reward,

            redeemQuantity:
              getRewardRedeemQuantity(
                payload.reward,
              ),

            reward_application_status:
              "applied_product_discount",

            appliedProductId:
              appliedSelections[0]
                ?.product?.id ||
              null,

            appliedProductName:
              appliedProductNames,

            appliedProductQuantity,

            appliedDiscountAmount,
          };

          setCurrentSaleReward(
            (previousRewards) =>
              mergeAppliedRewards(
                previousRewards,
                [appliedReward],
              ),
          );

          const remainingQueue =
            pendingProductDiscountRewards.filter(
              (reward) =>
                reward.id !==
                payload.reward.id,
            );

          if (
            remainingQueue.length >
            0
          ) {
            setPendingProductDiscountRewards(
              remainingQueue,
            );

            setActiveProductDiscountReward(
              remainingQueue[0],
            );

            setProductDiscountRewardModalOpen(
              true,
            );

            return;
          }

          setPendingProductDiscountRewards(
            [],
          );

          setActiveProductDiscountReward(
            null,
          );

          setProductDiscountRewardModalOpen(
            false,
          );
        } catch (error) {
          console.error(
            "Error aplicando descuento de recompensa:",
            error,
          );

          showAppWarning(
            error?.message ||
              "No se pudo aplicar el descuento de recompensa.",
          );
        }
      },
      [
        addRewardDiscountProductToCart,
        setCurrentSaleReward,
        mergeAppliedRewards,
        pendingProductDiscountRewards,
        setPendingProductDiscountRewards,
        setActiveProductDiscountReward,
        setProductDiscountRewardModalOpen,
        showAppWarning,
      ],
    );

  const currentSaleRewards =
    useMemo(
      () =>
        getSyncedRewardsFromCart(
          productos,
          currentSaleReward,
        ),
      [
        productos,
        currentSaleReward,
      ],
    );

  const currentSaleRewardsLabel =
    useMemo(() => {
      const pendingRewardItems =
        normalizeRewardsArray(
          currentSaleReward,
        ).filter(
          isPendingProductDiscountReward,
        );

      const appliedRewards =
        currentSaleRewards.filter(
          (reward) =>
            !isPendingProductDiscountReward(
              reward,
            ),
        );

      const totalQuantity =
        currentSaleRewards.reduce(
          (sum, reward) =>
            sum +
            getRewardRedeemQuantity(
              reward,
            ),
          0,
        );

      const appliedQuantity =
        appliedRewards.reduce(
          (sum, reward) =>
            sum +
            getRewardRedeemQuantity(
              reward,
            ),
          0,
        );

      const pendingQuantity =
        pendingRewardItems.reduce(
          (sum, reward) =>
            sum +
            getRewardRedeemQuantity(
              reward,
            ),
          0,
        );

      if (
        totalQuantity === 0
      ) {
        return "";
      }

      if (
        pendingQuantity > 0 &&
        appliedQuantity > 0
      ) {
        return `Canjes aplicados: ${appliedQuantity} · Pendientes: ${pendingQuantity}`;
      }

      if (
        pendingQuantity > 0
      ) {
        return `Canjes pendientes: ${pendingQuantity}`;
      }

      return `Canjes aplicados: ${appliedQuantity}`;
    }, [
      currentSaleReward,
      currentSaleRewards,
    ]);

  return {
    currentSaleRewards,
    currentSaleRewardsLabel,

    syncCurrentSaleRewardsWithCart,

    handleAssignClient,

    handleConfirmRewardProducts,
    handleCloseRewardProductModal,

    handleConfirmProductDiscountReward,
    handleCloseProductDiscountRewardModal,
  };
};

export default useSalesRewards;