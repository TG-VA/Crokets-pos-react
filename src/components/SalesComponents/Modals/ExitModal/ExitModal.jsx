import React, { useEffect, useRef, useState } from "react";
import styles from "./ExitModal.module.css";

import ExitIcon from "../../../../assets/icons/exitIcon.svg";
import XmarkIcon from "../../../../assets/icons/xmark-solid-full.svg";

const ExitModal = ({ isOpen, onClose, onSave }) => {
  const [exitAmount, setExitAmount] = useState("");
  const [exitDescription, setExitDescription] = useState("");
  const [exitError, setExitError] = useState("");

  const amountInputRef = useRef(null);

  const resetForm = () => {
    setExitAmount("");
    setExitDescription("");
    setExitError("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;

    resetForm();

    const timer = setTimeout(() => {
      amountInputRef.current?.focus();
    }, 80);

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();

        if (event.nativeEvent?.stopImmediatePropagation) {
          event.nativeEvent.stopImmediatePropagation();
        }

        if (event.stopImmediatePropagation) {
          event.stopImmediatePropagation();
        }

        handleClose();
        return;
      }

      if (event.key === "Enter") {
        const tag = document.activeElement?.tagName?.toLowerCase();

        if (tag === "textarea") return;

        event.preventDefault();
        event.stopPropagation();

        handleSave();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen, exitAmount, exitDescription]);

  const handleAmountChange = (event) => {
    let value = event.target.value;

    value = value.replace(/[^0-9.]/g, "");

    const parts = value.split(".");

    if (parts.length > 2) {
      value = `${parts[0]}.${parts.slice(1).join("")}`;
    }

    if (parts[1]?.length > 2) {
      value = `${parts[0]}.${parts[1].slice(0, 2)}`;
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

  const handleSave = async () => {
    const amount = parseFloat(exitAmount);

    if (!exitAmount.trim() || Number.isNaN(amount) || amount <= 0) {
      setExitError("Por favor, ingresa un monto válido.");
      amountInputRef.current?.focus();
      return;
    }

    if (!exitDescription.trim()) {
      setExitError("Por favor, ingresa una descripción.");
      return;
    }

    const newMovement = {
      amount,
      description: exitDescription.trim(),
      type: "salida",
      createdAt: new Date().toISOString(),
    };

    const result = await onSave(newMovement);

    if (result !== false) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div
        className={styles.modalContainer}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h2>
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
            />
          </div>

          {exitError && <p className={styles.errorMessage}>{exitError}</p>}
        </div>

        <div className={styles.modalActions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={handleClose}
          >
            ESC - Cancelar
          </button>

          <button
            type="button"
            className={styles.saveButton}
            onClick={handleSave}
          >
            Guardar salida
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExitModal;