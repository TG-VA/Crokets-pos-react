import React, { useEffect, useRef, useState } from "react";
import styles from "./EntryModal.module.css";

const EntryModal = ({ isOpen, onClose, onSaveEntry }) => {
  const [entryAmount, setEntryAmount] = useState("");
  const [entryDescription, setEntryDescription] = useState("");
  const [entryError, setEntryError] = useState("");

  const amountInputRef = useRef(null);

  const resetForm = () => {
    setEntryAmount("");
    setEntryDescription("");
    setEntryError("");
  };

  const closeEntryModal = () => {
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
        closeEntryModal();
      }

      if (e.key === "Enter") {
        const tag = document.activeElement?.tagName?.toLowerCase();

        if (tag === "textarea") return;

        e.preventDefault();
        handleSaveEntry();
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

    setEntryAmount(value);
    if (entryError) setEntryError("");
  };

  const handleDescriptionChange = (e) => {
    setEntryDescription(e.target.value);
    if (entryError) setEntryError("");
  };

  const handleSaveEntry = async () => {
    const amount = parseFloat(entryAmount);

    if (!entryAmount.trim() || Number.isNaN(amount) || amount <= 0) {
      setEntryError("Por favor, ingrese un monto válido.");
      amountInputRef.current?.focus();
      return;
    }

    if (!entryDescription.trim()) {
      setEntryError("Por favor, ingrese una descripción.");
      return;
    }

    const newMovement = {
      amount,
      description: entryDescription.trim(),
      type: "entrada",
      createdAt: new Date().toISOString(),
    };

    const result = await onSaveEntry(newMovement);

    if (result !== false) {
      closeEntryModal();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={closeEntryModal}>
      <div
        className={styles.modalContainer}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h2>Registrar Entrada de Efectivo</h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={closeEntryModal}
          >
            ✕
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label htmlFor="entryAmount">Monto:</label>
            <input
              ref={amountInputRef}
              type="text"
              inputMode="decimal"
              id="entryAmount"
              value={entryAmount}
              onChange={handleAmountChange}
              placeholder="0.00"
              autoComplete="off"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="entryDescription">Descripción:</label>
            <textarea
              id="entryDescription"
              value={entryDescription}
              onChange={handleDescriptionChange}
              placeholder="Ej. Cambio, fondo de caja, etc."
              rows={4}
            />
          </div>

          {entryError && <p className={styles.errorMessage}>{entryError}</p>}
        </div>

        <div className={styles.modalActions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={closeEntryModal}
          >
            Esc - Cancelar
          </button>
          <button
            type="button"
            className={styles.saveButton}
            onClick={handleSaveEntry}
          >
            Guardar Entrada
          </button>
        </div>
      </div>
    </div>
  );
};

export default EntryModal;