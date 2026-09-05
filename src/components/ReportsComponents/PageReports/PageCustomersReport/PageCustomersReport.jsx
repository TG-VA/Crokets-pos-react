/**
 * PageCustomersReport.jsx
 * Orquestador principal de la vista de Reporte de Clientes (historial completo).
 */

import React, { useState, useEffect } from "react";
import styles from "./PageCustomersReport.module.css";
import { useBranch } from "../../../../contexts/BranchContext";

// Componentes modulares
import CustomersReportFilters from "./components/CustomersReportFilters";
import CustomersKpiCards from "./components/CustomersKpiCards";
import CustomersRankingTable from "./components/CustomersRankingTable";
import CustomersProductsSummaryTable from "./components/CustomersProductsSummaryTable";
import CustomersRewardsSummaryTable from "./components/CustomersRewardsSummaryTable";
import CustomerDetailModal from "./components/CustomerDetailModal";

// Hooks y Servicios
import { useCustomersReport } from "./hooks/useCustomersReport";
import { useCustomerDetail } from "./hooks/useCustomerDetail";
import { fetchBranchesList } from "./services/customersReportService";
import { exportCustomersReportToExcel } from "./utils/customersReportExportUtils";

// Iconos SVG
import fileImportIcon from "../../../../assets/icons/file-import-solid-full.svg";
import userIcon from "../../../../assets/icons/user-solid.svg";
import basketIcon from "../../../../assets/icons/basket-shopping-solid-full.svg";
import giftsIcon from "../../../../assets/icons/gifts-solid-full.svg";

const PageCustomersReport = () => {
  const { branch } = useBranch();

  const [branchesList, setBranchesList] = useState([]);
  const [isExporting, setIsExporting] = useState(false);

  // Hook del reporte principal (historial completo)
  const {
    branchId,
    setBranchId,
    customerType,
    setCustomerType,
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
    riskFilter,
    setRiskFilter,
    sortBy,
    sortDirection,
    handleSort,
    reportData,
    filteredCustomers,
    filteredTopProducts,
    filteredRedemptions,
    kpis,
    isLoading,
    error,
    refresh,
  } = useCustomersReport(branch?.id || "ALL");

  // Hook del modal de detalle 360°
  const {
    customerDetail,
    loadingDetail,
    errorDetail,
    isDetailOpen,
    openCustomerDetail,
    closeCustomerDetail,
  } = useCustomerDetail();

  // Cargar catálogo de sucursales
  useEffect(() => {
    const loadBranches = async () => {
      const list = await fetchBranchesList();
      setBranchesList(list);
    };
    loadBranches();
  }, []);

  // Exportar a Excel
  const hasDataToExport =
    filteredCustomers.length > 0 ||
    filteredTopProducts.length > 0 ||
    filteredRedemptions.length > 0;

  const handleExport = async () => {
    try {
      setIsExporting(true);

      const branchObj = branchesList.find((b) => b.id === branchId);
      const branchName = branchId === "ALL" ? "Todas las sucursales" : branchObj?.name || "Sucursal";

      await exportCustomersReportToExcel({
        rankedCustomers: filteredCustomers,
        topProducts: filteredTopProducts,
        redemptionsList: filteredRedemptions,
        kpis,
        branchName,
        activeTab,
        customerType,
        riskFilter,
        searchTerm,
      });
    } catch (err) {
      console.error("Error al exportar reporte de clientes:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      {/* Cabecera Principal */}
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Reporte de Clientes</h1>
          <p className={styles.description}>
            Historial completo de clientes con mayor gasto, visitas frecuentes, productos preferidos, puntos acumulados y canjes de recompensas.
          </p>
        </div>

        <div className={styles.actionButtons}>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting || isLoading || !hasDataToExport}
            className={styles.exportBtn}
            title="Descargar reporte en formato Excel"
          >
            <img src={fileImportIcon} alt="" className={styles.btnIcon} />
            {isExporting ? "Exportando..." : "Exportar Excel"}
          </button>
        </div>
      </header>

      {/* Barra de Filtros */}
      <CustomersReportFilters
        branchesList={branchesList}
        selectedBranchId={branchId}
        setSelectedBranchId={setBranchId}
        customerType={customerType}
        setCustomerType={setCustomerType}
        riskFilter={riskFilter}
        setRiskFilter={setRiskFilter}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        activeTab={activeTab}
      />

      {/* Tarjetas de Métricas (KPIs) */}
      <CustomersKpiCards kpis={kpis} />

      {/* Navegación por Pestañas */}
      <div className={styles.tabsNav}>
        <button
          type="button"
          onClick={() => setActiveTab("RANKING")}
          className={`${styles.tabBtn} ${
            activeTab === "RANKING" ? styles.tabBtnActive : ""
          }`.trim()}
        >
          <img src={userIcon} alt="" style={{ width: 14, height: 14 }} />
          Ranking de Clientes
          <span className={styles.tabBadge}>{filteredCustomers.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("PRODUCTS")}
          className={`${styles.tabBtn} ${
            activeTab === "PRODUCTS" ? styles.tabBtnActive : ""
          }`.trim()}
        >
          <img src={basketIcon} alt="" style={{ width: 14, height: 14 }} />
          ¿Qué compran los clientes?
          <span className={styles.tabBadge}>{filteredTopProducts.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("REWARDS")}
          className={`${styles.tabBtn} ${
            activeTab === "REWARDS" ? styles.tabBtnActive : ""
          }`.trim()}
        >
          <img src={giftsIcon} alt="" style={{ width: 14, height: 14 }} />
          Recompensas y Lealtad
          <span className={styles.tabBadge}>
            {filteredRedemptions.length}
          </span>
        </button>
      </div>

      {/* Contenido Principal según Pestaña */}
      <div className={styles.contentWrapper}>
        {isLoading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <span>Consultando datos del reporte de clientes...</span>
          </div>
        ) : error ? (
          <div className={styles.errorState}>
            <span>{error}</span>
            <button
              type="button"
              onClick={refresh}
              className={styles.exportBtn}
              style={{ backgroundColor: "#0284c7" }}
            >
              Reintentar
            </button>
          </div>
        ) : (
          <>
            {activeTab === "RANKING" && (
              <CustomersRankingTable
                customers={filteredCustomers}
                sortBy={sortBy}
                sortDirection={sortDirection}
                onSort={handleSort}
                onSelectCustomer={openCustomerDetail}
              />
            )}

            {activeTab === "PRODUCTS" && (
              <CustomersProductsSummaryTable products={filteredTopProducts} />
            )}

            {activeTab === "REWARDS" && (
              <CustomersRewardsSummaryTable
                redemptions={filteredRedemptions}
                onSelectCustomer={openCustomerDetail}
              />
            )}
          </>
        )}
      </div>

      {/* Modal de Detalle 360° del Cliente */}
      <CustomerDetailModal
        isOpen={isDetailOpen}
        onClose={closeCustomerDetail}
        customerDetail={customerDetail}
        loading={loadingDetail}
        error={errorDetail}
      />
    </div>
  );
};

export default PageCustomersReport;
