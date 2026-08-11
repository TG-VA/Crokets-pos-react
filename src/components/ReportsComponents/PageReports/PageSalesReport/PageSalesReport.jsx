import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { useSalesReport, ITEMS_PER_PAGE } from "./hooks/useSalesReport";
import { formatCurrency } from "../utils/formatters";
import { TicketDetailModal } from "./components/TicketDetailModal/TicketDetailModal";
import styles from "./PageSalesReport.module.css";

const PageSalesReport = () => {
  const {
    dateRange, setDateRange, startDate, endDate,
    selectedBranch, setSelectedBranch, selectedCashier, setSelectedCashier,
    saleStatus, setSaleStatus, paymentMethod, setPaymentMethod,
    discountFilter, setDiscountFilter, branchesList, cashiersList,
    currentPage, setCurrentPage, totalPages, paginatedSales, 
    loading, summary, hasActiveFilters, handleClearFilters, handleRowClick,
    handleExportExcel, handleExportDetailedExcel, isExportingDetailed, isExportingSummary,
    isTicketModalOpen, selectedTicket, ticketDetails,
    loadingModal, handleCloseModal,
  } = useSalesReport();

  return (
    <div className={styles.reportContainer}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h2>Reporte de Ventas</h2>
          <p>Auditoría de ingresos y transacciones generadas en un periodo.</p>
        </div>
        
        <div className={styles.actionButtons}>
          <button 
            className={styles.exportDetailedBtn} 
            onClick={handleExportDetailedExcel} 
            disabled={loading || isExportingDetailed || isExportingSummary || summary.totalTickets === 0}
          >
            {isExportingDetailed ? "Procesando..." : "Exportar Detalle"}
          </button>
          
          <button 
            className={styles.exportBtn} 
            onClick={handleExportExcel} 
            disabled={loading || isExportingDetailed || isExportingSummary || summary.totalTickets === 0}
          >
            {isExportingSummary ? "Procesando..." : "Exportar Resumen"}
          </button>
        </div>
      </div>

      <div className={styles.filtersSection}>
        <div className={styles.filterGroup}>
          <label>Rango de Fechas:</label>
          <div className={styles.datePickerWrapper}>
            <DatePicker
              selectsRange={true}
              startDate={startDate}
              endDate={endDate}
              onChange={(update) => setDateRange(update)}
              dateFormat="dd/MM/yyyy"
              className={styles.datePickerInput}
              placeholderText="Selecciona un rango..."
            />
          </div>
        </div>

        <div className={styles.filterGroup}>
          <label>Sucursal:</label>
          <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} className={styles.selectInput}>
            {branchesList.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>Cajero:</label>
          <select value={selectedCashier} onChange={(e) => setSelectedCashier(e.target.value)} className={styles.selectInput}>
            {cashiersList.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>Estado:</label>
          <select value={saleStatus} onChange={(e) => setSaleStatus(e.target.value)} className={styles.selectInput}>
            <option value="Todos">Todos</option>
            <option value="Completada">Completadas</option>
            <option value="Devolución Parcial">Devoluciones Parciales</option>
            <option value="Cancelada">Canceladas</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>Pago:</label>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={styles.selectInput}>
            <option value="Todos">Todos</option>
            <option value="Efectivo">Efectivo</option>
            <option value="Terminal">Terminal</option>
            <option value="Transferencia">Transferencia</option>
            <option value="Mixto">Mixto</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>Descuento:</label>
          <select value={discountFilter} onChange={(e) => setDiscountFilter(e.target.value)} className={styles.selectInput}>
            <option value="Todos">Todos</option>
            <option value="ConDescuento">Con descuento</option>
            <option value="SinDescuento">Sin descuento</option>
          </select>
        </div>

        {hasActiveFilters && (
          <button className={styles.clearFiltersBtn} onClick={handleClearFilters}>
            Limpiar filtros
          </button>
        )}
      </div>

      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Total Ingresos</span>
          <strong className={styles.kpiValue}>{loading ? "..." : formatCurrency(summary.totalIncome)}</strong>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Tickets Listados</span>
          <strong className={styles.kpiValue}>{loading ? "..." : summary.totalTickets}</strong>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Ticket Promedio</span>
          <strong className={styles.kpiValue}>{loading ? "..." : formatCurrency(summary.averageTicket)}</strong>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Descuentos Otorgados</span>
          <strong className={styles.kpiValue}>{loading ? "..." : formatCurrency(summary.totalDiscounts)}</strong>
        </div>
      </div>

      <div className={styles.tableCard}>
        <h3>Desglose de Transacciones</h3>
        <div className={styles.tableWrapper}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Folio</th>
                <th>Fecha</th>
                <th>Sucursal</th>
                <th>Cajero</th>
                <th>Método</th>
                <th>Estado</th>
                <th className={styles.textRight}>Desc.</th>
                <th className={styles.textRight}>Total</th>
              </tr>
            </thead>
            <tbody>
              {!startDate || !endDate ? (
                <tr><td colSpan="8" className={styles.emptyState}>Por favor selecciona un rango de fechas para generar el reporte.</td></tr>
              ) : loading ? (
                <tr><td colSpan="8" className={styles.loadingState}>Cargando datos...</td></tr>
              ) : paginatedSales.length === 0 ? (
                <tr><td colSpan="8" className={styles.emptyState}>No hay ventas que coincidan con los filtros seleccionados.</td></tr>
              ) : (
                paginatedSales.map((sale) => (
                  <tr 
                    key={sale.id} 
                    className={`${styles.clickableRow} ${sale.status === "Cancelada" ? styles.rowCancelled : ""}`}
                    onClick={() => handleRowClick(sale)}
                  >
                    <td><strong>{sale.ticketNumber}</strong></td>
                    <td>{sale.date}</td>
                    <td><span className={styles.branchTag}>{sale.branch}</span></td>
                    <td>{sale.cashier}</td>
                    <td><span className={styles.badge}>{sale.method}</span></td>
                    <td>
                      <span className={`${styles.statusBadge} ${sale.status === "Completada" ? styles.statusSuccess : sale.status === "Cancelada" ? styles.statusDanger : styles.statusWarning}`}>
                        {sale.status}
                      </span>
                    </td>
                    <td className={`${styles.textRight} ${sale.discount > 0 ? styles.discountText : ""}`}>
                      {sale.discount > 0 ? `-${formatCurrency(sale.discount)}` : "$0.00"}
                    </td>
                    <td className={styles.textRight}><strong>{formatCurrency(sale.total)}</strong></td>
                  </tr>
                ))
              )}
            </tbody>
            {startDate && endDate && !loading && summary.totalTickets > 0 && (
              <tfoot className={styles.tableFooter}>
                <tr>
                  <td colSpan="6" className={styles.textRight}><strong>Total acumulado (Filtro activo):</strong></td>
                  <td className={`${styles.textRight} ${styles.discountText}`}>
                    <strong>-{formatCurrency(summary.totalDiscounts)}</strong>
                  </td>
                  <td className={styles.textRight}>
                    <strong className={styles.grandTotalText}>{formatCurrency(summary.totalIncome)}</strong>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {startDate && endDate && !loading && summary.totalTickets > 0 && (
          <div className={styles.paginationContainer}>
            <span className={styles.paginationInfo}>
              Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, summary.totalTickets)} de {summary.totalTickets} resultados
            </span>
            <div className={styles.paginationControls}>
              <button 
                className={styles.pageBtn} 
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </button>
              <span className={styles.pageNumber}>
                Página {currentPage} de {totalPages}
              </span>
              <button 
                className={styles.pageBtn} 
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      <TicketDetailModal
        isOpen={isTicketModalOpen}
        onClose={handleCloseModal}
        ticket={selectedTicket}
        details={ticketDetails}
        loading={loadingModal}
      />
    </div>
  );
};

export default PageSalesReport;