import React from "react";
import { useNavigate } from "react-router-dom";

import styles from "./ReportsAlerts.module.css";
import { formatCurrency } from "../../../../../../utils/formatters";

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
  selectedBranchId = "ALL",
  cancelledSalesToday = 0,
  returnsToday = 0,
  returnedAmountToday = 0,
  returnedUnitsToday = 0,
  outOfStockCount: propOutOfStockCount,
  lowStockCount: propLowStockCount,
  outOfStockProducts = [],
  lowStockProducts = [],
  loading = false,
}) => {
  const navigate = useNavigate();

  const outOfStockCount =
    typeof propOutOfStockCount === "number"
      ? propOutOfStockCount
      : outOfStockProducts.length || 0;

  const lowStockCount =
    typeof propLowStockCount === "number"
      ? propLowStockCount
      : lowStockProducts.length || 0;

  const totalInventoryAlerts =
    outOfStockCount + lowStockCount;

  const hasInventoryAlerts =
    totalInventoryAlerts > 0;

  const inventoryStatus = hasInventoryAlerts
    ? "Requiere atención"
    : "Sin alertas críticas";

  const openInventoryReport = () => {
    const targetBranch = selectedBranchId || "ALL";
    navigate(`/reports/inventario?branchId=${encodeURIComponent(targetBranch)}`, {
      state: { branchId: targetBranch },
    });
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
                      : undefined
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
                      : undefined
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
              <span>Ver reporte de inventario</span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden="true"
                className={styles.buttonArrow}
              >
                <path
                  fillRule="evenodd"
                  d="M4 8a.5.5 0 0 1 .5-.5h5.793L8.146 5.354a.5.5 0 1 1 .708-.708l3 3a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708-.708L10.293 8.5H4.5A.5.5 0 0 1 4 8z"
                />
              </svg>
            </button>
          </div>
        </>
      )}
    </section>
  );
};

export default ReportsAlerts;
