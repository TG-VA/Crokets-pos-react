import React, { useEffect, useRef, useState, memo, useCallback } from "react";
import styles from "./DeleteTicketModal.module.css";
import DeleteIcon from "../../../../assets/icons/deleteIcon.svg";
import XmarkIcon from "../../../../assets/icons/xmark-solid-full.svg";
import WarningIcon from "../../../../assets/icons/triangle-exclamation-solid-full.svg";

const DeleteTicketModal = memo(({ isOpen, onClose, onDeleteTicket, pendingTickets = [] }) => {
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState(null);
  const resultsListRef = useRef(null);

  const handleClose = useCallback(() => {
    setSelectedIndex(-1); setShowConfirmation(false); setTicketToDelete(null); onClose();
  }, [onClose]);

  const handleCancelDelete = useCallback(() => {
    setShowConfirmation(false); setTicketToDelete(null);
  }, []);

  const handleShowConfirmation = useCallback((ticket, index) => {
    setTicketToDelete({ ticket, index }); setShowConfirmation(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!ticketToDelete) return;
    onDeleteTicket(ticketToDelete.index);
    setShowConfirmation(false);
    setTicketToDelete(null);

    if (pendingTickets.length === 1) return handleClose();
    if (selectedIndex >= pendingTickets.length - 1) setSelectedIndex(pendingTickets.length - 2);
  }, [ticketToDelete, onDeleteTicket, pendingTickets.length, selectedIndex, handleClose]);

  useEffect(() => {
    if (isOpen && pendingTickets.length > 0) {
      setSelectedIndex(0); setShowConfirmation(false); setTicketToDelete(null);
    } else {
      setSelectedIndex(-1);
    }
  }, [isOpen, pendingTickets]);

  useEffect(() => {
    if (selectedIndex >= 0 && resultsListRef.current && !showConfirmation) {
      resultsListRef.current.querySelectorAll(`.${styles.ticketItem}`)[selectedIndex]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedIndex, showConfirmation]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      const stopEvents = () => { e.preventDefault(); e.stopPropagation(); e.nativeEvent?.stopImmediatePropagation?.(); e.stopImmediatePropagation?.(); };

      if (e.key === "Escape") {
        stopEvents();
        return showConfirmation ? handleCancelDelete() : handleClose();
      }
      if (e.key === "Enter") {
        stopEvents();
        if (showConfirmation) return handleConfirmDelete();
        if (selectedIndex >= 0 && pendingTickets[selectedIndex]) handleShowConfirmation(pendingTickets[selectedIndex], selectedIndex);
        return;
      }

      if (showConfirmation) return;

      if (e.key === "ArrowDown") { e.preventDefault(); return setSelectedIndex((prev) => prev < pendingTickets.length - 1 ? prev + 1 : prev); }
      if (e.key === "ArrowUp") { e.preventDefault(); return setSelectedIndex((prev) => prev > 0 ? prev - 1 : 0); }
      if (e.key === "Delete") {
        e.preventDefault();
        if (selectedIndex >= 0 && pendingTickets[selectedIndex]) handleShowConfirmation(pendingTickets[selectedIndex], selectedIndex);
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, pendingTickets, selectedIndex, showConfirmation, handleCancelDelete, handleClose, handleConfirmDelete, handleShowConfirmation]);

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.deleteModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2><span className={styles.titleContent}><img src={DeleteIcon} alt="" className={styles.titleIcon} aria-hidden="true" /> Eliminar ticket pendiente</span></h2>
          <button type="button" className={styles.closeButton} onClick={handleClose} aria-label="Cerrar modal">
            <img src={XmarkIcon} alt="" className={styles.closeIcon} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.modalBody}>
          {showConfirmation ? (
            <div className={styles.confirmationContainer}>
              <div className={styles.warningIconBox}><img src={WarningIcon} alt="" className={styles.warningIcon} aria-hidden="true" /></div>
              <h3>¿Estás seguro?</h3>
              <p className={styles.confirmMessage}>¿Deseas eliminar <strong>{ticketToDelete?.ticket.name || "este ticket"}</strong>?</p>
              <p className={styles.confirmSubtext}>Esta acción no se puede deshacer.</p>
              <div className={styles.confirmActions}>
                <button type="button" className={`${styles.actionButton} ${styles.confirmButton}`} onClick={handleConfirmDelete}>Confirmar</button>
                <button type="button" className={`${styles.actionButton} ${styles.cancelButton}`} onClick={handleCancelDelete}>Cancelar</button>
              </div>
            </div>
          ) : pendingTickets.length === 0 ? (
            <div className={styles.emptyMessage}>
              <div className={styles.emptyIconBox}><img src={DeleteIcon} alt="" className={styles.emptyIcon} aria-hidden="true" /></div>
              <p>No hay tickets pendientes por eliminar</p>
              <span className={styles.emptySubtext}>Los tickets que guardes como pendientes aparecerán aquí</span>
            </div>
          ) : (
            <>
              <div className={styles.ticketsHeader}><span>Selecciona el ticket que deseas eliminar</span></div>
              <div className={styles.ticketsContainer} ref={resultsListRef}>
                <div className={styles.ticketsList}>
                  {pendingTickets.map((ticket, index) => (
                    <div key={index} className={`${styles.ticketItem} ${index === selectedIndex ? styles.selectedTicket : ""}`} onClick={() => handleShowConfirmation(ticket, index)}>
                      <div className={styles.ticketInfo}>
                        <div className={styles.ticketHeader}>
                          <span className={styles.ticketName}>{ticket.name}</span>
                          <span className={styles.ticketTotal}>${ticket.total.toFixed(2)}</span>
                        </div>
                        <div className={styles.ticketDetails}>
                          <span className={styles.ticketProducts}>{ticket.products.length} producto(s)</span>
                          {ticket.client && <span className={styles.ticketClient}>Cliente: {ticket.client.name}</span>}
                          <span className={styles.ticketDate}>{new Date(ticket.date).toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {!showConfirmation && pendingTickets.length > 0 && (
          <div className={styles.modalActions}>
            <div className={styles.actionButtons}>
              <button type="button" className={`${styles.actionButton} ${styles.deleteButton}`} onClick={() => selectedIndex >= 0 && pendingTickets[selectedIndex] && handleShowConfirmation(pendingTickets[selectedIndex], selectedIndex)} disabled={selectedIndex < 0}>
                Eliminar ticket seleccionado
              </button>
              <button type="button" className={`${styles.actionButton} ${styles.cancelButton}`} onClick={handleClose}>ESC - Cancelar</button>
            </div>
            <div className={styles.actionHints}><span>↑↓ Navegar • Enter o Delete para eliminar</span></div>
          </div>
        )}
      </div>
    </div>
  );
});

export default DeleteTicketModal;