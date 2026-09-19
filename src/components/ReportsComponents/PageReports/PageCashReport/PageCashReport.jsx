import React from "react";
import styles from "./PageCashReport.module.css";
import { useCashReport } from "./hooks/useCashReport";
import { formatSyncTime } from "../../../../utils/formatters";

import CashReportFilters from "./components/CashReportFilters";
import CashKpiCards from "./components/CashKpiCards";
import CashSessionsTable from "./components/CashSessionsTable";
import CashMovementsTable from "./components/CashMovementsTable";
import CashPaymentMethodsSummary from "./components/CashPaymentMethodsSummary";
import CashDiscrepanciesSummary from "./components/CashDiscrepanciesSummary";
import CashSessionDetailModal from "./components/CashSessionDetailModal";

import ClockIcon from "../../../../assets/icons/clock-solid-full.svg";
import EntryIcon from "../../../../assets/icons/entryIcon.svg";
import CreditCardIcon from "../../../../assets/icons/credit-card-solid-full.svg";
import UserIcon from "../../../../assets/icons/user-solid.svg";
import TableListIcon from "../../../../assets/icons/table-list-solid-full.svg";

const PageCashReport = () => {
  const {
    // Filtros
    branchesList,
    cashiersList,
    selectedBranchId,
    setSelectedBranchId,
    selectedCashierId,
    setSelectedCashierId,
    sessionStatus,
    setSessionStatus,
    movementType,
    setMovementType,
    dateRange,
    setDateRange,
    startDate,
    endDate,
    activeDatePreset,
    setQuickDatePreset,
    handleClearFilters,
    hasActiveFilters,

    // Pestañas
    activeTab,
    setActiveTab,

    // Datos y tablas
    sessions,
    paginatedSessions,
    currentSessionsPage,
    totalSessionsPages,
    handleSessionsPageChange,

    movements,
    paginatedMovements,
    currentMovementsPage,
    totalMovementsPages,
    handleMovementsPageChange,

    paymentMethodsSummary,
    cashierAudit,
    kpis,

    // Estados
    loading,
    error,
    syncedAt,
    isExporting,
    handleExportExcel,

    // Modal
    isDetailModalOpen,
    selectedSessionDetail,
    loadingModal,
    handleOpenDetailModal,
    handleCloseDetailModal,
  } = useCashReport();

  return (
    <div className={styles.pageContainer}>
      {/* Cabecera Principal */}
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Reporte de Caja y Arqueos</h1>
          <p className={styles.description}>
            Auditoría de turnos, aperturas, cierres de caja, ingresos/retiros de efectivo y discrepancias.
          </p>
        </div>

        <div className={styles.actionButtons}>
          {syncedAt ? (
            <span className={styles.lastUpdate}>
              Sincronizado {formatSyncTime(syncedAt)}
            </span>
          ) : null}

          <button
            type="button"
            className={styles.exportBtn}
            onClick={handleExportExcel}
            disabled={isExporting || loading || sessions.length === 0}
            title="Exportar a libro de Excel"
          >
            <img src={TableListIcon} alt="" className={styles.btnIcon} />
            {isExporting ? "Generando..." : "Exportar Excel"}
          </button>
        </div>
      </header>

      {/* Filtros Globales y Presets de Fechas */}
      <CashReportFilters
        branchesList={branchesList}
        selectedBranchId={selectedBranchId}
        setSelectedBranchId={setSelectedBranchId}
        cashiersList={cashiersList}
        selectedCashierId={selectedCashierId}
        setSelectedCashierId={setSelectedCashierId}
        sessionStatus={sessionStatus}
        setSessionStatus={setSessionStatus}
        movementType={movementType}
        setMovementType={setMovementType}
        dateRange={dateRange}
        setDateRange={setDateRange}
        startDate={startDate}
        endDate={endDate}
        activeDatePreset={activeDatePreset}
        setQuickDatePreset={setQuickDatePreset}
        onClear={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
        activeTab={activeTab}
      />

      {/* Mensaje de error si ocurre */}
      {error && <div className={styles.errorMessage}>{error}</div>}

      {/* Tarjetas de Indicadores Clave (KPIs) */}
      <CashKpiCards kpis={kpis} loading={loading} />

      {/* Navegación por pestañas */}
      <nav className={styles.navTabsContainer}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "sessions" ? styles.tabBtnActive : ""}`.trim()}
          onClick={() => setActiveTab("sessions")}
        >
          <img src={ClockIcon} alt="" className={styles.tabIcon} />
          Historial de Turnos y Cortes
          <span className={styles.tabBadge}>{sessions.length}</span>
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "movements" ? styles.tabBtnActive : ""}`.trim()}
          onClick={() => setActiveTab("movements")}
        >
          <img src={EntryIcon} alt="" className={styles.tabIcon} />
          Movimientos de Efectivo
          <span className={styles.tabBadge}>{movements.length}</span>
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "payments" ? styles.tabBtnActive : ""}`.trim()}
          onClick={() => setActiveTab("payments")}
        >
          <img src={CreditCardIcon} alt="" className={styles.tabIcon} />
          Métodos de Pago
          <span className={styles.tabBadge}>{paymentMethodsSummary.length}</span>
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "audit" ? styles.tabBtnActive : ""}`.trim()}
          onClick={() => setActiveTab("audit")}
        >
          <img src={UserIcon} alt="" className={styles.tabIcon} />
          Auditoría por Cajero
          <span className={styles.tabBadge}>{cashierAudit.length}</span>
        </button>
      </nav>

      {/* Contenido según pestaña activa */}
      <main>
        {activeTab === "sessions" && (
          <CashSessionsTable
            sessions={paginatedSessions}
            allSessions={sessions}
            loading={loading}
            currentPage={currentSessionsPage}
            totalPages={totalSessionsPages}
            totalItems={sessions.length}
            onPageChange={handleSessionsPageChange}
            onOpenDetail={handleOpenDetailModal}
          />
        )}

        {activeTab === "movements" && (
          <CashMovementsTable
            movements={paginatedMovements}
            loading={loading}
            currentPage={currentMovementsPage}
            totalPages={totalMovementsPages}
            totalItems={movements.length}
            onPageChange={handleMovementsPageChange}
          />
        )}

        {activeTab === "payments" && (
          <CashPaymentMethodsSummary
            paymentMethods={paymentMethodsSummary}
            loading={loading}
          />
        )}

        {activeTab === "audit" && (
          <CashDiscrepanciesSummary
            cashierAudit={cashierAudit}
            loading={loading}
          />
        )}
      </main>

      {/* Modal de Detalle de Sesión / Arqueo */}
      <CashSessionDetailModal
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        sessionDetail={selectedSessionDetail}
        loading={loadingModal}
      />
    </div>
  );
};

export default PageCashReport;
