import React, { useState, useEffect } from "react";
import styles from "./PendingTicketModal.module.css";

const PendingTicketModal = ({ isOpen, onClose, onAccept, currentTicketNumber}) => {
  const [ticketName, setTicketName] = useState("");

  useEffect(() => {
    if (isOpen) {
      // Establecer el nombre por defecto cuando se abre el modal
      setTicketName(`Ticket ${currentTicketNumber}`);
    }
  }, [isOpen, currentTicketNumber]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleAccept();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown, true);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen, ticketName]);

  const handleClose = () => {
    setTicketName("");
    onClose();
  };

  const handleAccept = () => {
    if (ticketName.trim()) {
      onAccept(ticketName.trim());
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div
        className={styles.pendingModal}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h2>Ticket Pendiente</h2>
          <button
            className={styles.closeButton}
            onClick={handleClose}
          >
            ✕
          </button>
        </div>

        <div className={styles.modalBody}>
          <p className={styles.question}>
            ¿Qué nombre deseas asignar al ticket pendiente?
          </p>

          <div className={styles.inputSection}>
            <label htmlFor="ticketName">Nombre:</label>
            <input
              id="ticketName"
              type="text"
              className={styles.nameInput}
              value={ticketName}
              onChange={(e) => setTicketName(e.target.value)}
              placeholder="Ej. Ticket 2"
              autoFocus
            />
          </div>
        </div>

        <div className={styles.modalActions}>
          <button
            className={`${styles.actionButton} ${styles.acceptButton}`}
            onClick={handleAccept}
          >
            Aceptar
          </button>
          <button
            className={`${styles.actionButton} ${styles.cancelButton}`}
            onClick={handleClose}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default PendingTicketModal;