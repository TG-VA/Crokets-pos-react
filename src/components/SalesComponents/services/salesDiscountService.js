import { isRewardCartItem, isSameCartItem } from "../utils/salesCartUtils";

/**
 * Procesa matemáticamente un descuento manual sobre un producto del carrito.
 * Retorna el nuevo carrito y el producto actualizado para mantener la inmutabilidad.
 */
export const applyManualDiscountToCart = (currentCart, selectedProduct, discountData) => {
  if (!selectedProduct) {
    return { success: false, message: "No hay producto seleccionado." };
  }

  if (isRewardCartItem(selectedProduct)) {
    return { success: false, message: "No puedes aplicar descuento manual a un producto aplicado como recompensa." };
  }

  const newPrice = Number.parseFloat(discountData?.newPrice);

  if (Number.isNaN(newPrice) || newPrice < 0) {
    return { success: false, message: "Precio de descuento inválido." };
  }

  let nextSelectedProduct = null;

  const nextCart = currentCart.map((product) => {
    if (!isSameCartItem(product, selectedProduct)) return product;

    const originalPrice = Number(product.precioOriginal ?? discountData?.originalPrice ?? product.precio ?? 0);
    const quantity = Number(product.cantidad || 0);
    const finalPrice = newPrice;
    
    const unitDiscount = Math.max(originalPrice - finalPrice, 0);
    const totalDiscount = unitDiscount * quantity;
    const discountPercent = originalPrice > 0 ? (unitDiscount / originalPrice) * 100 : 0;

    const updatedProduct = {
      ...product,
      precioOriginal: originalPrice,
      precio: finalPrice,
      importe: finalPrice * quantity,
      descuentoTipo: totalDiscount > 0 ? "amount" : null,
      descuentoValor: unitDiscount,
      descuentoMonto: totalDiscount,
      discountPercent: totalDiscount > 0 ? Number(discountPercent.toFixed(2)) : 0,
    };

    nextSelectedProduct = updatedProduct;
    return updatedProduct;
  });

  return { 
    success: true, 
    nextCart, 
    nextSelectedProduct 
  };
};
