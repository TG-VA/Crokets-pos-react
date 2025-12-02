import React, { useState } from "react";
import styles from "./SalesHistoryModal.module.css";

const SalesHistoryModal = ({ isOpen, onClose }) => {
  const [searchFolio, setSearchFolio] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [dateFilter, setDateFilter] = useState("2025-11-04");
  const [cashierFilter, setCashierFilter] = useState("all");

  // Datos de ejemplo
  const tickets = [
    {
      folio: "6506",
      articles: 1,
      time: "9:51 am",
      total: 310.34,
      cashier: "HUAYACÁN TRISTAN",
      client: "Público en general",
      date: "21 de Octubre 2025",
      paymentMethod: "Efectivo",
      items: [
        { cant: 1, description: "NUPEC FELINO URINARY 1.5KG", amount: 310.34 },
      ]
    },
    {
      folio: "6507",
      articles: 3,
      time: "10:30 am",
      total: 150.00,
      cashier: "Admin",
      client: "Juan Pérez",
      date: "4 de Noviembre 2025",
      paymentMethod: "Terminal",
      items: [
        { cant: 2, description: "NUPEC ADULTO RAZA PEQUEÑA", amount: 100.00 },
        { cant: 1, description: "NEXGARD SPECTRA", amount: 50.00 }
      ]
    },
    {
      folio: "6508",
      articles: 1,
      time: "12:15 pm",
      total: 89.50,
      cashier: "Admin",
      client: "María Gómez",
      date: "4 de Noviembre 2025",
      paymentMethod: "Transferencia",
      items: [
        { cant: 1, description: "ROYAL CANIN MINI ADULTO", amount: 89.50 }
      ]
    }
  ];

  const cashiers = ["all", "Admin", "HUAYACÁN TRISTAN"];

  const filteredTickets = tickets.filter(ticket => {
    const matchesFolio = ticket.folio.includes(searchFolio);
    const matchesCashier = cashierFilter === "all" || ticket.cashier === cashierFilter;
    return matchesFolio && matchesCashier;
  });

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.headerTitle}>HISTORIAL DE VENTAS</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Left Panel - Ticket List */}
          <div className={styles.leftPanel}>
            {/* Search and Filters */}
            <div className={styles.filtersContainer}>
              <div className={styles.filterGroup}>
                <input
                  type="text"
                  placeholder="🔍 Ingresa el folio del ticket"
                  value={searchFolio}
                  onChange={(e) => setSearchFolio(e.target.value)}
                  className={styles.searchInput}
                />
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Ventas del día:</label>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className={styles.dateInput}
                />
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Cajero:</label>
                <select
                  value={cashierFilter}
                  onChange={(e) => setCashierFilter(e.target.value)}
                  className={styles.selectInput}
                >
                  <option value="all">Todos los cajeros</option>
                  {cashiers.filter(c => c !== "all").map(cashier => (
                    <option key={cashier} value={cashier}>{cashier}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ticket List */}
            <div className={styles.ticketListContainer}>
              <table className={styles.ticketTable}>
                <thead>
                  <tr>
                    <th>Folio</th>
                    <th>Articulos</th>
                    <th>Hora</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((ticket) => (
                    <tr
                      key={ticket.folio}
                      onClick={() => setSelectedTicket(ticket)}
                      className={`${styles.ticketRow} ${
                        selectedTicket?.folio === ticket.folio ? styles.ticketRowActive : ""
                      }`}
                    >
                      <td>{ticket.folio}</td>
                      <td className={styles.textCenter}>{ticket.articles}</td>
                      <td className={styles.textCenter}>{ticket.time}</td>
                      <td className={styles.textRight}>
                        ${ticket.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Panel - Ticket Detail */}
          <div className={styles.rightPanel}>
            {selectedTicket ? (
              <>
                <div className={styles.ticketDetailContainer}>
                  {/* Ticket Header */}
                  <div className={styles.ticketHeader}>
                    <div className={styles.ticketInfoRow}>
                      <span className={styles.ticketLabel}>Folio:</span>
                      <span className={styles.ticketFolio}>
                        {selectedTicket.folio}
                      </span>
                    </div>
                    <div className={styles.ticketInfoRow}>
                      <span className={styles.ticketLabel}>Cajero:</span>
                      <span>{selectedTicket.cashier}</span>
                    </div>
                    <div className={styles.ticketInfoRow}>
                      <span className={styles.ticketLabel}>Cliente:</span>
                      <span>{selectedTicket.client}</span>
                    </div>
                    <div className={styles.ticketDate}>
                      {selectedTicket.date} {selectedTicket.time}
                    </div>
                  </div>

                  {/* Payment Method Badge */}
                  <div className={styles.paymentMethodContainer}>
                    <span className={styles.paymentMethodLabel}>Método de pago:</span>
                    <span className={styles.paymentMethodBadge}>{selectedTicket.paymentMethod}</span>
                  </div>

                  {/* Items Table */}
                  <table className={styles.itemsTable}>
                    <thead>
                      <tr>
                        <th>Cant.</th>
                        <th>Descripción</th>
                        <th>Importe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTicket.items.map((item, index) => (
                        <tr key={index}>
                          <td className={styles.textCenter}>{item.cant}</td>
                          <td>{item.description}</td>
                          <td className={styles.textRight}>
                            ${item.amount.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totals */}
                  <div className={styles.totalsContainer}>
                    <div className={styles.totalsContent}>
                      <div className={styles.totalRow}>
                        <span className={styles.totalLabel}>Pago con:</span>
                        <span className={styles.totalAmount}>
                          ${selectedTicket.total.toFixed(2)}
                        </span>
                      </div>
                      <div className={styles.totalRow}>
                        <span className={styles.totalLabelBold}>Total:</span>
                        <span className={styles.totalAmountFinal}>
                          ${selectedTicket.total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className={styles.actionButtons}>
                  <button className={`${styles.actionBtn} ${styles.btnCancel}`}>
                    🗑️ Cancelar Venta
                  </button>
                  <button className={`${styles.actionBtn} ${styles.btnInvoice}`}>
                    📄 Facturar
                  </button>
                  <button className={`${styles.actionBtn} ${styles.btnPrint}`}>
                    🖨️ Imprimir copia
                  </button>
                  <button className={`${styles.actionBtn} ${styles.btnNotes}`}>
                    📝 Ver Notas
                  </button>
                </div>
              </>
            ) : (
              <div className={styles.emptyState}>
                Selecciona un ticket para ver los detalles
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.closeFooterBtn} onClick={onClose}>
            ESC - Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default SalesHistoryModal;