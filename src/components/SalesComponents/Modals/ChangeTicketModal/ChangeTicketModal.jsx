import React, { useState, useEffect, useRef } from "react";
import styles from "./ChangeTicketModal.module.css";

const ChangeTicketModal = ({ isOpen, onClose, onSelectTicket, pendingTickets }) => {
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const resultsListRef = useRef(null);

  useEffect(() => {
    if (isOpen && pendingTickets.length > 0) {
      setSelectedIndex(0);
    } else {
      setSelectedIndex(-1);
    }
  }, [isOpen, pendingTickets]);

  // Efecto para hacer scroll automático
  useEffect(() => {
    if (selectedIndex >= 0 && resultsListRef.current) {
      const container = resultsListRef.current;
      const items = container.querySelectorAll(`.${styles.ticketItem}`);
      
      if (items[selectedIndex]) {
        items[selectedIndex].scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }
  }, [selectedIndex]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < pendingTickets.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
      } else if (e.key === "Enter" || e.key === "F5") {
        e.preventDefault();
        if (selectedIndex >= 0 && pendingTickets[selectedIndex]) {
          handleSelectTicket(pendingTickets[selectedIndex]);
        }
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown, true);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen, pendingTickets, selectedIndex]);

  const handleClose = () => {
    setSelectedIndex(-1);
    onClose();
  };

  const handleSelectTicket = (ticket) => {
    onSelectTicket(ticket);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div
        className={styles.changeModal}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h2>Cambiar a Ticket Pendiente</h2>
          <button
            className={styles.closeButton}
            onClick={handleClose}
          >
            ✕
          </button>
        </div>

        <div className={styles.modalBody}>
          {pendingTickets.length === 0 ? (
            <div className={styles.emptyMessage}>
              <div className={styles.emptyIcon}>📋</div>
              <p>No hay tickets pendientes</p>
              <span className={styles.emptySubtext}>
                Guarda un ticket como pendiente usando F6 para verlo aquí
              </span>
            </div>
          ) : (
            <>
              <div className={styles.ticketsHeader}>
                <span>Tickets Pendientes ({pendingTickets.length})</span>
              </div>
              <div className={styles.ticketsContainer} ref={resultsListRef}>
                <div className={styles.ticketsList}>
                  {pendingTickets.map((ticket, index) => (
                    <div
                      key={index}
                      className={`${styles.ticketItem} ${
                        index === selectedIndex ? styles.selectedTicket : ""
                      }`}
                      onClick={() => handleSelectTicket(ticket)}
                    >
                      <div className={styles.ticketInfo}>
                        <div className={styles.ticketHeader}>
                          <span className={styles.ticketName}>{ticket.name}</span>
                          <span className={styles.ticketTotal}>
                            ${ticket.total.toFixed(2)}
                          </span>
                        </div>
                        <div className={styles.ticketDetails}>
                          <span className={styles.ticketProducts}>
                            {ticket.products.length} producto(s)
                          </span>
                          {ticket.client && (
                            <span className={styles.ticketClient}>
                              Cliente: {ticket.client.name}
                            </span>
                          )}
                          <span className={styles.ticketDate}>
                            {new Date(ticket.date).toLocaleString('es-MX', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {pendingTickets.length > 0 && (
          <div className={styles.modalActions}>
            <div className={styles.actionButtons}>
              <button
                className={`${styles.actionButton} ${styles.selectButton}`}
                onClick={() => {
                  if (selectedIndex >= 0 && pendingTickets[selectedIndex]) {
                    handleSelectTicket(pendingTickets[selectedIndex]);
                  }
                }}
                disabled={selectedIndex < 0}
              >
                Cambiar a este ticket
              </button>
              <button
                className={`${styles.actionButton} ${styles.cancelButton}`}
                onClick={handleClose}
              >
                ESC - Cancelar
              </button>
            </div>
            <div className={styles.actionHints}>
              <span>↑↓ Navegar • Enter - Seleccionar</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChangeTicketModal;