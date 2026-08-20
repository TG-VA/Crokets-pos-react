import React, { useEffect } from "react";
import { formatCurrency } from "../../../../../../utils/formatters"; 
import styles from "./TicketDetailModal.module.css";

export const TicketDetailModal = ({ isOpen, onClose, ticket, details, loading }) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !ticket) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        
        <div className={styles.modalHeader}>
          <div className={styles.headerText}>
            <h2>
              Ticket <span className={styles.ticketFolio}>#{ticket.ticketNumber}</span>
            </h2>
            <p className={styles.headerSub}>
              {ticket.date} &nbsp;•&nbsp; <strong>Sucursal:</strong> {ticket.branch} &nbsp;•&nbsp; <strong>Cajero:</strong> {ticket.cashier}
            </p>
          </div>
          <button type="button" aria-label="Cerrar detalle de ticket" className={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>

        <div className={styles.modalBody}>
          
          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Cliente</span>
              <span className={styles.metaValue}>{ticket.client}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Método de Pago</span>
              <span className={styles.metaValue}>{ticket.method}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Estado</span>
              <div className={styles.metaValue}>
                <span className={`${styles.badge} ${
                  ticket.status === "Completada" ? styles.success : 
                  ticket.status === "Cancelada" ? styles.danger : 
                  styles.warning
                }`}>
                  {ticket.status}
                </span>
              </div>
            </div>
          </div>

          {ticket.notes && (
            <div className={styles.notesContainer}>
              <span className={styles.notesLabel}>Nota de la venta:</span>
              <p className={styles.notesText}>{ticket.notes}</p>
            </div>
          )}

          <div className={styles.tableContainer}>
            <table className={styles.detailTable}>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th className={styles.textCenter}>Cant.</th>
                  <th className={styles.textRight}>P. Unit</th>
                  <th className={styles.textRight}>Desc.</th>
                  <th className={styles.textRight}>Total</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className={styles.emptyText}>Cargando productos...</td></tr>
                ) : details.length === 0 ? (
                  <tr><td colSpan="5" className={styles.emptyText}>No se encontraron productos registrados en este ticket.</td></tr>
                ) : (
                  details.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className={styles.productName}>{item.productName}</div>
                        {item.barcode !== "N/A" && <small className={styles.barcodeText}>CÓD: {item.barcode}</small>}
                      </td>
                      <td className={styles.textCenter}>
                        <span className={styles.qtyBadge}>{item.quantity}</span>
                      </td>
                      <td className={styles.textRight}>{formatCurrency(item.unitPrice)}</td>
                      <td className={styles.textRight}>
                        {item.discount > 0 ? (
                          <div className={styles.discountWrapper}>
                            <span className={styles.discountVal}>-{formatCurrency(item.discount)}</span>
                            {item.discountType && (
                              <span className={styles.discountTypeLabel}>{item.discountType}</span>
                            )}
                          </div>
                        ) : (
                          "$0.00"
                        )}
                      </td>
                      <td className={styles.textRight}><strong>{formatCurrency(item.total)}</strong></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className={styles.totalSection}>
            <span className={styles.totalLabel}>Total cobrado:</span>
            <strong className={styles.grandTotal}>{formatCurrency(ticket.total)}</strong>
          </div>

        </div>
      </div>
    </div>
  );
};