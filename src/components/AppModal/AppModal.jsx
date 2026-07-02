import React, { useEffect } from "react";
import styles from "./AppModal.module.css";

const AppModal = ({
  isOpen,
  type = "info",
  title = "",
  message = "",
  confirmText = "Aceptar",
  cancelText = "Cancelar",
  showCancel = false,
  loading = false,
  onConfirm,
  onCancel,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key !== "Enter" && event.key !== "Escape") return;

      event.preventDefault();
      event.stopPropagation();

      if (event.nativeEvent?.stopImmediatePropagation) {
        event.nativeEvent.stopImmediatePropagation();
      }

      if (typeof event.stopImmediatePropagation === "function") {
        event.stopImmediatePropagation();
      }

      if (loading) return;

      if (event.key === "Enter") {
        if (onConfirm) {
          onConfirm();
          return;
        }

        if (onClose) {
          onClose();
        }

        return;
      }

      if (event.key === "Escape") {
        if (showCancel && onCancel) {
          onCancel();
          return;
        }

        if (onClose) {
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen, loading, showCancel, onConfirm, onCancel, onClose]);

  if (!isOpen) return null;

  const typeConfig = {
    info: {
      icon: "i",
      className: styles.info,
    },
    success: {
      icon: "✓",
      className: styles.success,
    },
    warning: {
      icon: "!",
      className: styles.warning,
    },
    danger: {
      icon: "!",
      className: styles.danger,
    },
  };

  const config = typeConfig[type] || typeConfig.info;

  const handleConfirm = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    if (loading) return;

    if (onConfirm) {
      onConfirm();
      return;
    }

    if (onClose) {
      onClose();
    }
  };

  const handleCancel = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    if (loading) return;

    if (onCancel) {
      onCancel();
      return;
    }

    if (onClose) {
      onClose();
    }
  };

  const handleOverlayClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleModalClick = (event) => {
    event.stopPropagation();
  };

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      onClick={handleOverlayClick}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <div
        className={`${styles.modal} ${config.className}`}
        onClick={handleModalClick}
      >
        <div className={styles.body}>
          <div className={styles.iconWrapper}>
            <span className={styles.icon}>{config.icon}</span>
          </div>

          <div className={styles.content}>
            {title && <h3 className={styles.title}>{title}</h3>}

            {message && <p className={styles.message}>{message}</p>}
          </div>
        </div>

        <div className={styles.actions}>
          {showCancel && (
            <button
              type="button"
              className={styles.cancelButton}
              onClick={handleCancel}
              disabled={loading}
            >
              {cancelText}
            </button>
          )}

          <button
            type="button"
            className={styles.confirmButton}
            onClick={handleConfirm}
            disabled={loading}
            autoFocus
          >
            {loading ? "Procesando..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppModal;
