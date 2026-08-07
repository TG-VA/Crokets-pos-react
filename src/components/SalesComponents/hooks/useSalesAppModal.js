import { useState, useCallback } from "react";

const useSalesAppModal = () => {
  const [appModal, setAppModal] = useState({
    isOpen: false,
    type: "warning",
    title: "",
    message: "",
    confirmText: "Entendido",
    cancelText: "Cancelar",
    showCancel: false,
    onConfirm: null,
    onCancel: null,
  });

  const closeAppModal = useCallback(() => {
    setAppModal((prev) => ({
      ...prev,
      isOpen: false,
      showCancel: false,
      onConfirm: null,
      onCancel: null,
    }));
  }, []);

  const showAppModal = useCallback(
    ({
      type = "warning",
      title = "Aviso",
      message = "",
      confirmText = "Entendido",
      cancelText = "Cancelar",
      showCancel = false,
      onConfirm = null,
      onCancel = null,
    }) => {
      setAppModal({
        isOpen: true,
        type,
        title,
        message: String(message || ""),
        confirmText,
        cancelText,
        showCancel,
        onConfirm,
        onCancel,
      });
    },
    []
  );

  const showAppWarning = useCallback(
    (message, title = "Aviso") => {
      showAppModal({
        type: "warning",
        title,
        message,
        confirmText: "Entendido",
      });
    },
    [showAppModal]
  );

  const showAppSuccess = useCallback(
    (message, title = "Operación realizada") => {
      showAppModal({
        type: "success",
        title,
        message,
        confirmText: "Entendido",
      });
    },
    [showAppModal]
  );

  return {
    appModal,
    closeAppModal,
    showAppModal,
    showAppWarning,
    showAppSuccess,
  };
};

export default useSalesAppModal;