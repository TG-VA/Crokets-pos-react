import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { useSalesReport } from "./hooks/useSalesReport";
import { formatCurrency, formatSyncTime } from "../../../../utils/formatters";
import { TicketDetailModal } from "./components/TicketDetailModal/TicketDetailModal";
import AppModal from "../../../AppModal/AppModal";
import styles from "./PageSalesReport.module.css";
import PaginationBar from "../../../PaginationBar/PaginationBar";
import rotateLeftIcon from "../../../../assets/icons/rotate-left-solid-full.svg";
import fileImportIcon from "../../../../assets/icons/file-import-solid-full.svg";

const PageSalesReport = () => {
  const {
    reportModal, closeReportModal, // Desestructuramos el Modal
    dateRange, setDateRange, startDate, endDate,
    activeDatePreset, setQuickDatePreset,
    selectedBranch, setSelectedBranch, selectedCashier, setSelectedCashier,
    saleStatus, setSaleStatus, paymentMethod, setPaymentMethod,
    discountFilter, setDiscountFilter, branchesList, cashiersList,
currentPage, totalPages, startIndex, endIndex, handlePageChange, paginatedSales, 
    loading, summary, syncedAt, hasActiveFilters, handleClearFilters, handleRowClick,
    handleExportExcel, handleExportDetailedExcel, isExportingDetailed, isExportingSummary,
    isTicketModalOpen, selectedTicket, ticketDetails,
    loadingModal, handleCloseModal,
  } = useSalesReport();

  return (
    <div className={styles.reportContainer}>
      {/* Cabecera Principal */}
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Reporte de Ventas</h1>
          <p className={styles.description}>Auditoría de ingresos y transacciones generadas en un periodo.</p>
        </div>
        
        <div className={styles.actionButtons}>
          {syncedAt ? (
            <span className={styles.lastUpdate}>
              Sincronizado {formatSyncTime(syncedAt)}
            </span>
          ) : null}

          <button 
            type="button"
            className={styles.exportDetailedBtn} 
            onClick={handleExportDetailedExcel} 
            disabled={loading || isExportingDetailed || isExportingSummary || summary.totalTickets === 0}
            title="Exportar todas las ventas desglosadas a nivel partida"
          >
            <img src={fileImportIcon} alt="" className={styles.btnIcon} />
            {isExportingDetailed ? "Procesando..." : "Exportar Detalle"}
          </button>
          
          <button 
            type="button"
            className={styles.exportBtn} 
            onClick={handleExportExcel} 
            disabled={loading || isExportingDetailed || isExportingSummary || summary.totalTickets === 0}
            title="Exportar resumen consolidado de ventas"
          >
            <img src={fileImportIcon} alt="" className={styles.btnIcon} />
            {isExportingSummary ? "Procesando..." : "Exportar Resumen"}
          </button>
        </div>
      </header>

      {/* Barra de Filtros en 2 Filas Semánticas */}
      <div className={styles.filtersSection}>
        {/* Fila 1: Filtro de Periodo Temporal y Acción Global Limpiar */}
        <div className={styles.filtersTopRow}>
          <div className={styles.dateFilterGroup}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Rango de fechas:</label>
              <div className={styles.datePickerWrapper}>
                <DatePicker
                  selectsRange
                  startDate={startDate}
                  endDate={endDate}
                  onChange={(update) => setDateRange(update)}
                  isClearable={false}
                  dateFormat="dd/MM/yyyy"
                  className={styles.datePickerInput}
                />
              </div>
            </div>

            {/* Píldoras de Presets Rápidos */}
            <div className={styles.presetsInlineGroup}>
              <button
                type="button"
                className={`${styles.presetPill} ${
                  activeDatePreset === "today" ? styles.presetPillActive : ""
                }`.trim()}
                onClick={() => setQuickDatePreset("today")}
              >
                Hoy
              </button>
              <button
                type="button"
                className={`${styles.presetPill} ${
                  activeDatePreset === "yesterday" ? styles.presetPillActive : ""
                }`.trim()}
                onClick={() => setQuickDatePreset("yesterday")}
              >
                Ayer
              </button>
              <button
                type="button"
                className={`${styles.presetPill} ${
                  activeDatePreset === "this_week" ? styles.presetPillActive : ""
                }`.trim()}
                onClick={() => setQuickDatePreset("this_week")}
              >
                Esta semana
              </button>
              <button
                type="button"
                className={`${styles.presetPill} ${
                  activeDatePreset === "this_month" ? styles.presetPillActive : ""
                }`.trim()}
                onClick={() => setQuickDatePreset("this_month")}
              >
                Este mes
              </button>
              <button
                type="button"
                className={`${styles.presetPill} ${
                  activeDatePreset === "last_month" ? styles.presetPillActive : ""
                }`.trim()}
                onClick={() => setQuickDatePreset("last_month")}
              >
                Mes pasado
              </button>
            </div>
          </div>

          {/* Botón Limpiar alineado a la derecha en la fila superior */}
          <button
            type="button"
            onClick={handleClearFilters}
            className={`${styles.clearBtn} ${
              hasActiveFilters ? styles.clearBtnActive : ""
            }`.trim()}
            title={
              hasActiveFilters
                ? "Restablecer filtros activos"
                : "Filtros en estado predeterminado"
            }
          >
            <img src={rotateLeftIcon} alt="" className={styles.clearBtnIcon} />
            Limpiar
            {hasActiveFilters && <span className={styles.activeFilterDot} />}
          </button>
        </div>

        {/* Fila 2: Selectores de Filtros Operativos de la Venta */}
        <div className={styles.filtersBottomRow}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Sucursal:</label>
            <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} className={styles.selectInput}>
              {branchesList.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Cajero:</label>
            <select value={selectedCashier} onChange={(e) => setSelectedCashier(e.target.value)} className={styles.selectInput}>
              {cashiersList.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Estado:</label>
            <select value={saleStatus} onChange={(e) => setSaleStatus(e.target.value)} className={styles.selectInput}>
              <option value="Todos">Todos los estados</option>
              <option value="Completada">Completadas</option>
              <option value="Devolución Parcial">Devoluciones Parciales</option>
              <option value="Cancelada">Canceladas</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Pago:</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={styles.selectInput}>
              <option value="Todos">Todos los métodos</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Terminal">Terminal</option>
              <option value="Transferencia">Transferencia</option>
              <option value="Mixto">Mixto</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Descuento:</label>
            <select value={discountFilter} onChange={(e) => setDiscountFilter(e.target.value)} className={styles.selectInput}>
              <option value="Todos">Todos los descuentos</option>
              <option value="ConDescuento">Con descuento</option>
              <option value="SinDescuento">Sin descuento</option>
            </select>
          </div>
        </div>
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
          <PaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={summary.totalTickets}
            startIndex={startIndex}
            endIndex={endIndex}
            itemsNoun="resultados"
            onPageChange={handlePageChange}
          />
        )}
      </div>

      <TicketDetailModal
        isOpen={isTicketModalOpen}
        onClose={handleCloseModal}
        ticket={selectedTicket}
        details={ticketDetails}
        loading={loadingModal}
      />

      <AppModal 
        isOpen={reportModal.isOpen}
        type={reportModal.type}
        title={reportModal.title}
        message={reportModal.message}
        onConfirm={closeReportModal}
        onCancel={closeReportModal}
        onClose={closeReportModal}
      />
    </div>
  );
};

export default PageSalesReport;
