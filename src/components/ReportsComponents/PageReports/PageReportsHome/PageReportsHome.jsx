import React from "react";

import ReportKpiCard from "./components/ReportKpiCard/ReportKpiCard";
import ReportsAlerts from "./components/ReportsAlerts/ReportsAlerts";
import ReportsHighlights from "./components/ReportsHighlights/ReportsHighlights";
import ReportsSalesChart from "./components/ReportsSalesChart/ReportsSalesChart";

import useReportsDashboard from "./hooks/useReportsDashboard";

import styles from "./PageReportsHome.module.css";

const formatCurrency = (value) => {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
};

const formatNumber = (value) => {
  return new Intl.NumberFormat("es-MX", {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
};

const formatLastUpdate = (isoDate) => {
  if (!isoDate) return "";

  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoDate));
};

const PageReportsHome = () => {
  const {
    dashboard,
    loading,
    refreshing,
    error,
    branch,
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
            Indicadores principales de la sucursal
            {branch?.name ? ` ${branch.name}` : " activa"}.
          </p>
        </div>

        <div className={styles.headerActions}>
          {meta.generatedAt ? (
            <span className={styles.lastUpdate}>
              Actualizado {formatLastUpdate(meta.generatedAt)}
            </span>
          ) : null}

          <button
            type="button"
            className={styles.refreshButton}
            onClick={reloadDashboard}
            disabled={loading || refreshing || !branch?.id}
          >
            {refreshing ? "Actualizando..." : "Actualizar"}
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
        <ReportKpiCard
          title="Ventas netas"
          value={formatCurrency(kpis.netSalesToday)}
          description="Ventas completadas menos devoluciones"
          loading={loading}
          variant="success"
        />

        <ReportKpiCard
          title="Tickets completados"
          value={formatNumber(
            kpis.completedTicketsToday
          )}
          description="Operaciones finalizadas hoy"
          loading={loading}
          variant="default"
        />

        <ReportKpiCard
          title="Ticket promedio"
          value={formatCurrency(
            kpis.averageTicketToday
          )}
          description="Promedio neto por venta"
          loading={loading}
          variant="info"
        />

        <ReportKpiCard
          title="Unidades netas"
          value={formatNumber(kpis.netUnitsToday)}
          description={unitsDescription}
          loading={loading}
          variant={
            Number(kpis.netUnitsToday || 0) < 0
              ? "danger"
              : "success"
          }
        />
      </section>

      <div className={styles.mainGrid}>
        <ReportsSalesChart
          data={salesChart}
          loading={loading}
        />

        <ReportsAlerts
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