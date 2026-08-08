import React, { useCallback, useEffect, useRef, useState, memo } from "react";
import styles from "./ExitModal.module.css";
import ExitIcon from "../../../../assets/icons/exitIcon.svg";
import XmarkIcon from "../../../../assets/icons/xmark-solid-full.svg";

const ExitModal = memo(({ isOpen, onClose, onSave }) => {
  const [exitAmount, setExitAmount] = useState("");
  const [exitDescription, setExitDescription] = useState("");
  const [exitError, setExitError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const amountInputRef = useRef(null);

  const resetForm = useCallback(() => {
    setExitAmount(""); setExitDescription(""); setExitError(""); setIsSaving(false);
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
      return amountInputRef.current?.focus();
    }

    if (!exitDescription.trim()) return setExitError("Por favor, ingresa una descripción.");

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
        return onClose?.();
      }
      setIsSaving(false);
    } catch (error) {
      console.error("Error guardando salida:", error);
      setExitError(error?.message || "No se pudo registrar la salida.");
      setIsSaving(false);
    }
  }, [exitAmount, exitDescription, isSaving, onClose, onSave, resetForm]);

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
        e.preventDefault(); e.stopPropagation(); handleClose();
      } else if (e.key === "Enter" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault(); e.stopPropagation(); handleSave();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, handleClose, handleSave]);

  const handleAmountChange = (e) => {
    let val = e.target.value.replace(/[^0-9.]/g, "");
    const parts = val.split(".");
    if (parts.length > 2) val = `${parts[0]}.${parts.slice(1).join("")}`;

    const finalParts = val.split(".");
    if (finalParts[1]?.length > 2) val = `${finalParts[0]}.${finalParts[1].slice(0, 2)}`;

    setExitAmount(val);
    if (exitError) setExitError("");
  };

  const handleDescriptionChange = (e) => {
    setExitDescription(e.target.value);
    if (exitError) setExitError("");
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onMouseDown={(e) => e.target === e.currentTarget && handleClose()}>
      <div className={styles.modalContainer} role="dialog" aria-modal="true" aria-labelledby="exit-modal-title" onMouseDown={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 id="exit-modal-title">
            <span className={styles.titleContent}>
              <img src={ExitIcon} alt="" className={styles.titleIcon} aria-hidden="true" />
              Registrar salida de efectivo
            </span>
          </h2>
          <button type="button" className={styles.closeButton} onClick={handleClose} disabled={isSaving} aria-label="Cerrar modal">
            <img src={XmarkIcon} alt="" className={styles.closeIcon} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label htmlFor="exitAmount">Monto:</label>
            <input ref={amountInputRef} type="text" inputMode="decimal" id="exitAmount" value={exitAmount} onChange={handleAmountChange} placeholder="0.00" autoComplete="off" disabled={isSaving} />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="exitDescription">Descripción:</label>
            <textarea id="exitDescription" value={exitDescription} onChange={handleDescriptionChange} placeholder="Ej. Pago a proveedor, retiro, etc." rows={4} disabled={isSaving} />
          </div>

          {exitError && <p className={styles.errorMessage} role="alert">{exitError}</p>}
        </div>

        <div className={styles.modalActions}>
          <button type="button" className={styles.cancelButton} onClick={handleClose} disabled={isSaving}>ESC - Cancelar</button>
          <button type="button" className={styles.saveButton} onClick={handleSave} disabled={isSaving}>{isSaving ? "Guardando..." : "Guardar salida"}</button>
        </div>
      </div>
    </div>
  );
});

export default ExitModal;