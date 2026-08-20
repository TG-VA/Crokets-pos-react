import React, { useState, useEffect } from "react";
import styles from "./PageProductsReport.module.css";
import { exportFullReportToExcel } from "../../../../utils/exportUtils";

import ProductReportFilters from "./components/ProductReportFilters";
import ProductKpiCards from "./components/ProductKpiCards";
import DepartmentPerformance from "./components/DepartmentPerformance";
import TopProductsTable from "./components/TopProductsTable";
import DeadStockTable from "./components/DeadStockTable";

import { useProductsReport } from "./hooks/useProductsReport";
import { useBranch } from "../../../../contexts/BranchContext"; 
import { supabase } from "../../../../lib/supabaseClient";

const PageProductsReport = () => {
  const { branch, setBranch } = useBranch();
  
  const [branchesList, setBranchesList] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [selectedBranchId, setSelectedBranchId] = useState(branch?.id || "ALL");

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

        if (data) {
          setBranchesList(data);
        }
      } catch (err) {
        console.error("Error al cargar la lista de sucursales:", err);
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
    dateRange, 
    setDateRange, 
    reportData, 
    isLoading, 
    error,
    generateReport
  } = useProductsReport(selectedBranchId);

  return (
    <div className={styles.pageContainer}>
      <header className={styles.headerCard}>
        <div className={styles.headerTitleGroup}>
          <h1 className={styles.title}>Reporte de Productos</h1>
          <p className={styles.description}>
            Consulta productos vendidos, ingresos, cantidades totales y rendimiento por departamento.
          </p>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.branchSelectContainer}>
            <label className={styles.branchSelectLabel}>
              SUCURSAL:
            </label>
            <select
              value={selectedBranchId}
              onChange={handleBranchChange}
              disabled={loadingBranches}
              className={styles.branchSelectInput}
            >
              <option value="ALL">Todas las sucursales</option>
              {branchesList.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <ProductReportFilters 
            dateRange={dateRange} 
            setDateRange={setDateRange} 
            onGenerate={generateReport}
            onExportPDF={() => window.print()}
            onExportExcel={() => exportFullReportToExcel(reportData, selectedBranchId)}
          />
        </div>
      </header>

      {error && <div className={styles.errorMessage}>{error}</div>}

      <section className={styles.kpiSection}>
        <ProductKpiCards data={reportData?.kpis} isLoading={isLoading} />
      </section>

      <section className={styles.reportsGrid}>
        <div className={styles.reportCard}>
          <div className={styles.cardHeader}>
            <h2>Rendimiento por Departamento</h2>
            <p className={styles.subtitle}>
              Distribución de unidades e ingresos según la clasificación del catálogo.
            </p>
          </div>
          <div className={styles.cardBody}>
            <DepartmentPerformance data={reportData?.byDepartment} isLoading={isLoading} />
          </div>
        </div>

        <div className={styles.reportCard}>
          <div className={styles.cardHeader}>
            <h2>Productos Más Vendidos (Top)</h2>
            <p className={styles.subtitle}>
              Listado de artículos con mayor volumen de salida e ingresos.
            </p>
          </div>
          <div className={styles.cardBody}>
            <TopProductsTable data={reportData?.topProducts} isLoading={isLoading} />
          </div>
        </div>

        <div className={styles.reportCard}>
          <div className={styles.cardHeader}>
            <h2>Productos de Menor Rotación</h2>
            <p className={styles.subtitle}>
              Artículos con el menor volumen de ventas registrado en el periodo.
            </p>
          </div>
          <div className={styles.cardBody}>
            <TopProductsTable data={reportData?.bottomProducts} isLoading={isLoading} />
          </div>
        </div>

        <div className={styles.reportCard}>
          <div className={styles.cardHeader}>
            <h2>Productos sin Movimiento</h2>
            <p className={styles.subtitle}>
              Artículos con existencia física que no han registrado salidas.
            </p>
          </div>
          <div className={styles.cardBody}>
            <DeadStockTable data={reportData?.deadStock} isLoading={isLoading} />
          </div>
        </div>
      </section>
    </div>
  );
};

export default PageProductsReport;