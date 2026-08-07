import { useCallback } from "react";
import { checkUserIsAdmin } from "../../../lib/permissionsService";
import { getBranchInventoryRow as getBranchInventoryRowFromService } from "../services/salesInventoryService";

const useSalesFlowHandlers = ({
  user,
  branch,
  shiftAlreadyCut,
  setPendingFreeProductRewards,
  setRewardProductModalOpen,
  setPendingProductDiscountRewards,
  setActiveProductDiscountReward,
  setProductDiscountRewardModalOpen,
  setClientModalOpen,
  setExitModalOpen,
  setExitAuthModalOpen,
  showAppWarning,
}) => {
  // 1. Envoltorio para obtener fila de inventario
  const getBranchInventoryRow = useCallback(
    async (productId) => {
      return getBranchInventoryRowFromService({
        branchId: branch?.id,
        productId,
      });
    },
    [branch?.id]
  );

  // 2. Lógica para abrir modal de clientes limpiando recompensas
  const openClientModal = useCallback(() => {
    setPendingFreeProductRewards([]);
    setRewardProductModalOpen(false);
    setPendingProductDiscountRewards([]);
    setActiveProductDiscountReward(null);
    setProductDiscountRewardModalOpen(false);
    setClientModalOpen(true);
  }, [
    setPendingFreeProductRewards,
    setRewardProductModalOpen,
    setPendingProductDiscountRewards,
    setActiveProductDiscountReward,
    setProductDiscountRewardModalOpen,
    setClientModalOpen,
  ]);

  // 3. Flujo asíncrono para verificar permisos antes de hacer una salida de efectivo
  const openExitFlow = useCallback(async () => {
    if (shiftAlreadyCut) {
      showAppWarning(
        "El turno ya fue cortado. Debes cerrar turno antes de hacer movimientos."
      );
      return;
    }

    const isAdmin = await checkUserIsAdmin(user?.id);

    if (isAdmin) {
      setExitModalOpen(true);
      return;
    }

    setExitAuthModalOpen(true);
  }, [
    shiftAlreadyCut,
    user?.id,
    showAppWarning,
    setExitModalOpen,
    setExitAuthModalOpen,
  ]);

  return {
    getBranchInventoryRow,
    openClientModal,
    openExitFlow,
  };
};

export default useSalesFlowHandlers;