import React, { useCallback, useEffect, useRef, useState, memo } from "react";
import styles from "./EntryModal.module.css";
import EntryIcon from "../../../../assets/icons/entryIcon.svg";
import XmarkIcon from "../../../../assets/icons/xmark-solid-full.svg";

const EntryModal = memo(({ isOpen, onClose, onSaveEntry }) => {
  const [entryAmount, setEntryAmount] = useState("");
  const [entryDescription, setEntryDescription] = useState("");
  const [entryError, setEntryError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const amountInputRef = useRef(null);

  const resetForm = useCallback(() => {
    setEntryAmount(""); setEntryDescription(""); setEntryError(""); setIsSaving(false);
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
      return amountInputRef.current?.focus();
    }

    if (!entryDescription.trim()) return setEntryError("Por favor, ingresa una descripción.");

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
        return onClose?.();
      }
      setIsSaving(false);
    } catch (error) {
      console.error("Error guardando entrada:", error);
      setEntryError(error?.message || "No se pudo registrar la entrada.");
      setIsSaving(false);
    }
  }, [entryAmount, entryDescription, isSaving, onClose, onSaveEntry, resetForm]);

  useEffect(() => {
    if (!isOpen) return;
    resetForm();
    const timer = setTimeout(() => amountInputRef.current?.focus(), 80);
    return () => clearTimeout(timer);
  }, [isOpen, resetForm]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault(); e.stopPropagation(); closeEntryModal();
      } else if (e.key === "Enter" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault(); e.stopPropagation(); handleSaveEntry();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, closeEntryModal, handleSaveEntry]);

  const handleAmountChange = (e) => {
    let val = e.target.value.replace(/[^0-9.]/g, "");
    const parts = val.split(".");
    if (parts.length > 2) val = `${parts[0]}.${parts.slice(1).join("")}`;
    
    const finalParts = val.split(".");
    if (finalParts[1]?.length > 2) val = `${finalParts[0]}.${finalParts[1].slice(0, 2)}`;

    setEntryAmount(val);
    if (entryError) setEntryError("");
  };

  const handleDescriptionChange = (e) => {
    setEntryDescription(e.target.value);
    if (entryError) setEntryError("");
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onMouseDown={(e) => e.target === e.currentTarget && closeEntryModal()}>
      <div className={styles.modalContainer} role="dialog" aria-modal="true" aria-labelledby="entry-modal-title" onMouseDown={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 id="entry-modal-title">
            <span className={styles.titleContent}>
              <img src={EntryIcon} alt="" className={styles.titleIcon} aria-hidden="true" />
              Registrar entrada de efectivo
            </span>
          </h2>
          <button type="button" className={styles.closeButton} onClick={closeEntryModal} disabled={isSaving} aria-label="Cerrar modal">
            <img src={XmarkIcon} alt="" className={styles.closeIcon} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label htmlFor="entryAmount">Monto:</label>
            <input ref={amountInputRef} type="text" inputMode="decimal" id="entryAmount" value={entryAmount} onChange={handleAmountChange} placeholder="0.00" autoComplete="off" disabled={isSaving} />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="entryDescription">Descripción:</label>
            <textarea id="entryDescription" value={entryDescription} onChange={handleDescriptionChange} placeholder="Ej. Cambio, fondo de caja, etc." rows={4} disabled={isSaving} />
          </div>

          {entryError && <p className={styles.errorMessage} role="alert">{entryError}</p>}
        </div>

        <div className={styles.modalActions}>
          <button type="button" className={styles.cancelButton} onClick={closeEntryModal} disabled={isSaving}>ESC - Cancelar</button>
          <button type="button" className={styles.saveButton} onClick={handleSaveEntry} disabled={isSaving}>{isSaving ? "Guardando..." : "Guardar entrada"}</button>
        </div>
      </div>
    </div>
  );
});

export default EntryModal;