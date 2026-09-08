import React, { useState, useEffect } from "react";
import styles from "./PageInventoryReport.module.css";
import subStyles from "./components/InventoryComponents.module.css";
import { exportInventoryReportToExcel } from "../../../../utils/exportUtils";
import { useBranch } from "../../../../contexts/BranchContext";
import { supabase } from "../../../../lib/supabaseClient";

import fileImportIcon from "../../../../assets/icons/file-import-solid-full.svg";

import InventoryKpiCards from "./components/InventoryKpiCards";
import InventoryReportFilters from "./components/InventoryReportFilters";
import InventoryValuationTable from "./components/InventoryValuationTable";
import ReorderSuggestionsTable from "./components/ReorderSuggestionsTable";
import InventoryDepartmentSummary from "./components/InventoryDepartmentSummary";

import { useInventoryReport } from "./hooks/useInventoryReport";

const PageInventoryReport = () => {
  const { branch, setBranch } = useBranch();

  const [branchesList, setBranchesList] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [selectedBranchId, setSelectedBranchId] = useState(branch?.id || "ALL");
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (branch?.id) {
      setSelectedBranchId(branch.id);
    }
  }, [branch?.id]);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        setLoadingBranches(true);
        const { data, error } = await supabase
          .from("branches")
          .select("id, name")
          .order("name", { ascending: true });

        if (error) throw error;
        if (data) setBranchesList(data);
      } catch (err) {
        console.error("Error al cargar sucursales:", err);
      } finally {
        setLoadingBranches(false);
      }
    };

    fetchBranches();
  }, []);

  const handleBranchChange = (e) => {
    const newBranchId = e.target.value;
    setSelectedBranchId(newBranchId);

    if (newBranchId !== "ALL") {
      const selectedObj = branchesList.find((b) => b.id === newBranchId);
      if (selectedObj && setBranch) {
        setBranch(selectedObj);
      }
    }
  };

  const {
    reportData,
    filteredItems,
    filteredReorder,
    filteredExhausted,
    departments,
    kpis,
    byDepartment,
    isLoading,
    error,
    selectedDepartment,
    setSelectedDepartment,
    selectedStockStatus,
    setSelectedStockStatus,
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
  } = useInventoryReport(selectedBranchId);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const branchName =
        selectedBranchId === "ALL"
          ? "Todas_las_sucursales"
          : branchesList.find((b) => b.id === selectedBranchId)?.name || "Sucursal";

      await exportInventoryReportToExcel(reportData, branchName);
    } catch (err) {
      console.error("Error al exportar inventario:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      {/* Cabecera Principal */}
      <header className={styles.headerCard}>
        <div className={styles.headerTitleGroup}>
          <h1 className={styles.title}>Reporte de Inventario</h1>
          <p className={styles.description}>
            Consulta existencias físicas, valorización al costo y venta, sugerencias de reorden y productos agotados.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.exportBtn}
            onClick={handleExport}
            disabled={isLoading || isExporting || (!reportData || reportData.length === 0)}
            title="Descargar reporte de inventario en Excel"
          >
            <img src={fileImportIcon} alt="" className={styles.btnIcon} />
            {isExporting ? "Exportando..." : "Exportar Excel"}
          </button>
        </div>
      </header>

      {/* Alerta de Error si ocurre */}
      {error && <div className={styles.errorAlert}>{error}</div>}

      {/* Tarjetas KPI */}
      <InventoryKpiCards kpis={kpis} isLoading={isLoading} />

      {/* Barra de Filtros */}
      <InventoryReportFilters
        branchesList={branchesList}
        selectedBranchId={selectedBranchId}
        onSelectBranch={handleBranchChange}
        loadingBranches={loadingBranches}
        departments={departments}
        selectedDepartment={selectedDepartment}
        onSelectDepartment={setSelectedDepartment}
        selectedStockStatus={selectedStockStatus}
        onSelectStockStatus={setSelectedStockStatus}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onClear={() => {
          setSelectedDepartment("ALL");
          setSelectedStockStatus("ALL");
          setSearchTerm("");
          setSelectedBranchId(branch?.id || "ALL");
        }}
        isLoading={isLoading}
      />

      {/* Pestañas de Navegación de Vistas */}
      <div className={subStyles.tabsContainer}>
        <button
          type="button"
          className={[
            subStyles.tabButton,
            activeTab === "valuation" ? subStyles.tabButtonActive : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => setActiveTab("valuation")}
        >
          Existencias y Valorización
          <span
            className={[
              subStyles.tabBadge,
              activeTab === "valuation" ? subStyles.tabBadgeActive : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {filteredItems.length}
          </span>
        </button>

        <button
          type="button"
          className={[
            subStyles.tabButton,
            activeTab === "reorder" ? subStyles.tabButtonActive : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => setActiveTab("reorder")}
        >
          Sugerencias de Reorden
          <span
            className={[
              subStyles.tabBadge,
              activeTab === "reorder" ? subStyles.tabBadgeActive : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {filteredReorder.length}
          </span>
        </button>

        <button
          type="button"
          className={[
            subStyles.tabButton,
            activeTab === "departments" ? subStyles.tabButtonActive : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => setActiveTab("departments")}
        >
          Por Departamento
          <span
            className={[
              subStyles.tabBadge,
              activeTab === "departments" ? subStyles.tabBadgeActive : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {byDepartment.length}
          </span>
        </button>

        <button
          type="button"
          className={[
            subStyles.tabButton,
            activeTab === "exhausted" ? subStyles.tabButtonActive : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => setActiveTab("exhausted")}
        >
          Productos Agotados
          <span
            className={[
              subStyles.tabBadge,
              activeTab === "exhausted" ? subStyles.tabBadgeActive : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {filteredExhausted.length}
          </span>
        </button>
      </div>

      {/* Contenido de la Pestaña Activa */}
      {activeTab === "valuation" && (
        <InventoryValuationTable items={filteredItems} isLoading={isLoading} />
      )}

      {activeTab === "reorder" && (
        <ReorderSuggestionsTable items={filteredReorder} isLoading={isLoading} />
      )}

      {activeTab === "departments" && (
        <InventoryDepartmentSummary departmentData={byDepartment} isLoading={isLoading} />
      )}

      {activeTab === "exhausted" && (
        <InventoryValuationTable
          items={filteredExhausted}
          isLoading={isLoading}
          title="Productos Agotados"
          subtitle={`Mostrando ${filteredExhausted.length} producto(s) con stock en cero`}
        />
      )}
    </div>
  );
};

export default PageInventoryReport;
