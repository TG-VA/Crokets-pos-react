import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import styles from "./EntryModal.module.css";

import EntryIcon from "../../../../assets/icons/entryIcon.svg";
import XmarkIcon from "../../../../assets/icons/xmark-solid-full.svg";

const EntryModal = ({
  isOpen,
  onClose,
  onSaveEntry,
}) => {
  const [entryAmount, setEntryAmount] = useState("");
  const [entryDescription, setEntryDescription] = useState("");
  const [entryError, setEntryError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const amountInputRef = useRef(null);

  const resetForm = useCallback(() => {
    setEntryAmount("");
    setEntryDescription("");
    setEntryError("");
    setIsSaving(false);
  }, []);

  const closeEntryModal = useCallback(() => {
    if (isSaving) return;

    resetForm();
    onClose?.();
  }, [isSaving, onClose, resetForm]);

  const handleSaveEntry = useCallback(async () => {
    if (isSaving) return;

    const amount = Number.parseFloat(entryAmount);

    if (!entryAmount.trim() || Number.isNaN(amount) || amount <= 0) {
      setEntryError("Por favor, ingresa un monto válido.");
      amountInputRef.current?.focus();
      return;
    }

    if (!entryDescription.trim()) {
      setEntryError("Por favor, ingresa una descripción.");
      return;
    }

    try {
      setIsSaving(true);

      const result = await onSaveEntry?.({
        amount,
        description: entryDescription.trim(),
        type: "entrada",
        createdAt: new Date().toISOString(),
      });

      if (result !== false) {
        resetForm();
        onClose?.();
        return;
      }

      setIsSaving(false);
    } catch (error) {
      console.error("Error guardando entrada:", error);

      setEntryError(
        error?.message ||
          "No se pudo registrar la entrada.",
      );

      setIsSaving(false);
    }
  }, [
    entryAmount,
    entryDescription,
    isSaving,
    onClose,
    onSaveEntry,
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

        closeEntryModal();
        return;
      }

      if (
        event.key === "Enter" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        event.preventDefault();
        event.stopPropagation();

        handleSaveEntry();
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown,
      true,
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown,
        true,
      );
    };
  }, [
    isOpen,
    closeEntryModal,
    handleSaveEntry,
  ]);

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

  if (!isOpen) return null;

  return (
    <div
      className={styles.modalOverlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closeEntryModal();
        }
      }}
    >
      <div
        className={styles.modalContainer}
        role="dialog"
        aria-modal="true"
        aria-labelledby="entry-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h2 id="entry-modal-title">
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
            <label htmlFor="entryAmount">
              Monto:
            </label>

            <input
              ref={amountInputRef}
              type="text"
              inputMode="decimal"
              id="entryAmount"
              value={entryAmount}
              onChange={handleAmountChange}
              placeholder="0.00"
              autoComplete="off"
              disabled={isSaving}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="entryDescription">
              Descripción:
            </label>

            <textarea
              id="entryDescription"
              value={entryDescription}
              onChange={handleDescriptionChange}
              placeholder="Ej. Cambio, fondo de caja, etc."
              rows={4}
              disabled={isSaving}
            />
          </div>

          {entryError && (
            <p
              className={styles.errorMessage}
              role="alert"
            >
              {entryError}
            </p>
          )}
        </div>

        <div className={styles.modalActions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={closeEntryModal}
            disabled={isSaving}
          >
            ESC - Cancelar
          </button>

          <button
            type="button"
            className={styles.saveButton}
            onClick={handleSaveEntry}
            disabled={isSaving}
          >
            {isSaving
              ? "Guardando..."
              : "Guardar entrada"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EntryModal;