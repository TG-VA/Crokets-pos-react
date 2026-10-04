import { useState } from "react";

import {
  fetchCurrentAuthUser,
  insertPointsMovement,
} from "../services/pointsAdjustmentService";
import {
  buildAdjustmentSuccessMessage,
  buildPointsMovementPayload,
  canSubmitPointsAdjustment,
  getAdjustmentValidationMessage,
  getSaveGuardMessage,
} from "../services/pointsAdjustmentCalculationService";

/**
 * Revision y guardado del ajuste de puntos.
 *
 * Las reglas de habilitacion y los mensajes de bloqueo viven en el servicio de
 * calculo; aqui solo se orquestan los efectos de UI.
 */
export const usePointsAdjustmentSubmit = ({
  adminAccessStatus,
  selectedCustomer,
  numericPoints,
  adjustmentType,
  newBalance,
  signedPoints,
  adjustmentReason,
  normalizedFinalNotes,
  isGenericNote,
  branch,
  showAppAlert,
  loadCustomerPoints,
  onAdjustSaved,
}) => {
  const [saving, setSaving] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const canSubmit = canSubmitPointsAdjustment({
    adminAccessStatus,
    selectedCustomer,
    numericPoints,
    adjustmentReason,
    normalizedNotes: normalizedFinalNotes,
    isGenericNote,
    saving,
    newBalance,
    adjustmentType,
  });

  const handleOpenConfirmModal = (event) => {
    event.preventDefault();

    const validation = getAdjustmentValidationMessage({
      adminAccessStatus,
      selectedCustomer,
      numericPoints,
      adjustmentType,
      newBalance,
      adjustmentReason,
      normalizedNotes: normalizedFinalNotes,
      isGenericNote,
    });

    if (validation) {
      showAppAlert({
        type: "warning",
        ...validation,
        confirmText: "Entendido",
      });
      return;
    }

    setIsConfirmModalOpen(true);
  };

  const handleCloseConfirmModal = () => {
    setIsConfirmModalOpen(false);
  };

  const handleConfirmAdjustment = async () => {
    try {
      const guardMessage = getSaveGuardMessage({
        adminAccessStatus,
        selectedCustomer,
        context: "confirm",
      });

      if (guardMessage) {
        setIsConfirmModalOpen(false);

        showAppAlert({
          type: "warning",
          ...guardMessage,
          confirmText: "Entendido",
        });
        return;
      }

      setSaving(true);

      const authUser = await fetchCurrentAuthUser();

      await insertPointsMovement(
        buildPointsMovementPayload({
          customerId: selectedCustomer.id,
          signedPoints,
          adjustmentType,
          userId: authUser?.id,
          branchId: branch?.id,
          notes: normalizedFinalNotes,
        })
      );

      await loadCustomerPoints(selectedCustomer.id);

      const message = buildAdjustmentSuccessMessage({
        customerName: selectedCustomer.name,
        signedPoints,
      });

      onAdjustSaved();
      setIsConfirmModalOpen(false);

      showAppAlert({
        type: "success",
        title: "Ajuste registrado",
        message,
        confirmText: "Aceptar",
      });
    } catch (err) {
      console.error("Error guardando ajuste de puntos:", err);

      showAppAlert({
        type: "danger",
        title: "No se pudo registrar",
        message: err?.message || "No se pudo registrar el ajuste de puntos.",
        confirmText: "Entendido",
      });
    } finally {
      setSaving(false);
    }
  };

  return {
    canSubmit,
    handleCloseConfirmModal,
    handleConfirmAdjustment,
    handleOpenConfirmModal,
    isConfirmModalOpen,
    saving,
  };
};
