/**
 * Evalúa las reglas de negocio de inventario y kits para determinar
 * si un producto es apto para agregarse al carrito.
 */
export const validateProductForCart = async ({
  product,
  getKitAvailableStock,
  getBranchInventoryRow,
}) => {
  if (!product?.id) return { isValid: false, message: "Producto inválido." };

  // 1. REGLAS PARA KITS
  if (product.is_kit) {
    const kitAvailability = await getKitAvailableStock(product.id);
    const stock = Number(kitAvailability?.availableStock || 0);

    if (!kitAvailability?.isValid || stock <= 0) {
      return { 
        isValid: false, 
        message: kitAvailability?.message || "Este kit no tiene inventario suficiente en sus componentes." 
      };
    }
    return { 
      isValid: true, stock, salePrice: product.sale_price, costPrice: product.cost_price, tracksInventory: true 
    };
  }

  // 2. REGLAS PARA PRODUCTOS INVENTARIADOS
  if (product.tracks_inventory) {
    const inventoryRow = await getBranchInventoryRow(product.id);

    if (!inventoryRow || inventoryRow.is_active === false) {
      return { isValid: false, message: "Este producto no está activo en el inventario de esta sucursal." };
    }

    const stock = Number(inventoryRow.stock || 0);
    const hasBeenStocked = Boolean(inventoryRow.has_been_stocked);

    if (!hasBeenStocked && stock <= 0) {
      return { isValid: false, message: "Este producto aún no tiene inventario inicial registrado." };
    }

    if (stock <= 0) {
      return { isValid: false, message: "No hay existencia disponible." };
    }

    return { 
      isValid: true, 
      stock, 
      salePrice: inventoryRow.sale_price ?? product.sale_price, 
      costPrice: inventoryRow.cost_price ?? product.cost_price, 
      tracksInventory: true 
    };
  }

  // 3. REGLAS PARA PRODUCTOS SIN INVENTARIO (Servicios, genéricos, etc.)
  return { 
    isValid: true, stock: null, salePrice: product.sale_price, costPrice: product.cost_price, tracksInventory: false 
  };
};