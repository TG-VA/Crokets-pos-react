import { useCallback } from "react";
import { v4 as uuidv4 } from "uuid";

const useSalesPaymentFlow = ({
  productos,
  processingSale,
  validateShiftNotCut,
  pendingProductDiscountRewards,
  activeProductDiscountReward,
  setSaleToken,
  setShowPaymentModal,
  showAppWarning,
}) => {
  const openPaymentFlow =
    useCallback(async () => {
      if (
        !Array.isArray(productos) ||
        productos.length === 0
      ) {
        showAppWarning(
          "No hay productos en la venta.",
        );

        return false;
      }

      if (processingSale) {
        return false;
      }

      const canSell =
        await validateShiftNotCut();

      if (!canSell) {
        showAppWarning(
          "Ya realizaste el corte de cajero.\nDebes cerrar turno antes de seguir vendiendo.",
        );

        return false;
      }

      const hasPendingDiscountRewards =
        pendingProductDiscountRewards.length >
          0 ||
        Boolean(
          activeProductDiscountReward,
        );

      if (hasPendingDiscountRewards) {
        showAppWarning(
          "Termina de aplicar la recompensa de descuento antes de cobrar.",
        );

        return false;
      }

      setSaleToken(
        (currentToken) =>
          currentToken || uuidv4(),
      );

      setShowPaymentModal(true);

      return true;
    }, [
      activeProductDiscountReward,
      pendingProductDiscountRewards,
      processingSale,
      productos,
      setSaleToken,
      setShowPaymentModal,
      showAppWarning,
      validateShiftNotCut,
    ]);

  return {
    openPaymentFlow,
  };
};

export default useSalesPaymentFlow;