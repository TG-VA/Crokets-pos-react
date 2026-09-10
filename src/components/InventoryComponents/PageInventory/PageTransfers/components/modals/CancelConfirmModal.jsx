import React from "react";
import AppModal from "../../../../../AppModal/AppModal";

const CancelConfirmModal = ({
  isOpen,
  folio,
  requestedUnits,
  originBranchName,
  loading,
  onConfirm,
  onCancel,
  onClose,
}) => {
  const message = folio
    ? `¿Deseas cancelar el traspaso ${folio}? ${
        requestedUnits > 0
          ? `Las ${requestedUnits} pieza(s) volverán automáticamente a ${originBranchName}. `
          : ""
      }Esta acción no se puede deshacer.`
    : "¿Deseas cancelar este traspaso? Esta acción no se puede deshacer.";

  return (
    <AppModal
      isOpen={isOpen}
      type="warning"
      title="Cancelar traspaso"
      message={message}
      confirmText="Sí, cancelar"
      cancelText="Cancelar"
      showCancel
      loading={loading}
      onConfirm={onConfirm}
      onCancel={onCancel}
      onClose={onClose}
    />
  );
};

export default CancelConfirmModal;
