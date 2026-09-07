import React from "react";
import styles from "./CommissionsComponents.module.css";
import { useCashierCommissionDetail } from "../hooks/useCashierCommissionDetail";
import {
  formatCurrency,
  formatDateTime,
  formatInteger,
} from "../utils/commissionsReportFormatters";
import excelIcon from "../../../../../assets/icons/file-import-solid-full.svg";

export const CashierCommissionDetailModal = ({
  isOpen,
  onClose,
  cashier,
  allDetailedRows = [],
  startDate,
  endDate,
}) => {
  const {
    currentTickets,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    totalTickets,
    isExportingStatement,
    handleExportStatement,
  } = useCashierCommissionDetail({
    cashier,
    allDetailedRows,
    startDate,
    endDate,
  });

  if (!isOpen || !cashier) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContainer}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado del Modal */}
        <div className={styles.modalHeader}>
          <div className={styles.modalTitleGroup}>
            <h3 className={styles.modalTitle}>
              Desglose de Comisiones - {cashier.cashierName}
            </h3>
            <span className={styles.modalSubtitle}>
              Sucursal: {cashier.branchName || "General"} | Total tickets: {totalTickets}
            </span>
          </div>
          <button
            type="button"
            className={styles.modalCloseBtn}
            onClick={onClose}
            title="Cerrar ventana"
          >
            &times;
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className={styles.modalBody}>
          {/* Mini Tarjetas de Resumen */}
          <div className={styles.modalMiniKpiGrid}>
            <div className={styles.modalMiniKpiCard}>
              <span className={styles.modalMiniKpiLabel}>Comisión Total</span>
              <span
                className={styles.modalMiniKpiValue}
                style={{ color: "#0284c7" }}
              >
                {formatCurrency(cashier.totalCommission)}
              </span>
            </div>
            <div className={styles.modalMiniKpiCard}>
              <span className={styles.modalMiniKpiLabel}>
                Venta Comisionable
              </span>
              <span className={styles.modalMiniKpiValue}>
                {formatCurrency(cashier.commissionableSales)}
              </span>
            </div>
            <div className={styles.modalMiniKpiCard}>
              <span className={styles.modalMiniKpiLabel}>
                Piezas Vendidas
              </span>
              <span className={styles.modalMiniKpiValue}>
                {formatInteger(cashier.commissionablePieces)}
              </span>
            </div>
          </div>

          {/* Tabla de Tickets de Venta */}
          <div className={styles.tableResponsive}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th style={{ width: "120px" }}>Ticket</th>
                  <th style={{ width: "160px" }}>Fecha / Hora</th>
                  <th>Productos con Comisión</th>
                  <th className={styles.textRight} style={{ width: "110px" }}>
                    Venta Ticket
                  </th>
                  <th
                    className={styles.textRight}
                    style={{ width: "110px", color: "#0284c7" }}
                  >
                    Comisión
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentTickets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={styles.emptyState}>
                      No se encontraron tickets con productos comisionables para este cajero.
                    </td>
                  </tr>
                ) : (
                  currentTickets.map((group) => (
                    <tr key={group.saleId}>
                      <td className={`${styles.fontMono} ${styles.fontBold}`}>
                        {group.ticketNumber}
                      </td>
                      <td className={styles.fontMono}>
                        {formatDateTime(group.createdAt)}
                      </td>
                      <td>
                        {group.items.map((it, idx) => (
                          <div key={idx} style={{ fontSize: "0.825rem" }}>
                            {it.quantity}x {it.productName} ({formatCurrency(it.commissionAmount)})
                          </div>
                        ))}
                      </td>
                      <td className={`${styles.textRight} ${styles.fontMono}`}>
                        {formatCurrency(group.ticketTotal)}
                      </td>
                      <td
                        className={`${styles.textRight} ${styles.fontBold} ${styles.fontMono}`}
                        style={{ color: "#0284c7" }}
                      >
                        {formatCurrency(group.ticketCommission)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación del Modal */}
          {totalTickets > 0 && (
            <div className={styles.paginationBar}>
              <div className={styles.paginationInfo}>
                <span>
                  Mostrando{" "}
                  {Math.min((currentPage - 1) * pageSize + 1, totalTickets)} a{" "}
                  {Math.min(currentPage * pageSize, totalTickets)} de {totalTickets}{" "}
                  tickets
                </span>
                <span className={styles.paginationDivider}>|</span>
                <label className={styles.pageSizeLabel}>
                  Mostrar:
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className={styles.pageSizeSelect}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                </label>
              </div>

              <div className={styles.paginationActions}>
                <button
                  type="button"
                  className={styles.btnPagination}
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                >
                  Anterior
                </button>
                <span className={styles.pageIndicator}>
                  Pág. {currentPage} de {totalPages}
                </span>
                <button
                  type="button"
                  className={styles.btnPagination}
                  disabled={currentPage >= totalPages}
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Pie del Modal */}
        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.btnExportStatement}
            onClick={handleExportStatement}
            disabled={isExportingStatement || totalTickets === 0}
          >
            <img
              src={excelIcon}
              alt="Excel"
              style={{ width: "15px", height: "15px" }}
            />
            <span>
              {isExportingStatement
                ? "Generando..."
                : "Descargar Comprobante (.xlsx)"}
            </span>
          </button>
          <button
            type="button"
            className={styles.btnCloseModal}
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
