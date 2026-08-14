import { useCallback } from "react";
import { applyManualDiscountToCart } from "../services/salesDiscountService";

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
      // 1. Delegamos las matemáticas al servicio puro
      const result = applyManualDiscountToCart(productosRef.current || [], selectedProduct, discountData);

      // 2. Control de errores
      if (!result.success) {
        showAppWarning(result.message);
        return;
      }

      // 3. Actualización de UI e Inmutabilidad
      productosRef.current = result.nextCart;
      setProductos(result.nextCart);
      setSelectedProduct(result.nextSelectedProduct || null);
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