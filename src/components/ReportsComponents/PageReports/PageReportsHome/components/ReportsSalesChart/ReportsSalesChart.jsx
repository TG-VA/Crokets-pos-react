import React, { useMemo } from "react";

import styles from "./ReportsSalesChart.module.css";

const MAX_BAR_HEIGHT_PERCENTAGE = 84;
const MIN_BAR_HEIGHT_PERCENTAGE = 7;

const formatCurrency = (value) => {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
};

const ReportsSalesChart = ({
  data = [],
  loading = false,
}) => {
  const maxTotal = useMemo(() => {
    const totals = data.map((item) =>
      Number(item?.total || 0)
    );

    return Math.max(...totals, 0);
  }, [data]);

  const totalPeriod = useMemo(() => {
    return data.reduce(
      (sum, item) =>
        sum + Number(item?.total || 0),
      0
    );
  }, [data]);

  const totalTickets = useMemo(() => {
    return data.reduce(
      (sum, item) =>
        sum + Number(item?.tickets || 0),
      0
    );
  }, [data]);

  const hasData = data.some(
    (item) =>
      Number(item?.total || 0) > 0 ||
      Number(item?.tickets || 0) > 0
  );

  return (
    <section className={styles.card}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <h2 className={styles.title}>
            Ventas de los últimos 7 días
          </h2>

          <p className={styles.description}>
            Importe neto después de devoluciones.
          </p>
        </div>

        <div className={styles.summary}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>
              Total
            </span>

            <strong className={styles.summaryValue}>
              {loading
                ? "—"
                : formatCurrency(totalPeriod)}
            </strong>
          </div>

          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>
              Tickets
            </span>

            <strong className={styles.summaryValue}>
              {loading ? "—" : totalTickets}
            </strong>
          </div>
        </div>
      </header>

      {loading ? (
        <div className={styles.loadingChart}>
          {Array.from({ length: 7 }).map(
            (_, index) => (
              <div
                key={index}
                className={styles.loadingColumn}
              >
                <div className={styles.loadingValueArea}>
                  <div
                    className={styles.loadingBar}
                    style={{
                      height: `${28 + index * 7}%`,
                    }}
                  />
                </div>

                <div className={styles.loadingLabel} />
              </div>
            )
          )}
        </div>
      ) : !hasData ? (
        <div className={styles.emptyState}>
          <strong>No hay ventas en el periodo</strong>

          <span>
            La gráfica se actualizará cuando existan
            ventas completadas.
          </span>
        </div>
      ) : (
        <div className={styles.chartWrapper}>
          <div className={styles.chart}>
            {data.map((item) => {
              const total = Number(item?.total || 0);
              const tickets = Number(
                item?.tickets || 0
              );

              const proportionalHeight =
                maxTotal > 0
                  ? (total / maxTotal) *
                    MAX_BAR_HEIGHT_PERCENTAGE
                  : 0;

              const barHeight =
                total > 0
                  ? Math.max(
                      proportionalHeight,
                      MIN_BAR_HEIGHT_PERCENTAGE
                    )
                  : 0;

              return (
                <div
                  key={item.date}
                  className={styles.column}
                >
                  <div className={styles.valueArea}>
                    {total > 0 ? (
                      <div
                        className={styles.barGroup}
                        style={{
                          height: `${barHeight}%`,
                        }}
                      >
                        <span className={styles.tooltip}>
                          <strong>
                            {formatCurrency(total)}
                          </strong>

                          <small>
                            {tickets} ticket
                            {tickets === 1 ? "" : "s"}
                          </small>
                        </span>

                        <div
                          className={styles.bar}
                          aria-label={`${item.label}: ${formatCurrency(
                            total
                          )}, ${tickets} tickets`}
                        />
                      </div>
                    ) : (
                      <div
                        className={styles.zeroMarker}
                        aria-label={`${item.label}: sin ventas`}
                      />
                    )}
                  </div>

                  <span className={styles.dayLabel}>
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};

export default ReportsSalesChart;