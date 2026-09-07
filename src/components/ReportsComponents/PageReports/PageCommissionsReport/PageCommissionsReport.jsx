import React from "react";
import styles from "./PageCommissionsReport.module.css";
import tabStyles from "./components/CommissionsComponents.module.css";
import { useCommissionsReport } from "./hooks/useCommissionsReport";
import { CommissionsKpiCards } from "./components/CommissionsKpiCards";
import { CommissionsReportFilters } from "./components/CommissionsReportFilters";
import { CashiersCommissionSummaryTable } from "./components/CashiersCommissionSummaryTable";
import { ProductsCommissionSummaryTable } from "./components/ProductsCommissionSummaryTable";
import { CommissionsAuditTable } from "./components/CommissionsAuditTable";
import { CashierCommissionDetailModal } from "./components/CashierCommissionDetailModal";
import exportIcon from "../../../../assets/icons/file-import-solid-full.svg";

export const PageCommissionsReport = () => {
  const {
    startDate,
    endDate,
    handleDateRangeChange,
    activeDatePreset,
    setQuickDatePreset,
    selectedBranchId,
    setSelectedBranchId,
    selectedCashierId,
    setSelectedCashierId,
    selectedDepartmentId,
    setSelectedDepartmentId,
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
    branchesList,
    cashiersList,
    departmentsList,
    filteredRows,
    cashierSummaries,
    productSummaries,
    kpis,
    isLoading,
    error,
    isExporting,
    hasActiveFilters,
    handleClearFilters,
    handleExportExcel,
    selectedCashierForModal,
    isModalOpen,
    handleOpenCashierModal,
    handleCloseCashierModal,
  } = useCommissionsReport();

  const commissionAuditCount = React.useMemo(() => {
    return filteredRows.filter((r) => r.hasCommission).length;
  }, [filteredRows]);

  return (
    <div className={styles.pageContainer}>
      {/* Encabezado Principal */}
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Reporte de Comisiones de Cajeros</h1>
          <p className={styles.description}>
            Cálculo y auditoría de incentivos generados por venta de productos comisionables
          </p>
        </div>

        <div className={styles.actionButtons}>
          <button
            type="button"
            className={styles.exportBtn}
            onClick={handleExportExcel}
            disabled={isExporting || isLoading || cashierSummaries.length === 0}
          >
            <img src={exportIcon} alt="Exportar" className={styles.btnIcon} />
            <span>
              {isExporting ? "Exportando..." : "Exportar a Excel (.xlsx)"}
            </span>
          </button>
        </div>
      </header>

      {/* Mensaje de Error */}
      {error && <div className={styles.errorMessage}>{error}</div>}

      {/* Tarjetas KPI Globales */}
      <CommissionsKpiCards kpis={kpis} />

      {/* Toolbar de Filtros */}
      <CommissionsReportFilters
        startDate={startDate}
        endDate={endDate}
        handleDateRangeChange={handleDateRangeChange}
        activeDatePreset={activeDatePreset}
        setQuickDatePreset={setQuickDatePreset}
        branchesList={branchesList}
        selectedBranchId={selectedBranchId}
        setSelectedBranchId={setSelectedBranchId}
        cashiersList={cashiersList}
        selectedCashierId={selectedCashierId}
        setSelectedCashierId={setSelectedCashierId}
        departmentsList={departmentsList}
        selectedDepartmentId={selectedDepartmentId}
        setSelectedDepartmentId={setSelectedDepartmentId}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        hasActiveFilters={hasActiveFilters}
        handleClearFilters={handleClearFilters}
      />

      {/* Selector de Pestañas (Tabs) */}
      <div className={tabStyles.tabsContainer}>
        <button
          type="button"
          className={`${tabStyles.tabButton} ${
            activeTab === "cashiers" ? tabStyles.tabButtonActive : ""
          }`.trim()}
          onClick={() => setActiveTab("cashiers")}
        >
          <span>Resumen por Cajero</span>
          <span
            className={`${tabStyles.tabBadge} ${
              activeTab === "cashiers" ? tabStyles.tabBadgeActive : ""
            }`.trim()}
          >
            {cashierSummaries.length}
          </span>
        </button>

        <button
          type="button"
          className={`${tabStyles.tabButton} ${
            activeTab === "products" ? tabStyles.tabButtonActive : ""
          }`.trim()}
          onClick={() => setActiveTab("products")}
        >
          <span>Por Producto Comisionable</span>
          <span
            className={`${tabStyles.tabBadge} ${
              activeTab === "products" ? tabStyles.tabBadgeActive : ""
            }`.trim()}
          >
            {productSummaries.length}
          </span>
        </button>

        <button
          type="button"
          className={`${tabStyles.tabButton} ${
            activeTab === "audit" ? tabStyles.tabButtonActive : ""
          }`.trim()}
          onClick={() => setActiveTab("audit")}
        >
          <span>Auditoría de Tickets</span>
          <span
            className={`${tabStyles.tabBadge} ${
              activeTab === "audit" ? tabStyles.tabBadgeActive : ""
            }`.trim()}
          >
            {commissionAuditCount}
          </span>
        </button>
      </div>

      {/* Contenido de la Pestaña Activa */}
      {isLoading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <span>Calculando comisiones del periodo...</span>
        </div>
      ) : (
        <>
          {activeTab === "cashiers" && (
            <CashiersCommissionSummaryTable
              cashierSummaries={cashierSummaries}
              onViewDetail={handleOpenCashierModal}
            />
          )}

          {activeTab === "products" && (
            <ProductsCommissionSummaryTable
              productSummaries={productSummaries}
            />
          )}

          {activeTab === "audit" && (
            <CommissionsAuditTable detailedRows={filteredRows} />
          )}
        </>
      )}

      {/* Modal de Detalle 360° de Cajero */}
      {isModalOpen && selectedCashierForModal && (
        <CashierCommissionDetailModal
          isOpen={isModalOpen}
          onClose={handleCloseCashierModal}
          cashier={selectedCashierForModal}
          allDetailedRows={filteredRows}
          startDate={startDate}
          endDate={endDate}
        />
      )}
    </div>
  );
};

export default PageCommissionsReport;
