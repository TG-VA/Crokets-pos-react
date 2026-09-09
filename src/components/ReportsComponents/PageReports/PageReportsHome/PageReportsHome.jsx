import React from "react";

import ReportKpiCard from "./components/ReportKpiCard/ReportKpiCard";
import ReportsAlerts from "./components/ReportsAlerts/ReportsAlerts";
import ReportsHighlights from "./components/ReportsHighlights/ReportsHighlights";
import ReportsSalesChart from "./components/ReportsSalesChart/ReportsSalesChart";

import { formatCurrency, formatNumber, formatSyncTime } from "../../../../utils/formatters";
import useReportsDashboard from "./hooks/useReportsDashboard";

import rotateIcon from "../../../../assets/icons/rotate-left-solid-full.svg";
import dollarIcon from "../../../../assets/icons/dollar-sign-solid-full.svg";
import receiptIcon from "../../../../assets/icons/receipt-solid-full.svg";
import chartIcon from "../../../../assets/icons/chart-line-solid-full.svg";
import boxIcon from "../../../../assets/icons/box-solid-full.svg";

import styles from "./PageReportsHome.module.css";

const PageReportsHome = () => {
  const {
    dashboard,
    loading,
    refreshing,
    error,
    branches,
    selectedBranchId,
    setSelectedBranchId,
    selectedBranch,
    reloadDashboard,
  } = useReportsDashboard();

  const {
    kpis,
    salesChart,
    highlights,
    alerts,
    meta,
  } = dashboard;

  const unitsDescription = `${formatNumber(
    kpis.grossUnitsSoldToday
  )} vendidas · ${formatNumber(
    kpis.returnedUnitsToday
  )} devueltas`;

  const kpiDescriptors = [
    {
      key: "netSales",
      title: "Ventas netas",
      value: formatCurrency(kpis.netSalesToday),
      description: "Ventas completadas menos devoluciones",
      variant: "success",
      icon: dollarIcon,
    },
    {
      key: "completedTickets",
      title: "Tickets completados",
      value: formatNumber(kpis.completedTicketsToday),
      description: "Operaciones finalizadas hoy",
      variant: "default",
      icon: receiptIcon,
    },
    {
      key: "averageTicket",
      title: "Ticket promedio",
      value: formatCurrency(kpis.averageTicketToday),
      description: "Promedio neto por venta",
      variant: "info",
      icon: chartIcon,
    },
    {
      key: "netUnits",
      title: "Unidades netas",
      value: formatNumber(kpis.netUnitsToday),
      description: unitsDescription,
      variant: Number(kpis.netUnitsToday || 0) < 0 ? "danger" : "success",
      icon: boxIcon,
    },
  ];

  const branchDescription =
    selectedBranchId === "ALL"
      ? "Indicadores consolidados de todas las sucursales."
      : `Indicadores principales de la sucursal ${
          selectedBranch?.name || ""
        }.`;

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInfo}>
          <span className={styles.eyebrow}>
            Resumen ejecutivo
          </span>

          <h1 className={styles.title}>
            ¿Cómo va el negocio hoy?
          </h1>

          <p className={styles.description}>
            {branchDescription}
          </p>
        </div>

        <div className={styles.headerActions}>
          {branches.length > 1 ? (
            <div className={styles.branchSelectWrapper}>
              <select
                id="dashboard-branch-select"
                className={styles.branchSelect}
                value={selectedBranchId}
                onChange={(e) =>
                  setSelectedBranchId(e.target.value)
                }
                disabled={loading || refreshing}
                aria-label="Seleccionar sucursal"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {meta.generatedAt ? (
            <span className={styles.lastUpdate}>
              Sincronizado {formatSyncTime(meta.generatedAt)}
            </span>
          ) : null}

          <button
            type="button"
            className={styles.refreshButton}
            onClick={reloadDashboard}
            disabled={loading || refreshing}
          >
            <img
              src={rotateIcon}
              alt=""
              aria-hidden="true"
              className={`${styles.refreshIcon} ${
                refreshing ? styles.spin : ""
              }`}
            />
            <span>
              {refreshing ? "Actualizando..." : "Actualizar"}
            </span>
          </button>
        </div>
      </header>

      {error ? (
        <div className={styles.errorBanner} role="alert">
          <div>
            <strong>No se pudo cargar el resumen</strong>
            <span>{error}</span>
          </div>

          <button
            type="button"
            onClick={reloadDashboard}
            disabled={loading || refreshing}
          >
            Reintentar
          </button>
        </div>
      ) : null}

      <section
        className={styles.kpisGrid}
        aria-label="Indicadores principales"
      >
        {kpiDescriptors.map((kpi) => (
          <ReportKpiCard
            key={kpi.key}
            title={kpi.title}
            value={kpi.value}
            description={kpi.description}
            loading={loading}
            variant={kpi.variant}
            icon={kpi.icon}
          />
        ))}
      </section>

      <div className={styles.mainGrid}>
        <ReportsSalesChart
          data={salesChart}
          loading={loading}
        />

        <ReportsAlerts
          selectedBranchId={selectedBranchId}
          cancelledSalesToday={
            alerts.cancelledSalesToday
          }
          returnsToday={alerts.returnsToday}
          returnedAmountToday={
            alerts.returnedAmountToday
          }
          returnedUnitsToday={
            alerts.returnedUnitsToday
          }
          outOfStockCount={
            alerts.outOfStockCount
          }
          lowStockCount={
            alerts.lowStockCount
          }
          outOfStockProducts={
            alerts.outOfStockProducts
          }
          lowStockProducts={
            alerts.lowStockProducts
          }
          loading={loading}
        />
      </div>

      <ReportsHighlights
        topProduct={highlights.topProduct}
        mainPaymentMethod={
          highlights.mainPaymentMethod
        }
        loading={loading}
      />
    </section>
  );
};

export default PageReportsHome;
