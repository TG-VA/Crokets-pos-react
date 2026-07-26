import { useCallback } from "react";

const useSalesStockValidation = ({
  productosRef,
  refreshCartInventoryFromRealtime,
  getKitAvailableStock,
  getBranchInventoryRow,
  showAppWarning,
}) => {
  const validateCartStockBeforeSale =
    useCallback(async () => {
      try {
        await refreshCartInventoryFromRealtime();

        const currentProducts =
          productosRef.current || [];

        for (const item of currentProducts) {
          if (!item?.tracks_inventory) {
            continue;
          }

          const itemName =
            item.nombre ||
            item.codigo ||
            "PRODUCTO";

          const itemQuantity = Number(
            item.cantidad || 0,
          );

          if (item.is_kit) {
            const kitAvailability =
              await getKitAvailableStock(
                item.id,
              );

            const currentStock = Number(
              kitAvailability
                ?.availableStock || 0,
            );

            if (
              !kitAvailability?.isValid ||
              currentStock <= 0
            ) {
              showAppWarning(
                kitAvailability?.message ||
                  `El kit "${itemName}" ya no tiene inventario suficiente.`,
              );

              return false;
            }

            if (
              itemQuantity >
              currentStock
            ) {
              showAppWarning(
                `La cantidad del kit "${itemName}" excede el inventario disponible. Disponible: ${currentStock}.`,
              );

              return false;
            }

            continue;
          }

          const inventoryRow =
            await getBranchInventoryRow(
              item.id,
            );

          if (!inventoryRow) {
            showAppWarning(
              `El producto "${itemName}" ya no existe en el inventario de esta sucursal.`,
            );

            return false;
          }

          if (
            inventoryRow.is_active ===
            false
          ) {
            showAppWarning(
              `El producto "${itemName}" está inactivo en esta sucursal.`,
            );

            return false;
          }

          const currentStock = Number(
            inventoryRow.stock || 0,
          );

          const hasBeenStocked =
            inventoryRow
              .has_been_stocked === true;

          if (
            !hasBeenStocked &&
            currentStock <= 0
          ) {
            showAppWarning(
              `El producto "${itemName}" aún no tiene inventario inicial registrado.`,
            );

            return false;
          }

          if (currentStock <= 0) {
            showAppWarning(
              `El producto "${itemName}" ya no tiene existencia.`,
            );

            return false;
          }

          if (
            itemQuantity >
            currentStock
          ) {
            showAppWarning(
              `La cantidad de "${itemName}" excede el inventario disponible. Disponible: ${currentStock}.`,
            );

            return false;
          }
        }

        return true;
      } catch (error) {
        console.error(
          "Error validando inventario antes de cobrar:",
          error,
        );

        showAppWarning(
          error?.message ||
            "No se pudo validar el inventario antes de cobrar.",
        );

        return false;
      }
    }, [
      getBranchInventoryRow,
      getKitAvailableStock,
      productosRef,
      refreshCartInventoryFromRealtime,
      showAppWarning,
    ]);

  return {
    validateCartStockBeforeSale,
  };
};

export default useSalesStockValidation;