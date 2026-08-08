import React, { useState, useEffect, memo, useCallback } from "react";
import styles from "./NotesModal.module.css";

const NotesModal = memo(({ isOpen, onClose, onSave, initialNotes = "" }) => {
  const [notes, setNotes] = useState(initialNotes);

  const handleClose = useCallback(() => {
    setNotes("");
    onClose?.();
  }, [onClose]);

  const handleSave = useCallback(() => {
    onSave?.(notes);
    handleClose();
  }, [notes, onSave, handleClose]);

  useEffect(() => {
    if (isOpen) setNotes(initialNotes || "");
  }, [isOpen, initialNotes]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault(); e.stopPropagation(); e.nativeEvent?.stopImmediatePropagation?.(); e.stopImmediatePropagation?.(); handleClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className={styles.notesModal}>
        <div className={styles.modalHeader}>
          <h2>Agregar Notas</h2>
          <button className={styles.closeButton} onClick={handleClose}>✕</button>
        </div>

        <div className={styles.notesModalBody}>
          <textarea className={styles.notesTextarea} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Escriba aquí sus anotaciones sobre esta venta..." autoFocus maxLength={500} />
          <div className={styles.characterCount}>{notes.length}/500 caracteres</div>
        </div>

        <div className={styles.modalActions}>
          <button className={styles.cancelButton} onClick={handleClose}>ESC - Cancelar</button>
          <button className={styles.saveButton} onClick={handleSave}>Guardar Notas</button>
        </div>
      </div>
    </div>
  );
});

export default NotesModal;