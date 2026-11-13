import { useState, useCallback } from "react";

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
    children: null,
    branches: [],
    onConfirm: null,
    onCancel: null,
  });

  const closeAppModal = useCallback(() => {
    setAppModal((prev) => ({
      ...prev,
      isOpen: false,
      loading: false,
      children: null,
      branches: [],
      onConfirm: null,
      onCancel: null,
    }));
  }, []);

  const showAppAlert = useCallback(
    ({
      type = "info",
      title = "Aviso",
      message = "",
      confirmText = "Entendido",
      children = null,
      branches = [],
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
        children,
        branches,
        onConfirm: onConfirm || closeAppModal,
        onCancel: closeAppModal,
      });
    },
    [closeAppModal]
  );

  const setAppModalLoading = useCallback((loading) => {
    setAppModal((prev) => ({
      ...prev,
      loading,
    }));
  }, []);

  const showAppConfirm = useCallback(
    ({
      type = "warning",
      title = "Confirmar acción",
      message = "",
      confirmText = "Confirmar",
      cancelText = "Cancelar",
      onConfirm,
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
        children: null,
        branches: [],
        onConfirm: async () => {
          closeAppModal();

          if (onConfirm) {
            await onConfirm();
          }
        },
        onCancel: closeAppModal,
      });
    },
    [closeAppModal]
  );

  return {
    appModal,
    closeAppModal,
    setAppModalLoading,
    showAppAlert,
    showAppConfirm,
  };
};
