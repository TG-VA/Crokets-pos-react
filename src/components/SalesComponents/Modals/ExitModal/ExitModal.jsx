import React, { useCallback, useEffect, useRef, useState } from "react";
import styles from "./ExitModal.module.css";

import ExitIcon from "../../../../assets/icons/exitIcon.svg";
import XmarkIcon from "../../../../assets/icons/xmark-solid-full.svg";

const ExitModal = ({ isOpen, onClose, onSave }) => {
  const [exitAmount, setExitAmount] = useState("");
  const [exitDescription, setExitDescription] = useState("");
  const [exitError, setExitError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const amountInputRef = useRef(null);

  const resetForm = useCallback(() => {
    setExitAmount("");
    setExitDescription("");
    setExitError("");
    setIsSaving(false);
  }, []);

  const handleClose = useCallback(() => {
    if (isSaving) return;

    resetForm();
    onClose?.();
  }, [isSaving, onClose, resetForm]);

  const handleSave = useCallback(async () => {
    if (isSaving) return;

    const amount = Number.parseFloat(exitAmount);

    if (!exitAmount.trim() || Number.isNaN(amount) || amount <= 0) {
      setExitError("Por favor, ingresa un monto válido.");
      amountInputRef.current?.focus();
      return;
    }

    if (!exitDescription.trim()) {
      setExitError("Por favor, ingresa una descripción.");
      return;
    }

    try {
      setIsSaving(true);

      const result = await onSave?.({
        amount,
        description: exitDescription.trim(),
        type: "salida",
        createdAt: new Date().toISOString(),
      });

      if (result !== false) {
        resetForm();
        onClose?.();
        return;
      }

      setIsSaving(false);
    } catch (error) {
      console.error("Error guardando salida:", error);
      setExitError(error?.message || "No se pudo registrar la salida.");
      setIsSaving(false);
    }
  }, [
    exitAmount,
    exitDescription,
    isSaving,
    onClose,
    onSave,
    resetForm,
  ]);

  useEffect(() => {
    if (!isOpen) return undefined;

    resetForm();

    const timer = setTimeout(() => {
      amountInputRef.current?.focus();
    }, 80);

    return () => clearTimeout(timer);
  }, [isOpen, resetForm]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        handleClose();
        return;
      }

      if (
        event.key === "Enter" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        event.preventDefault();
        event.stopPropagation();
        handleSave();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen, handleClose, handleSave]);

  const handleAmountChange = (event) => {
    let value = event.target.value.replace(/[^0-9.]/g, "");
    const parts = value.split(".");

    if (parts.length > 2) {
      value = `${parts[0]}.${parts.slice(1).join("")}`;
    }

    const normalizedParts = value.split(".");

    if (normalizedParts[1]?.length > 2) {
      value = `${normalizedParts[0]}.${normalizedParts[1].slice(0, 2)}`;
    }

    setExitAmount(value);

    if (exitError) {
      setExitError("");
    }
  };

  const handleDescriptionChange = (event) => {
    setExitDescription(event.target.value);

    if (exitError) {
      setExitError("");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={styles.modalOverlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        className={styles.modalContainer}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h2 id="exit-modal-title">
            <span className={styles.titleContent}>
              <img
                src={ExitIcon}
                alt=""
                className={styles.titleIcon}
                aria-hidden="true"
              />
              Registrar salida de efectivo
            </span>
          </h2>

          <button
            type="button"
            className={styles.closeButton}
            onClick={handleClose}
            disabled={isSaving}
            aria-label="Cerrar modal"
          >
            <img
              src={XmarkIcon}
              alt=""
              className={styles.closeIcon}
              aria-hidden="true"
            />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label htmlFor="exitAmount">Monto:</label>

            <input
              ref={amountInputRef}
              type="text"
              inputMode="decimal"
              id="exitAmount"
              value={exitAmount}
              onChange={handleAmountChange}
              placeholder="0.00"
              autoComplete="off"
              disabled={isSaving}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="exitDescription">Descripción:</label>

            <textarea
              id="exitDescription"
              value={exitDescription}
              onChange={handleDescriptionChange}
              placeholder="Ej. Pago a proveedor, retiro, etc."
              rows={4}
              disabled={isSaving}
            />
          </div>

          {exitError && (
            <p className={styles.errorMessage} role="alert">
              {exitError}
            </p>
          )}
        </div>

        <div className={styles.modalActions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={handleClose}
            disabled={isSaving}
          >
            ESC - Cancelar
          </button>

          <button
            type="button"
            className={styles.saveButton}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Guardando..." : "Guardar salida"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExitModal;