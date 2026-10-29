import React, { useState, useEffect, memo, useCallback } from "react";
import styles from "./NotesModal.module.css";
import { useEscapeKey } from "../../../../hooks/useEscapeKey";
import { useModalLayer } from "../../../../contexts/ModalStackContext";
import ModalCloseButton from "../../../ModalControls/ModalCloseButton";
import ModalFooterCancelButton from "../../../ModalControls/ModalFooterCancelButton";

const NotesModal = memo(({ isOpen, onClose, onSave, initialNotes = "" }) => {
  const [notes, setNotes] = useState(initialNotes);

  useModalLayer(isOpen, "notes-modal");

  const handleClose = useCallback(
    (e) => {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      setNotes("");
      onClose?.();
    },
    [onClose]
  );

  const handleSave = useCallback(
    (e) => {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      onSave?.(notes);
      handleClose();
    },
    [notes, onSave, handleClose]
  );

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
          <ModalCloseButton
            onClick={handleClose}
            className={styles.closeButton}
            iconClassName={styles.closeIcon}
          />
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
          <ModalFooterCancelButton
            onClick={handleClose}
            className={styles.cancelButton}
          />
          <button
            type="button"
            className={styles.saveButton}
            onClick={handleSave}
          >
            Guardar Notas
          </button>
        </div>
      </div>
    </div>
  );
});

export default NotesModal;
