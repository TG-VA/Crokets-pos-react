import React from "react";

import styles from "./ReportsHighlights.module.css";
import {
  formatCurrency,
  formatNumber,
} from "../../../../../../utils/formatters";

import tagIcon from "../../../../../../assets/icons/tag-solid-full.svg";
import cardIcon from "../../../../../../assets/icons/credit-card-solid-full.svg";

const ReportsHighlights = ({
  topProduct = null,
  mainPaymentMethod = null,
  loading = false,
}) => {
  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>Indicadores destacados</h2>

          <p className={styles.description}>
            Principales resultados del periodo de los últimos 7 días.
          </p>
        </div>
      </header>

      <div className={styles.grid}>
        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>
              Producto más vendido
            </span>

            <div className={styles.iconBadge}>
              <img
                src={tagIcon}
                alt=""
                aria-hidden="true"
                className={styles.headerIcon}
              />
            </div>
          </div>

          {loading ? (
            <div className={styles.loadingContent}>
              <div className={styles.loadingTitle} />
              <div className={styles.loadingText} />
              <div className={styles.loadingTextSmall} />
            </div>
          ) : topProduct ? (
            <div className={styles.cardContent}>
              <strong className={styles.mainValue}>
                {topProduct.name}
              </strong>

              <span className={styles.secondaryText}>
                {topProduct.barcode
                  ? `Código: ${topProduct.barcode}`
                  : "Sin código registrado"}
              </span>

              <div className={styles.metrics}>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>
                    Unidades netas
                  </span>

                  <strong className={styles.metricValue}>
                    {formatNumber(topProduct.quantity || 0)}
                  </strong>
                </div>

                <div className={styles.metric}>
                  <span className={styles.metricLabel}>
                    Importe vendido
                  </span>

                  <strong className={styles.metricValue}>
                    {formatCurrency(topProduct.amount)}
                  </strong>
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <strong>Sin producto destacado</strong>

              <span>
                No existen ventas de productos en el periodo.
              </span>
            </div>
          )}
        </article>

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>
              Método de pago principal
            </span>

            <div className={styles.iconBadge}>
              <img
                src={cardIcon}
                alt=""
                aria-hidden="true"
                className={styles.headerIcon}
              />
            </div>
          </div>

          {loading ? (
            <div className={styles.loadingContent}>
              <div className={styles.loadingTitle} />
              <div className={styles.loadingText} />
              <div className={styles.loadingTextSmall} />
            </div>
          ) : mainPaymentMethod ? (
            <div className={styles.cardContent}>
              <strong className={styles.mainValue}>
                {String(mainPaymentMethod.name || "").toUpperCase()}
              </strong>

              <span className={styles.secondaryText}>
                Método con mayor importe procesado
              </span>

              <div className={styles.metrics}>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>
                    Importe acumulado
                  </span>

                  <strong className={styles.primaryAmount}>
                    {formatCurrency(mainPaymentMethod.amount)}
                  </strong>
                </div>

                <div className={styles.metric}>
                  <span className={styles.metricLabel}>
                    Participación
                  </span>

                  <strong className={styles.metricValue}>
                    {typeof mainPaymentMethod.sharePercentage === "number"
                      ? `${mainPaymentMethod.sharePercentage}% del total`
                      : "—"}
                  </strong>
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <strong>Sin método destacado</strong>

              <span>
                No existen pagos registrados en el periodo.
              </span>
            </div>
          )}
        </article>
      </div>
    </section>
  );
};

export default ReportsHighlights;

