import { useCallback } from "react";
import { createCashMovement, getAvailableCash } from "../services/salesCashService";

const useSalesCashMovements = ({
  userId, branchId, shiftAlreadyCut, getOpenCashSession, setCashMovements,
  showAppModal, showAppWarning, showAppSuccess,
}) => {
  
  const validateCashMovementContext = useCallback(() => {
    if (shiftAlreadyCut) {
      showAppWarning("El turno ya fue cortado. Debes cerrar turno antes de hacer movimientos.");
      return false;
    }
    if (!userId) return showAppWarning("No se detectó el usuario."), false;
    if (!branchId) return showAppWarning("No se detectó la sucursal."), false;
    
    return true;
  }, [shiftAlreadyCut, userId, branchId, showAppWarning]);

  const appendCashMovement = useCallback((movement) => {
    if (typeof setCashMovements === "function") {
      setCashMovements((prev) => [...prev, movement]);
    }
  }, [setCashMovements]);

  const handleSaveEntry = useCallback(async (newMovement) => {
    if (!validateCashMovementContext()) return false;

    try {
      const openSession = await getOpenCashSession();
      const movement = await createCashMovement({
        sessionId: openSession.id,
        userId,
        branchId,
        movementType: newMovement.type,
        amount: newMovement.amount,
        description: newMovement.description,
      });

      appendCashMovement(movement);
      showAppSuccess("Entrada de efectivo registrada correctamente.", "Entrada registrada");
      return true;
    } catch (error) {
      console.error("Error al guardar entrada de efectivo:", error);
      showAppWarning(error?.message || "No se pudo guardar la entrada de efectivo.");
      return false;
    }
  }, [validateCashMovementContext, getOpenCashSession, userId, branchId, appendCashMovement, showAppSuccess, showAppWarning]);

  const handleSaveExit = useCallback(async (newMovement) => {
    if (!validateCashMovementContext()) return false;

    try {
      const openSession = await getOpenCashSession();
      const rawAvailableCash = await getAvailableCash({ sessionId: openSession.id });
      
      const availableCash = Math.max(Number(rawAvailableCash || 0), 0);
      const exitAmount = Number(newMovement.amount);

      if (!Number.isFinite(exitAmount) || exitAmount <= 0) {
        showAppWarning("El monto de salida debe ser mayor a cero.");
        return false;
      }

      if (exitAmount > availableCash) {
        showAppWarning(`No puedes retirar $${exitAmount.toFixed(2)}. Disponible en caja: $${availableCash.toFixed(2)}`);
        return false;
      }

      const movement = await createCashMovement({
        sessionId: openSession.id,
        userId,
        branchId,
        movementType: newMovement.type,
        amount: exitAmount,
        description: newMovement.description,
      });

      appendCashMovement(movement);
      
      showAppModal({
        type: "danger",
        title: "Salida registrada",
        message: "Salida de efectivo registrada correctamente.",
        confirmText: "Entendido",
      });

      return true;
    } catch (error) {
      console.error("Error al guardar salida de efectivo:", error);
      showAppWarning(error?.message || "No se pudo guardar la salida de efectivo.");
      return false;
    }
  }, [validateCashMovementContext, getOpenCashSession, userId, branchId, appendCashMovement, showAppModal, showAppWarning]);

  return {
    handleSaveEntry,
    handleSaveExit,
  };
};

export default useSalesCashMovements;