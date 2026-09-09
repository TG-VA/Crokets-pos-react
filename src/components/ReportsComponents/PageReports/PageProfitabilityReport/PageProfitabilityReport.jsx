/**
 * PageProfitabilityReport.jsx
 * Componente orquestador del Reporte de Rentabilidad.
 */

import React, { useState } from "react";
import styles from "./PageProfitabilityReport.module.css";
import { useBranch } from "../../../../contexts/BranchContext";
import { useProfitabilityReport } from "./hooks/useProfitabilityReport";
import { exportProfitabilityReportToExcel } from "./utils/profitabilityReportExportUtils";
import { formatSyncTime } from "../../../../utils/formatters";

import ProfitabilityFilters from "./components/ProfitabilityFilters";
import ProfitabilityKpiCards from "./components/ProfitabilityKpiCards";
import ProfitabilityProductsTable from "./components/ProfitabilityProductsTable";
import ProfitabilityDepartmentsTable from "./components/ProfitabilityDepartmentsTable";
import ProfitabilityCriticalTable from "./components/ProfitabilityCriticalTable";

import fileImportIcon from "../../../../assets/icons/file-import-solid-full.svg";
import boxIcon from "../../../../assets/icons/box-solid-full.svg";
import tagIcon from "../../../../assets/icons/tag-solid-full.svg";
import warningIcon from "../../../../assets/icons/triangle-exclamation-solid-full.svg";

const PageProfitabilityReport = () => {
  const { branch } = useBranch();
  const [isExporting, setIsExporting] = useState(false);

  const {
    branchId,
    setBranchId,
    departmentId,
    setDepartmentId,
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
    sortBy,
    sortDirection,
    handleSort,
    dateRange,
    setDateRange,
    startDate,
    endDate,
    activeDatePreset,
    setQuickDatePreset,
    branchesList,
    departmentsList,
    filteredProducts,
    filteredDepartments,
    criticalProducts,
    kpis,
    isLoading,
    error,
    syncedAt,
    refresh,
  } = useProfitabilityReport(branch?.id || "ALL");

  const handleClearFilters = () => {
    setBranchId(branch?.id || "ALL");
    setDepartmentId("ALL");
    setSearchTerm("");
    setQuickDatePreset("this_month");
  };

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      const activeBranchObj = branchesList.find((b) => b.id === branchId);
      const branchName = activeBranchObj ? activeBranchObj.name : "Todas las sucursales";

      const activeDeptObj = departmentsList.find((d) => String(d.id) === String(departmentId));
      const departmentName = activeDeptObj ? activeDeptObj.name : "Todos los departamentos";

      await exportProfitabilityReportToExcel({
        productsProfitability: filteredProducts,
        departmentsProfitability: filteredDepartments,
        criticalProducts,
        kpis,
        branchName,
        activeTab,
        departmentName,
        startDate,
        endDate,
        searchTerm,
      });
    } catch (err) {
      console.error("Error al exportar reporte de rentabilidad:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const hasDataToExport =
    filteredProducts.length > 0 || filteredDepartments.length > 0;

  return (
    <div className={styles.pageContainer}>
      {/* Cabecera Principal */}
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Reporte de Rentabilidad</h1>
          <p className={styles.description}>
            Análisis financiero de ingresos, costos de venta (COGS), utilidad bruta y márgenes de ganancia.
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
            onClick={handleExport}
            disabled={isExporting || isLoading || !hasDataToExport}
            className={styles.exportBtn}
            title={
              isLoading
                ? "Cargando datos para exportar..."
                : !hasDataToExport
                ? "No hay ventas en este periodo para exportar"
                : "Descargar reporte completo en Excel (3 pestañas)"
            }
          >
            <img src={fileImportIcon} alt="" className={styles.btnIcon} />
            {isExporting ? "Exportando..." : "Exportar Excel"}
          </button>
        </div>
      </header>

      {/* Barra de Filtros */}
      <ProfitabilityFilters
        branchesList={branchesList}
        selectedBranchId={branchId}
        setSelectedBranchId={setBranchId}
        departmentsList={departmentsList}
        selectedDepartmentId={departmentId}
        setSelectedDepartmentId={setDepartmentId}
        startDate={startDate}
        endDate={endDate}
        dateRange={[startDate, endDate]}
        setDateRange={setDateRange}
        activeDatePreset={activeDatePreset}
        setQuickDatePreset={setQuickDatePreset}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onClear={handleClearFilters}
      />

      {/* Tarjetas de KPIs */}
      <ProfitabilityKpiCards kpis={kpis} />

      {/* Navegación por Pestañas */}
      <div className={styles.tabsNav}>
        <button
          type="button"
          onClick={() => setActiveTab("PRODUCTS")}
          className={`${styles.tabBtn} ${
            activeTab === "PRODUCTS" ? styles.tabBtnActive : ""
          }`.trim()}
        >
          <img src={boxIcon} alt="" className={styles.tabBtnIcon} />
          Rentabilidad por Producto
          <span className={styles.tabBadge}>{filteredProducts.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("DEPARTMENTS")}
          className={`${styles.tabBtn} ${
            activeTab === "DEPARTMENTS" ? styles.tabBtnActive : ""
          }`.trim()}
        >
          <img src={tagIcon} alt="" className={styles.tabBtnIcon} />
          Por Departamento
          <span className={styles.tabBadge}>{filteredDepartments.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("CRITICAL")}
          className={`${styles.tabBtn} ${
            activeTab === "CRITICAL" ? styles.tabBtnActive : ""
          }`.trim()}
        >
          <img src={warningIcon} alt="" className={styles.tabBtnIcon} />
          Margen Crítico / Alerta
          <span
            className={`${styles.tabBadge} ${
              criticalProducts.length > 0 ? styles.tabBadgeWarning : ""
            }`.trim()}
          >
            {criticalProducts.length}
          </span>
        </button>
      </div>

      {/* Contenido Principal según Pestaña */}
      <div className={styles.contentWrapper}>
        {isLoading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <span>Calculando márgenes y rentabilidad financiera...</span>
          </div>
        ) : error ? (
          <div className={styles.errorState}>
            <span>{error}</span>
            <button
              type="button"
              onClick={refresh}
              className={styles.retryBtn}
            >
              Reintentar
            </button>
          </div>
        ) : (
          <>
            {activeTab === "PRODUCTS" && (
              <ProfitabilityProductsTable
                products={filteredProducts}
                sortBy={sortBy}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
            )}

            {activeTab === "DEPARTMENTS" && (
              <ProfitabilityDepartmentsTable
                departments={filteredDepartments}
              />
            )}

            {activeTab === "CRITICAL" && (
              <ProfitabilityCriticalTable
                criticalProducts={criticalProducts}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PageProfitabilityReport;
