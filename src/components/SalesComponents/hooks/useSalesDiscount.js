import { useCallback } from "react";
import { isRewardCartItem, isSameCartItem } from "../utils/salesCartUtils";

const useSalesDiscount = ({
  productosRef,
  selectedProduct,
  setProductos,
  setSelectedProduct,
  setDiscountModalOpen,
  showAppWarning,
}) => {
  const handleApplyDiscount = useCallback(
    (discountData) => {
      if (!selectedProduct) return;

      if (isRewardCartItem(selectedProduct)) {
        showAppWarning("No puedes aplicar descuento manual a un producto aplicado como recompensa.");
        return;
      }

      const newPrice = Number.parseFloat(discountData?.newPrice);

      if (Number.isNaN(newPrice) || newPrice < 0) {
        showAppWarning("Precio de descuento inválido.");
        return;
      }

      const currentProducts = productosRef.current || [];

      const updatedProducts = currentProducts.map((product) => {
        if (!isSameCartItem(product, selectedProduct)) return product;

        const originalPrice = Number(
          product.precioOriginal ?? discountData?.originalPrice ?? product.precio ?? 0
        );
        const quantity = Number(product.cantidad || 0);
        const finalPrice = newPrice;
        
        const unitDiscount = Math.max(originalPrice - finalPrice, 0);
        const totalDiscount = unitDiscount * quantity;
        const discountPercent = originalPrice > 0 ? (unitDiscount / originalPrice) * 100 : 0;

        return {
          ...product,
          precioOriginal: originalPrice,
          precio: finalPrice,
          importe: finalPrice * quantity,
          descuentoTipo: totalDiscount > 0 ? "amount" : null,
          descuentoValor: unitDiscount,
          descuentoMonto: totalDiscount,
          discountPercent: totalDiscount > 0 ? Number(discountPercent.toFixed(2)) : 0,
        };
      });

      // Actualización síncrona segura
      productosRef.current = updatedProducts;
      setProductos(updatedProducts);

      const updatedSelected = updatedProducts.find((product) => isSameCartItem(product, selectedProduct));
      setSelectedProduct(updatedSelected || null);
    },
    [productosRef, selectedProduct, setProductos, setSelectedProduct, showAppWarning]
  );

  const handleOpenDiscountModal = useCallback(() => {
    if (!selectedProduct) {
      showAppWarning("Por favor, selecciona un producto primero");
      return;
    }

    if (selectedProduct.is_reward_item) {
      showAppWarning("No puedes aplicar descuento manual a un producto aplicado como recompensa.");
      return;
    }

    if (selectedProduct.is_reward_discount_item) {
      showAppWarning("Este producto ya tiene un descuento aplicado por recompensa. No se puede aplicar otro descuento manual.");
      return;
    }

    setDiscountModalOpen(true);
  }, [selectedProduct, setDiscountModalOpen, showAppWarning]);

  return {
    handleApplyDiscount,
    handleOpenDiscountModal,
  };
};

export default useSalesDiscount;