import { useState } from "react";

export const useAppModal = () => {
  const [appModal, setAppModal] = useState({
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
  });

  const closeAppModal = () => {
    setAppModal((prev) => ({
      ...prev,
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
    onConfirm = null,
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
      onConfirm: onConfirm || closeAppModal,
      onCancel: closeAppModal,
    });
  };

  const setAppModalLoading = (loading) => {
    setAppModal((prev) => ({
      ...prev,
      loading,
    }));
  };

  const showAppConfirm = ({
    type = "warning",
    title = "Confirmar acción",
    message = "",
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    onConfirm,
    closeOnConfirm = true,
  }) => {
    setAppModal({
      isOpen: true,
      type,
      title,
      message,
      confirmText,
      cancelText,
      showCancel: true,
      loading: false,
      onConfirm: async () => {
        if (closeOnConfirm) {
          closeAppModal();
        }

        if (onConfirm) {
          await onConfirm();
        }
      },
      onCancel: closeAppModal,
    });
  };

  return {
    appModal,
    closeAppModal,
    setAppModalLoading,
    showAppAlert,
    showAppConfirm,
  };
};
