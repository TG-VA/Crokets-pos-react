import { useCallback } from "react";

const useSalesStockValidation = ({
  productosRef,
  refreshCartInventoryFromRealtime,
  getKitAvailableStock,
  getBranchInventoryRow,
  showAppWarning,
}) => {
  const validateCartStockBeforeSale = useCallback(async () => {
    try {
      // 1. Refrescar el inventario base
      await refreshCartInventoryFromRealtime();

      const currentProducts = productosRef.current || [];
      
      // 2. Agrupar cantidades por ID (Soluciona el bug de sobreventa en recompensas separadas)
      const trackedItemsMap = new Map();
      
      for (const item of currentProducts) {
        if (!item?.tracks_inventory) continue;
        
        if (trackedItemsMap.has(item.id)) {
          trackedItemsMap.get(item.id).cantidad += Number(item.cantidad || 0);
        } else {
          trackedItemsMap.set(item.id, { 
            id: item.id, 
            is_kit: item.is_kit, 
            nombre: item.nombre || item.codigo || "PRODUCTO", 
            cantidad: Number(item.cantidad || 0) 
          });
        }
      }

      const trackedItems = Array.from(trackedItemsMap.values());

      // 3. Consultas en Paralelo (Evita el cuello de botella N+1)
      const validationResults = await Promise.all(
        trackedItems.map(async (item) => {
          if (item.is_kit) {
            const kitAvailability = await getKitAvailableStock(item.id);
            const currentStock = Number(kitAvailability?.availableStock || 0);
            
            if (!kitAvailability?.isValid || currentStock <= 0) {
              return { isValid: false, message: kitAvailability?.message || `El kit "${item.nombre}" ya no tiene inventario suficiente.` };
            }
            if (item.cantidad > currentStock) {
              return { isValid: false, message: `La cantidad del kit "${item.nombre}" excede el inventario disponible. Disponible: ${currentStock}.` };
            }
            return { isValid: true };
          }

          const inventoryRow = await getBranchInventoryRow(item.id);
          
          if (!inventoryRow) return { isValid: false, message: `El producto "${item.nombre}" ya no existe en el inventario de esta sucursal.` };
          if (inventoryRow.is_active === false) return { isValid: false, message: `El producto "${item.nombre}" está inactivo en esta sucursal.` };

          const currentStock = Number(inventoryRow.stock || 0);
          
          if (!inventoryRow.has_been_stocked && currentStock <= 0) {
            return { isValid: false, message: `El producto "${item.nombre}" aún no tiene inventario inicial registrado.` };
          }
          if (currentStock <= 0) return { isValid: false, message: `El producto "${item.nombre}" ya no tiene existencia.` };
          if (item.cantidad > currentStock) {
            return { isValid: false, message: `La cantidad de "${item.nombre}" excede el inventario disponible. Disponible: ${currentStock}.` };
          }

          return { isValid: true };
        })
      );

      // 4. Verificar si alguna validación falló
      const failedValidation = validationResults.find((result) => !result.isValid);
      
      if (failedValidation) {
        showAppWarning(failedValidation.message);
        return false;
      }

      return true;

    } catch (error) {
      console.error("Error validando inventario antes de cobrar:", error);
      showAppWarning(error?.message || "No se pudo validar el inventario antes de cobrar.");
      return false;
    }
  }, [
    getBranchInventoryRow,
    getKitAvailableStock,
    productosRef,
    refreshCartInventoryFromRealtime,
    showAppWarning,
  ]);

  return { validateCartStockBeforeSale };
};

export default useSalesStockValidation;