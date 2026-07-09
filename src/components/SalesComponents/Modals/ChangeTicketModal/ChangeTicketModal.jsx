import React, { useEffect, useRef, useState } from "react";
import styles from "./ChangeTicketModal.module.css";

import ChangeIcon from "../../../../assets/icons/changeIcon.svg";
import PendingIcon from "../../../../assets/icons/pendingIcon.svg";
import XmarkIcon from "../../../../assets/icons/xmark-solid-full.svg";

const ChangeTicketModal = ({
  isOpen,
  onClose,
  onSelectTicket,
  pendingTickets,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const resultsListRef = useRef(null);

  useEffect(() => {
    if (isOpen && pendingTickets.length > 0) {
      setSelectedIndex(0);
    } else {
      setSelectedIndex(-1);
    }
  }, [isOpen, pendingTickets]);

  useEffect(() => {
    if (selectedIndex >= 0 && resultsListRef.current) {
      const container = resultsListRef.current;
      const items = container.querySelectorAll(`.${styles.ticketItem}`);

      if (items[selectedIndex]) {
        items[selectedIndex].scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }
  }, [selectedIndex]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isOpen) return;

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();

        if (event.nativeEvent?.stopImmediatePropagation) {
          event.nativeEvent.stopImmediatePropagation();
        }

        if (event.stopImmediatePropagation) {
          event.stopImmediatePropagation();
        }

        handleClose();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();

        setSelectedIndex((prev) =>
          prev < pendingTickets.length - 1 ? prev + 1 : prev
        );
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();

        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        return;
      }

      if (event.key === "Enter" || event.key === "F5") {
        event.preventDefault();

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
      <div className={styles.changeModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>
            <span className={styles.titleContent}>
              <img
                src={ChangeIcon}
                alt=""
                className={styles.titleIcon}
                aria-hidden="true"
              />
              Cambiar a ticket pendiente
            </span>
          </h2>

          <button
            type="button"
            className={styles.closeButton}
            onClick={handleClose}
            aria-label="Cerrar modal"
          >
            <img
              src={XmarkIcon}
              alt=""
              className={styles.closeIcon}
              aria-hidden="true"
            />
          </button>
        </div>

        <div className={styles.modalBody}>
          {pendingTickets.length === 0 ? (
            <div className={styles.emptyMessage}>
              <div className={styles.emptyIconBox}>
                <img
                  src={PendingIcon}
                  alt=""
                  className={styles.emptyIcon}
                  aria-hidden="true"
                />
              </div>

              <p>No hay tickets pendientes</p>

              <span className={styles.emptySubtext}>
                Guarda un ticket como pendiente usando F6 para verlo aquí
              </span>
            </div>
          ) : (
            <>
              <div className={styles.ticketsHeader}>
                <span>Tickets pendientes ({pendingTickets.length})</span>
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
                          <span className={styles.ticketName}>
                            {ticket.name}
                          </span>

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
                            {new Date(ticket.date).toLocaleString("es-MX", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
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
                type="button"
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
                type="button"
                className={`${styles.actionButton} ${styles.cancelButton}`}
                onClick={handleClose}
              >
                ESC - Cancelar
              </button>
            </div>

            <div className={styles.actionHints}>
              <span>↑↓ Navegar • Enter para seleccionar</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChangeTicketModal;