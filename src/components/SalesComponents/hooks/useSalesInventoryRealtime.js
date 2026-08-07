import { useCallback, useEffect, useRef } from "react";
import { supabase } from "../../../lib/supabaseClient";
import {
  getBranchInventoryRows,
  getKitAvailableStock as getKitAvailableStockFromService,
} from "../services/salesInventoryService";

const REALTIME_REFRESH_DELAY = 500;
const INVENTORY_REFRESH_INTERVAL = 180000; // 3 minutos (Fallback seguro, el realtime hace el trabajo real)

const getUniqueProductIds = (products = []) => [
  ...new Set(products.map((product) => product?.id).filter(Boolean)),
];

const buildInventoryMap = (inventoryRows = []) => {
  return inventoryRows.reduce((result, row) => {
    if (row?.product_id) result[row.product_id] = row;
    return result;
  }, {});
};

const useSalesInventoryRealtime = ({
  branchId,
  userId,
  enabled = true,
  productosRef,
  setProductos,
  setSelectedProduct,
  setStockWarningMsg,
}) => {
  const realtimeTimerRef = useRef(null);

  const getKitAvailableStock = useCallback(
    async (kitProductId) => getKitAvailableStockFromService({ kitProductId, branchId }),
    [branchId]
  );

  const refreshCartInventory = useCallback(async () => {
    if (!branchId) return;

    // Tomamos una "foto" del carrito actual
    const currentProducts = productosRef?.current || [];
    const trackedProducts = currentProducts.filter((p) => p?.tracks_inventory);

    if (!trackedProducts.length) {
      setStockWarningMsg?.("");
      return;
    }

    const kitProducts = trackedProducts.filter((p) => p?.is_kit);
    const normalTrackedProducts = trackedProducts.filter((p) => !p?.is_kit);
    const productIds = getUniqueProductIds(normalTrackedProducts);

    try {
      // Lanzamos validaciones concurrentes (Inventario normal + Kits en paralelo)
      const [inventoryRows, kitResults] = await Promise.all([
        getBranchInventoryRows({ branchId, productIds }),
        Promise.all(
          kitProducts.map(async (kit) => ({
            id: kit.id,
            data: await getKitAvailableStock(kit.id),
          }))
        ),
      ]);

      const inventoryByProduct = buildInventoryMap(inventoryRows);
      const kitAvailabilityByProduct = kitResults.reduce((acc, curr) => {
        acc[curr.id] = curr.data;
        return acc;
      }, {});

      let warning = "";

      const updateProductInventory = (product) => {
        if (!product?.tracks_inventory) return product;

        if (product.is_kit) {
          const kitAvailability = kitAvailabilityByProduct[product.id];
          // Si el producto se agregó *durante* el await, lo dejamos intacto hasta el próximo ciclo
          if (!kitAvailability) return product; 

          const stock = Number(kitAvailability?.availableStock || 0);
          const quantity = Number(product.cantidad || 0);

          if (quantity > stock && !warning) {
            warning = `Stock actualizado: el kit "${product.nombre || product.codigo}" ahora permite vender ${stock} kit(s) y tienes ${quantity} en venta.`;
          } else if (kitAvailability?.message && !warning) {
            warning = kitAvailability.message;
          }

          return { ...product, stockReal: stock, existencia: Math.max(stock - quantity, 0) };
        }

        const inventoryRow = inventoryByProduct[product.id];
        
        // Si el producto no estaba en la consulta original, lo devolvemos intacto (evita falsos negativos si se agregó mientras cargaba)
        if (!productIds.includes(product.id)) return product;

        if (!inventoryRow || inventoryRow.is_active === false) {
          if (!warning) warning = `El producto "${product.nombre || product.codigo}" ya no está activo en esta sucursal.`;
          return { ...product, stockReal: 0, existencia: 0 };
        }

        const stock = Number(inventoryRow.stock || 0);
        const quantity = Number(product.cantidad || 0);

        if (quantity > stock && !warning) {
          warning = `Stock actualizado: "${product.nombre || product.codigo}" ahora tiene ${stock} disponible y tienes ${quantity} en venta.`;
        }

        return {
          ...product,
          stockReal: stock,
          existencia: Math.max(stock - quantity, 0),
          costo: Number(inventoryRow.cost_price ?? product.costo ?? 0),
        };
      };

      // Actualizamos los estados de forma segura
      const nextProducts = currentProducts.map(updateProductInventory);
      
      if (productosRef) productosRef.current = nextProducts;
      setProductos?.(nextProducts);

      setSelectedProduct?.((prevSelected) => {
        if (!prevSelected) return prevSelected;
        return updateProductInventory(prevSelected);
      });

      setStockWarningMsg?.(warning);
    } catch (error) {
      console.error("Error actualizando inventario del carrito:", error);
    }
  }, [
    branchId,
    productosRef,
    setProductos,
    setSelectedProduct,
    setStockWarningMsg,
    getKitAvailableStock,
  ]);

  // --- Sincronización en Focus ---
  useEffect(() => {
    if (!enabled) return undefined;
    const handleFocus = () => refreshCartInventory();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [enabled, refreshCartInventory]);

  // --- Sincronización Realtime y Fallback ---
  useEffect(() => {
    if (!enabled || !branchId || !userId) return undefined;

    const refreshSafely = async () => {
      try { await refreshCartInventory(); } 
      catch (error) { console.error("Error en realtime:", error); }
    };

    const scheduleRealtimeRefresh = () => {
      if (realtimeTimerRef.current) clearTimeout(realtimeTimerRef.current);
      realtimeTimerRef.current = setTimeout(refreshSafely, REALTIME_REFRESH_DELAY);
    };

    refreshSafely();

    const intervalId = setInterval(() => {
      const hasTrackedProducts = (productosRef?.current || []).some((p) => p?.tracks_inventory);
      if (hasTrackedProducts) refreshCartInventory();
    }, INVENTORY_REFRESH_INTERVAL);

    const channel = supabase
      .channel(`sales-inventory-${branchId}-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "branch_inventory", filter: `branch_id=eq.${branchId}` },
        scheduleRealtimeRefresh
      )
      .subscribe();

    return () => {
      clearInterval(intervalId);
      if (realtimeTimerRef.current) {
        clearTimeout(realtimeTimerRef.current);
        realtimeTimerRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [enabled, branchId, userId, productosRef, refreshCartInventory]);

  return {
    refreshCartInventory,
    getKitAvailableStock,
  };
};

export default useSalesInventoryRealtime;