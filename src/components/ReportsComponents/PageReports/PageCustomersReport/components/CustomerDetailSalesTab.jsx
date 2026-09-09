/**
 * CustomerDetailSalesTab.jsx
 * Pestaña con el historial de compras/tickets del cliente, desglose de artículos y paginación.
 */

import React, { useState } from "react";
import styles from "./CustomersComponents.module.css";
import { formatCurrency, formatDynamicDate } from "../utils/customersReportFormatters";
import chevronDownIcon from "../../../../../assets/icons/chevron-down-solid-full.svg";
import { usePagination } from "../../../../../hooks/usePagination";

const CustomerDetailSalesTab = ({ sales = [] }) => {
  const [expandedTicketId, setExpandedTicketId] = useState(null);

  const {
    currentPage,
    totalPages,
    pageSize,
    startIndex,
    endIndex,
    pageItems,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination({
    totalItems: sales.length,
    defaultPageSize: 8,
    pageSizeOptions: [5, 8, 15],
  });

  const totalTickets = sales.length;
  const paginatedTickets = pageItems(sales);

  const toggleTicket = (ticketId) => {
    setExpandedTicketId((prev) => (prev === ticketId ? null : ticketId));
  };

  return (
    <div className={styles.tabPanel}>
      <div className={styles.modalSectionTitle}>
        <span>Tickets de compra (haz clic en un ticket para ver sus artículos)</span>
      </div>

      {sales.length === 0 ? (
        <p className={styles.modalEmptyText}>
          Este cliente no cuenta con ventas registradas.
        </p>
      ) : (
        <>
          <div className={styles.ticketsList}>
            {paginatedTickets.map((sale) => {
              const isExpanded = expandedTicketId === sale.id;
              const shortFolio = sale.id ? sale.id.substring(0, 8).toUpperCase() : "S/F";
              const branchName = sale.branches?.name || "Sucursal";
              const cashierName = sale.users?.username ? sale.users.username.toUpperCase() : "CAJERO";

              return (
                <div key={sale.id} className={styles.ticketCard}>
                  <div
                    className={styles.ticketHeader}
                    onClick={() => toggleTicket(sale.id)}
                  >
                    <div className={styles.ticketInfoGroup}>
                      <span className={styles.ticketFolio}>#{shortFolio}</span>
                      <span className={styles.ticketDate}>
                        {formatDynamicDate(sale.sale_date, sale.branches?.timezone)}
                      </span>
                      <span className={`${styles.badge} ${styles.badgeNeutral}`.trim()}>
                        {branchName} ({cashierName})
                      </span>
                    </div>

                    <div className={styles.ticketTotalGroup}>
                      <span className={styles.ticketTotal}>
                        {formatCurrency(sale.total)}
                      </span>
                      <span className={styles.ticketAccordionTrigger}>
                        <img
                          src={chevronDownIcon}
                          alt=""
                          className={`${styles.ticketChevron} ${
                            isExpanded ? styles.ticketChevronExpanded : ""
                          }`.trim()}
                        />
                        {isExpanded ? "Ocultar" : "Ver artículos"}
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className={styles.ticketDetailsBody}>
                      {(!sale.items || sale.items.length === 0) ? (
                        <p className={styles.ticketEmptyItems}>
                          No se encontraron líneas de productos registradas para este ticket.
                        </p>
                      ) : (
                        <table className={styles.itemsTable}>
                          <thead>
                            <tr>
                              <th>Código</th>
                              <th>Artículo</th>
                              <th className={styles.alignCenter}>Cant.</th>
                              <th className={styles.alignRight}>Precio Unit.</th>
                              <th className={styles.alignRight}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sale.items.map((it) => (
                              <tr key={it.id}>
                                <td className={styles.monospaceCell}>
                                  {it.products?.barcode || "S/C"}
                                </td>
                                <td>{it.products?.name || "Artículo"}</td>
                                <td className={styles.alignCenter}>{it.quantity}</td>
                                <td className={styles.alignRight}>
                                  {formatCurrency(it.unit_price)}
                                </td>
                                <td className={styles.alignRight}>
                                  <strong>{formatCurrency(it.total_price)}</strong>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {totalTickets > 0 && (
            <div className={`${styles.paginationWrapper} ${styles.modalPaginationWrapper}`.trim()}>
              <div className={styles.paginationInfo}>
                <span>
                  Mostrando {startIndex + 1} a {endIndex} de {totalTickets} tickets
                </span>
                <span>|</span>
                <label className={styles.paginationLabel}>
                  Por página:
                  <select
                    value={pageSize}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    className={styles.pageSizeSelect}
                  >
                    <option value={5}>5</option>
                    <option value={8}>8</option>
                    <option value={15}>15</option>
                  </select>
                </label>
              </div>

              <div className={styles.paginationControls}>
                <button
                  type="button"
                  className={styles.pageBtn}
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  Anterior
                </button>
                <span className={styles.pageIndicator}>
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  type="button"
                  className={styles.pageBtn}
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CustomerDetailSalesTab;
