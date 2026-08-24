import React, {
  useCallback,
  useEffect,
  useId,
  useRef,
} from "react";

import styles from "./AppModal.module.css";

const MODAL_TYPE_CONFIG = {
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

const FOCUSABLE_ELEMENTS_SELECTOR = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const isEditableElement = (element) => {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  const tagName = element.tagName.toLowerCase();

  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    element.isContentEditable
  );
};

const isButtonElement = (element) => {
  return element instanceof HTMLButtonElement;
};

const getFocusableElements = (container) => {
  if (!(container instanceof HTMLElement)) {
    return [];
  }

  return Array.from(
    container.querySelectorAll(
      FOCUSABLE_ELEMENTS_SELECTOR
    )
  ).filter((element) => {
    return (
      element instanceof HTMLElement &&
      !element.hasAttribute("disabled") &&
      element.getAttribute("aria-hidden") !== "true"
    );
  });
};

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
  children = null,
  size = "default",
}) => {
  const titleId = useId();
  const messageId = useId();

  const modalRef = useRef(null);
  const previousActiveElementRef = useRef(null);

  /*
   * Mantiene siempre los valores más recientes sin
   * obligar al efecto principal a desmontarse cuando
   * cambia loading o alguna función recibida por props.
   */
  const actionStateRef = useRef({
    loading,
    showCancel,
    onConfirm,
    onCancel,
    onClose,
  });

  actionStateRef.current = {
    loading,
    showCancel,
    onConfirm,
    onCancel,
    onClose,
  };

  const config =
    MODAL_TYPE_CONFIG[type] ||
    MODAL_TYPE_CONFIG.info;

  const executeConfirm = useCallback(() => {
    const {
      loading: currentLoading,
      onConfirm: currentOnConfirm,
      onClose: currentOnClose,
    } = actionStateRef.current;

    if (currentLoading) return;

    if (typeof currentOnConfirm === "function") {
      currentOnConfirm();
      return;
    }

    if (typeof currentOnClose === "function") {
      currentOnClose();
    }
  }, []);

  const executeCancel = useCallback(() => {
    const {
      loading: currentLoading,
      showCancel: currentShowCancel,
      onCancel: currentOnCancel,
      onClose: currentOnClose,
    } = actionStateRef.current;

    if (currentLoading) return;

    if (
      currentShowCancel &&
      typeof currentOnCancel === "function"
    ) {
      currentOnCancel();
      return;
    }

    if (typeof currentOnClose === "function") {
      currentOnClose();
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    previousActiveElementRef.current =
      document.activeElement;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const handleTabKey = (event) => {
      const focusableElements =
        getFocusableElements(modalRef.current);

      if (focusableElements.length === 0) {
        event.preventDefault();
        modalRef.current?.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement =
        focusableElements[
          focusableElements.length - 1
        ];

      const activeElement =
        document.activeElement;

      if (
        event.shiftKey &&
        (
          activeElement === firstElement ||
          !modalRef.current?.contains(activeElement)
        )
      ) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      if (
        !event.shiftKey &&
        activeElement === lastElement
      ) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Tab") {
        handleTabKey(event);
        return;
      }

      if (
        event.key !== "Enter" &&
        event.key !== "Escape"
      ) {
        return;
      }

      /*
       * Los campos editables y botones conservan
       * su comportamiento nativo con Enter.
       */
      if (
        event.key === "Enter" &&
        (
          isEditableElement(event.target) ||
          isButtonElement(event.target)
        )
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (
        typeof event.stopImmediatePropagation ===
        "function"
      ) {
        event.stopImmediatePropagation();
      }

      if (event.key === "Enter") {
        executeConfirm();
        return;
      }

      executeCancel();
    };

    window.addEventListener(
      "keydown",
      handleKeyDown,
      true
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
        true
      );

      document.body.style.overflow =
        previousOverflow;

      const previousActiveElement =
        previousActiveElementRef.current;

      if (
        previousActiveElement instanceof
          HTMLElement &&
        document.contains(previousActiveElement)
      ) {
        previousActiveElement.focus();
      }

      previousActiveElementRef.current = null;
    };
  }, [
    isOpen,
    executeConfirm,
    executeCancel,
  ]);

  if (!isOpen) return null;

  const handleConfirm = (event) => {
    event.preventDefault();
    event.stopPropagation();

    executeConfirm();
  };

  const handleCancel = (event) => {
    event.preventDefault();
    event.stopPropagation();

    executeCancel();
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
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        className={`${styles.modal} ${config.className} ${styles[`size-${size}`] || ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={
          title ? titleId : undefined
        }
        aria-describedby={
          message ? messageId : undefined
        }
        tabIndex={-1}
        onClick={handleModalClick}
      >
        <div className={styles.body}>
          <div
            className={styles.iconWrapper}
            aria-hidden="true"
          >
            <span className={styles.icon}>
              {config.icon}
            </span>
          </div>

          <div className={styles.content}>
            {title && (
              <h3
                id={titleId}
                className={styles.title}
              >
                {title}
              </h3>
            )}

            {message && (
              <p
                id={messageId}
                className={styles.message}
              >
                {message}
              </p>
            )}

            {children ? (
              <div className={styles.children}>{children}</div>
            ) : null}
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
            {loading
              ? "Procesando..."
              : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppModal;