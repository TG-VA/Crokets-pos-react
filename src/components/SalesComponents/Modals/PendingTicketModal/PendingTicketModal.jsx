import React, { useState, useEffect, memo, useCallback } from "react";
import styles from "./PendingTicketModal.module.css";
import PendingIcon from "../../../../assets/icons/pendingIcon.svg";
import XmarkIcon from "../../../../assets/icons/xmark-solid-full.svg";

const PendingTicketModal = memo(({ isOpen, onClose, onAccept, currentTicketNumber }) => {
  const [ticketName, setTicketName] = useState("");

  useEffect(() => {
    if (isOpen) setTicketName(`Ticket ${currentTicketNumber}`);
  }, [isOpen, currentTicketNumber]);

  const handleClose = useCallback(() => {
    setTicketName("");
    onClose();
  }, [onClose]);

  const handleAccept = useCallback(() => {
    const cleanName = ticketName.trim();
    if (!cleanName) return;
    onAccept(cleanName);
    handleClose();
  }, [ticketName, onAccept, handleClose]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault(); e.stopPropagation(); e.nativeEvent?.stopImmediatePropagation?.(); e.stopImmediatePropagation?.();
        handleClose();
      } else if (e.key === "Enter") {
        e.preventDefault(); e.stopPropagation();
        handleAccept();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, handleClose, handleAccept]);

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className={styles.pendingModal}>
        <div className={styles.modalHeader}>
          <h2><span className={styles.titleContent}><img src={PendingIcon} alt="" className={styles.titleIcon} aria-hidden="true" /> Ticket pendiente</span></h2>
          <button type="button" className={styles.closeButton} onClick={handleClose} aria-label="Cerrar modal"><img src={XmarkIcon} alt="" className={styles.closeIcon} aria-hidden="true" /></button>
        </div>

        <div className={styles.modalBody}>
          <p className={styles.question}>¿Qué nombre deseas asignar al ticket pendiente?</p>
          <div className={styles.inputSection}>
            <label htmlFor="ticketName">Nombre:</label>
            <input id="ticketName" type="text" className={styles.nameInput} value={ticketName} onChange={(e) => setTicketName(e.target.value)} placeholder="Ej. Ticket 2" autoFocus />
          </div>
        </div>

        <div className={styles.modalActions}>
          <button type="button" className={`${styles.actionButton} ${styles.acceptButton}`} onClick={handleAccept} disabled={!ticketName.trim()}>Aceptar</button>
          <button type="button" className={`${styles.actionButton} ${styles.cancelButton}`} onClick={handleClose}>Esc - Cancelar</button>
        </div>
      </div>
    </div>
  );
});

export default PendingTicketModal;