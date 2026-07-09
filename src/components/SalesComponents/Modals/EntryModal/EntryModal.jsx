import React, { useEffect, useRef, useState } from "react";
import styles from "./EntryModal.module.css";

import EntryIcon from "../../../../assets/icons/entryIcon.svg";
import XmarkIcon from "../../../../assets/icons/xmark-solid-full.svg";

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

        closeEntryModal();
        return;
      }

      if (event.key === "Enter") {
        const tag = document.activeElement?.tagName?.toLowerCase();

        if (tag === "textarea") return;

        event.preventDefault();
        event.stopPropagation();

        handleSaveEntry();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen, entryAmount, entryDescription]);

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

    setEntryAmount(value);

    if (entryError) {
      setEntryError("");
    }
  };

  const handleDescriptionChange = (event) => {
    setEntryDescription(event.target.value);

    if (entryError) {
      setEntryError("");
    }
  };

  const handleSaveEntry = async () => {
    const amount = parseFloat(entryAmount);

    if (!entryAmount.trim() || Number.isNaN(amount) || amount <= 0) {
      setEntryError("Por favor, ingresa un monto válido.");
      amountInputRef.current?.focus();
      return;
    }

    if (!entryDescription.trim()) {
      setEntryError("Por favor, ingresa una descripción.");
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
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h2>
            <span className={styles.titleContent}>
              <img
                src={EntryIcon}
                alt=""
                className={styles.titleIcon}
                aria-hidden="true"
              />
              Registrar entrada de efectivo
            </span>
          </h2>

          <button
            type="button"
            className={styles.closeButton}
            onClick={closeEntryModal}
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
            ESC - Cancelar
          </button>

          <button
            type="button"
            className={styles.saveButton}
            onClick={handleSaveEntry}
          >
            Guardar entrada
          </button>
        </div>
      </div>
    </div>
  );
};

export default EntryModal;