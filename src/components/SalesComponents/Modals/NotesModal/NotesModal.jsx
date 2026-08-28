import React, { useState, useEffect, memo, useCallback } from "react";
import styles from "./NotesModal.module.css";
import { useEscapeKey } from "../../../../hooks/useEscapeKey";

const NotesModal = memo(({ isOpen, onClose, onSave, initialNotes = "" }) => {
  const [notes, setNotes] = useState(initialNotes);

  const handleClose = useCallback((e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setNotes("");
    onClose?.();
  }, [onClose]);

  const handleSave = useCallback((e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    onSave?.(notes);
    handleClose();
  }, [notes, onSave, handleClose]);

  useEffect(() => {
    if (isOpen) setNotes(initialNotes || "");
  }, [isOpen, initialNotes]);

  useEscapeKey((e) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent?.stopImmediatePropagation?.();
    e.stopImmediatePropagation?.();
    handleClose();
  }, isOpen);

  if (!isOpen) return null;

  return (
    <div 
      className={styles.modalOverlay} 
      // Detenemos el burbujeo en el overlay oscuro
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) handleClose(e);
      }}
    >
      <div 
        className={styles.notesModal} 
        // ESCUDO PRINCIPAL: Ningún clic dentro de esta caja blanca pasará al modal de atrás
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h2>Agregar Notas</h2>
          <button type="button" className={styles.closeButton} onClick={handleClose}>✕</button>
        </div>

        <div className={styles.notesModalBody}>
          <textarea 
            className={styles.notesTextarea} 
            value={notes} 
            onChange={(e) => setNotes(e.target.value)} 
            placeholder="Escriba aquí sus anotaciones sobre esta venta..." 
            autoFocus 
            maxLength={500} 
          />
          <div className={styles.characterCount}>{notes.length}/500 caracteres</div>
        </div>

        <div className={styles.modalActions}>
          <button type="button" className={styles.cancelButton} onClick={handleClose}>ESC - Cancelar</button>
          <button type="button" className={styles.saveButton} onClick={handleSave}>Guardar Notas</button>
        </div>
      </div>
    </div>
  );
});

export default NotesModal;