import React, { useEffect, useRef, useState } from "react";
import styles from "./ExitModal.module.css";

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
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }

      if (e.key === "Enter") {
        const tag = document.activeElement?.tagName?.toLowerCase();

        if (tag === "textarea") return;

        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleAmountChange = (e) => {
    let value = e.target.value;

    value = value.replace(/[^0-9.]/g, "");

    const parts = value.split(".");
    if (parts.length > 2) {
      value = `${parts[0]}.${parts.slice(1).join("")}`;
    }

    if (parts[1]?.length > 2) {
      value = `${parts[0]}.${parts[1].slice(0, 2)}`;
    }

    setExitAmount(value);
    if (exitError) setExitError("");
  };

  const handleDescriptionChange = (e) => {
    setExitDescription(e.target.value);
    if (exitError) setExitError("");
  };

  const handleSave = async () => {
    const amount = parseFloat(exitAmount);

    if (!exitAmount.trim() || Number.isNaN(amount) || amount <= 0) {
      setExitError("Por favor, ingrese un monto válido.");
      amountInputRef.current?.focus();
      return;
    }

    if (!exitDescription.trim()) {
      setExitError("Por favor, ingrese una descripción.");
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
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h2>Registrar Salida de Efectivo</h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={handleClose}
          >
            ✕
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
            Esc - Cancelar
          </button>
          <button
            type="button"
            className={styles.saveButton}
            onClick={handleSave}
          >
            Guardar Salida
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExitModal;