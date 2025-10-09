import React, { useState, useEffect } from "react";
import styles from "./NotesModal.module.css";

const NotesModal = ({ isOpen, onClose, onSave, initialNotes = "" }) => {
  const [notes, setNotes] = useState(initialNotes);

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation(); // Evita que otros listeners se ejecuten
        handleClose();
      }
    };

    if (isOpen) {
      // Usar capture: true para capturar el evento antes que otros listeners
      document.addEventListener("keydown", handleKeyDown, true);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen]);

  const handleClose = () => {
    setNotes("");
    onClose();
  };

  const handleSave = () => {
    if (onSave) {
      onSave(notes);
    }
    console.log("Notas guardadas:", notes);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div
        className={styles.notesModal}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h2>Agregar Notas</h2>
          <button
            className={styles.closeButton}
            onClick={handleClose}
          >
            ✕
          </button>
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
          <div className={styles.characterCount}>
            {notes.length}/500 caracteres
          </div>
        </div>

        <div className={styles.modalActions}>
          <button
            className={styles.cancelButton}
            onClick={handleClose}
          >
            ESC - Cancelar
          </button>
          <button
            className={styles.saveButton}
            onClick={handleSave}
          >
            Guardar Notas
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotesModal;