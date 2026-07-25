import {
  useCallback,
  useEffect,
  useRef,
} from "react";

import { supabase } from "../../../lib/supabaseClient";

import {
  getBranchInventoryRows,
  getKitAvailableStock as getKitAvailableStockFromService,
} from "../services/salesInventoryService";

const REALTIME_REFRESH_DELAY = 500;
const INVENTORY_REFRESH_INTERVAL = 2500;

const getUniqueProductIds = (
  products = []
) => {
  return [
    ...new Set(
      products
        .map((product) => product?.id)
        .filter(Boolean)
    ),
  ];
};

const buildInventoryMap = (
  inventoryRows = []
) => {
  return inventoryRows.reduce(
    (result, row) => {
      if (!row?.product_id) {
        return result;
      }

      result[row.product_id] = row;

      return result;
    },
    {}
  );
};

const useSalesInventoryRealtime = ({
  branchId,
  userId,
  enabled = true,

  productosRef,
  setProductos,
  setSelectedProduct,
  setStockWarningMsg,

  syncShiftCutStatus,
}) => {
  const realtimeTimerRef =
    useRef(null);

  const getKitAvailableStock =
    useCallback(
      async (kitProductId) => {
        return getKitAvailableStockFromService({
          kitProductId,
          branchId,
        });
      },
      [branchId]
    );

  const refreshCartInventory =
    useCallback(async () => {
      if (!branchId) return;

      const currentProducts =
        productosRef?.current || [];

      const trackedProducts =
        currentProducts.filter(
          (product) =>
            product?.tracks_inventory
        );

      if (!trackedProducts.length) {
        setStockWarningMsg?.("");
        return;
      }

      const kitProducts =
        trackedProducts.filter(
          (product) =>
            product?.is_kit
        );

      const normalTrackedProducts =
        trackedProducts.filter(
          (product) =>
            !product?.is_kit
        );

      const productIds =
        getUniqueProductIds(
          normalTrackedProducts
        );

      try {
        const inventoryRows =
          await getBranchInventoryRows({
            branchId,
            productIds,
          });

        const inventoryByProduct =
          buildInventoryMap(
            inventoryRows
          );

        const kitAvailabilityByProduct =
          {};

        for (const kitProduct of kitProducts) {
          if (!kitProduct?.id) continue;

          kitAvailabilityByProduct[
            kitProduct.id
          ] =
            await getKitAvailableStock(
              kitProduct.id
            );
        }

        let warning = "";

        const updateProductInventory = (
          product
        ) => {
          if (
            !product?.tracks_inventory
          ) {
            return product;
          }

          if (product.is_kit) {
            const kitAvailability =
              kitAvailabilityByProduct[
                product.id
              ];

            const stock = Number(
              kitAvailability
                ?.availableStock || 0
            );

            const quantity = Number(
              product.cantidad || 0
            );

            const availableAfterCart =
              Math.max(
                stock - quantity,
                0
              );

            if (
              quantity > stock &&
              !warning
            ) {
              warning =
                `Stock actualizado: el kit "${
                  product.nombre ||
                  product.codigo
                }" ahora permite vender ${stock} kit(s) y tienes ${quantity} en venta.`;
            } else if (
              kitAvailability?.message &&
              !warning
            ) {
              warning =
                kitAvailability.message;
            }

            return {
              ...product,
              stockReal: stock,
              existencia:
                availableAfterCart,
            };
          }

          const inventoryRow =
            inventoryByProduct[
              product.id
            ];

          if (
            !inventoryRow ||
            inventoryRow.is_active ===
              false
          ) {
            if (!warning) {
              warning =
                `El producto "${
                  product.nombre ||
                  product.codigo
                }" ya no está activo en esta sucursal.`;
            }

            return {
              ...product,
              stockReal: 0,
              existencia: 0,
            };
          }

          const stock = Number(
            inventoryRow.stock || 0
          );

          const quantity = Number(
            product.cantidad || 0
          );

          const availableAfterCart =
            Math.max(
              stock - quantity,
              0
            );

          if (
            quantity > stock &&
            !warning
          ) {
            warning =
              `Stock actualizado: "${
                product.nombre ||
                product.codigo
              }" ahora tiene ${stock} disponible y tienes ${quantity} en venta.`;
          }

          return {
            ...product,

            stockReal:
              stock,

            existencia:
              availableAfterCart,

            costo:
              Number(
                inventoryRow
                  .cost_price ??
                  product.costo ??
                  0
              ),
          };
        };

        setProductos?.((previousProducts) => {
          const updatedProducts =
            previousProducts.map(
              updateProductInventory
            );

          if (productosRef) {
            productosRef.current =
              updatedProducts;
          }

          return updatedProducts;
        });

        setSelectedProduct?.(
          (previousSelectedProduct) => {
            if (
              !previousSelectedProduct
            ) {
              return previousSelectedProduct;
            }

            return updateProductInventory(
              previousSelectedProduct
            );
          }
        );

        setStockWarningMsg?.(
          warning
        );
      } catch (error) {
        console.error(
          "Error actualizando inventario del carrito:",
          error
        );
      }
    }, [
      branchId,
      productosRef,
      setProductos,
      setSelectedProduct,
      setStockWarningMsg,
      getKitAvailableStock,
    ]);

  /*
   * Sincroniza al recuperar el foco de la ventana.
   */
  useEffect(() => {
    if (!enabled) return undefined;

    const handleFocus = () => {
      if (
        typeof syncShiftCutStatus ===
        "function"
      ) {
        syncShiftCutStatus();
      }

      refreshCartInventory();
    };

    window.addEventListener(
      "focus",
      handleFocus
    );

    return () => {
      window.removeEventListener(
        "focus",
        handleFocus
      );
    };
  }, [
    enabled,
    refreshCartInventory,
    syncShiftCutStatus,
  ]);

  /*
   * Suscripción Realtime y actualización periódica.
   */
  useEffect(() => {
    if (
      !enabled ||
      !branchId ||
      !userId
    ) {
      return undefined;
    }

    const refreshSafely =
      async () => {
        try {
          if (
            typeof
              syncShiftCutStatus ===
            "function"
          ) {
            await syncShiftCutStatus();
          }

          await refreshCartInventory();
        } catch (error) {
          console.error(
            "Error actualizando ventas en tiempo real:",
            error
          );
        }
      };

    const scheduleRealtimeRefresh =
      () => {
        if (
          realtimeTimerRef.current
        ) {
          clearTimeout(
            realtimeTimerRef.current
          );
        }

        realtimeTimerRef.current =
          setTimeout(
            refreshSafely,
            REALTIME_REFRESH_DELAY
          );
      };

    refreshSafely();

    const intervalId = setInterval(
      () => {
        const hasTrackedProducts =
          (
            productosRef?.current || []
          ).some(
            (product) =>
              product?.tracks_inventory
          );

        if (hasTrackedProducts) {
          refreshCartInventory();
        }
      },
      INVENTORY_REFRESH_INTERVAL
    );

    const channel = supabase
      .channel(
        `sales-realtime-${branchId}-${userId}`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "branch_inventory",
          filter:
            `branch_id=eq.${branchId}`,
        },
        scheduleRealtimeRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cash_cuts",
          filter:
            `branch_id=eq.${branchId}`,
        },
        scheduleRealtimeRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "cash_register_sessions",
          filter:
            `branch_id=eq.${branchId}`,
        },
        scheduleRealtimeRefresh
      )
      .subscribe();

    return () => {
      clearInterval(intervalId);

      if (
        realtimeTimerRef.current
      ) {
        clearTimeout(
          realtimeTimerRef.current
        );

        realtimeTimerRef.current =
          null;
      }

      supabase.removeChannel(channel);
    };
  }, [
    enabled,
    branchId,
    userId,
    productosRef,
    refreshCartInventory,
    syncShiftCutStatus,
  ]);

  return {
    refreshCartInventory,
    getKitAvailableStock,
  };
};

export default useSalesInventoryRealtime;