import { useState } from "react";

export const INITIAL_APP_MODAL = {
  isOpen: false,
  type: "info",
  title: "",
  message: "",
  confirmText: "Entendido",
  cancelText: "Cancelar",
  showCancel: false,
  loading: false,
  onConfirm: null,
  onCancel: null,
};

// Estado del modal de avisos de las pantallas de inventario (Agregar, Ajustes):
// un aviso informativo a la vez, cerrable desde confirmar o cancelar.
const useInventoryAlertModal = () => {
  const [appModal, setAppModal] = useState(INITIAL_APP_MODAL);

  const closeAppModal = () => {
    setAppModal((previous) => ({
      ...previous,
      isOpen: false,
      loading: false,
      onConfirm: null,
      onCancel: null,
    }));
  };

  const showAppAlert = ({
    type = "info",
    title = "Aviso",
    message = "",
    confirmText = "Entendido",
  }) => {
    setAppModal({
      isOpen: true,
      type,
      title,
      message,
      confirmText,
      cancelText: "Cancelar",
      showCancel: false,
      loading: false,
      onConfirm: closeAppModal,
      onCancel: closeAppModal,
    });
  };

  return { appModal, closeAppModal, showAppAlert };
};

export default useInventoryAlertModal;
