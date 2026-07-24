import React from "react";
import { useNavigate } from "react-router-dom";

import styles from "./ReportsAlerts.module.css";

const formatCurrency = (value) => {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
};

const AlertRow = ({
  label,
  value,
  tone = "default",
}) => {
  return (
    <div className={styles.alertRow}>
      <span className={styles.alertLabel}>
        {label}
      </span>

      <strong
        className={`${styles.alertValue} ${
          styles[tone] || ""
        }`}
      >
        {value}
      </strong>
    </div>
  );
};

const ReportsAlerts = ({
  cancelledSalesToday = 0,
  returnsToday = 0,
  returnedAmountToday = 0,
  returnedUnitsToday = 0,
  outOfStockProducts = [],
  lowStockProducts = [],
  loading = false,
}) => {
  const navigate = useNavigate();

  const outOfStockCount =
    outOfStockProducts.length;

  const lowStockCount =
    lowStockProducts.length;

  const totalInventoryAlerts =
    outOfStockCount + lowStockCount;

  const hasInventoryAlerts =
    totalInventoryAlerts > 0;

  const inventoryStatus = hasInventoryAlerts
    ? "Requiere atención"
    : "Sin alertas críticas";

  const openInventoryReport = () => {
    navigate("/reports/inventario");
  };

  return (
    <section className={styles.card}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>
            Resumen operativo
          </h2>

          <p className={styles.description}>
            Incidencias registradas hoy.
          </p>
        </div>
      </header>

      {loading ? (
        <div className={styles.loadingState}>
          {Array.from({ length: 6 }).map(
            (_, index) => (
              <div key={index} />
            )
          )}
        </div>
      ) : (
        <>
          <div className={styles.alertRows}>
            <AlertRow
              label="Cancelaciones"
              value={Number(
                cancelledSalesToday || 0
              )}
              tone={
                Number(cancelledSalesToday || 0) > 0
                  ? "danger"
                  : "default"
              }
            />

            <AlertRow
              label="Devoluciones"
              value={Number(returnsToday || 0)}
              tone={
                Number(returnsToday || 0) > 0
                  ? "warning"
                  : "default"
              }
            />

            <AlertRow
              label="Monto devuelto"
              value={formatCurrency(
                returnedAmountToday
              )}
              tone={
                Number(returnedAmountToday || 0) > 0
                  ? "warning"
                  : "default"
              }
            />

            <AlertRow
              label="Unidades devueltas"
              value={Number(
                returnedUnitsToday || 0
              )}
              tone={
                Number(returnedUnitsToday || 0) > 0
                  ? "warning"
                  : "default"
              }
            />
          </div>

          <div
            className={`${styles.inventorySummary} ${
              hasInventoryAlerts
                ? styles.inventoryWarning
                : styles.inventoryHealthy
            }`}
          >
            <div
              className={
                styles.inventorySummaryHeader
              }
            >
              <div>
                <span
                  className={
                    styles.inventoryEyebrow
                  }
                >
                  Inventario
                </span>

                <strong
                  className={
                    styles.inventoryStatus
                  }
                >
                  {inventoryStatus}
                </strong>
              </div>

              <span
                className={`${styles.statusBadge} ${
                  hasInventoryAlerts
                    ? styles.statusWarning
                    : styles.statusHealthy
                }`}
              >
                {hasInventoryAlerts
                  ? totalInventoryAlerts
                  : "OK"}
              </span>
            </div>

            <div className={styles.inventoryMetrics}>
              <div className={styles.inventoryMetric}>
                <span>Productos agotados</span>

                <strong
                  className={
                    outOfStockCount > 0
                      ? styles.danger
                      : ""
                  }
                >
                  {outOfStockCount}
                </strong>
              </div>

              <div className={styles.inventoryMetric}>
                <span>
                  Productos con stock bajo
                </span>

                <strong
                  className={
                    lowStockCount > 0
                      ? styles.warning
                      : ""
                  }
                >
                  {lowStockCount}
                </strong>
              </div>
            </div>

            <button
              type="button"
              className={styles.inventoryButton}
              onClick={openInventoryReport}
            >
              Ver reporte de inventario
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </>
      )}
    </section>
  );
};

export default ReportsAlerts;