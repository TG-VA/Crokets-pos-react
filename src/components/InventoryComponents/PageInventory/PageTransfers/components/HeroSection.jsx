import React from "react";
import styles from "../PageTransfers.module.css";

const HeroSection = ({
  branch,
  pendingReceiptsCount,
  transferMetrics,
}) => {
  return (
    <section className={styles.hero}>
      <div className={styles.heroMain}>
        <p className={styles.eyebrow}>Inventario / Traspasos</p>
        <h1 className={styles.title}>TRASPASOS ENTRE SUCURSALES</h1>
        <p className={styles.description}>
          Controla envios internos, recepciones pendientes y diferencias de
          entrega desde un mismo flujo operativo.
        </p>

        <div className={styles.routeCard}>
          <div>
            <span className={styles.routeLabel}>Sucursal activa</span>
            <strong className={styles.routeValue}>
              {branch?.name || "Sin sucursal"}
            </strong>
          </div>

          <div>
            <span className={styles.routeLabel}>Recepciones pendientes</span>
            <strong className={styles.routeValue}>
              {pendingReceiptsCount}
            </strong>
          </div>
        </div>
      </div>

      <div className={styles.heroAside}>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Enviados</span>
          <strong className={styles.metricValue}>
            {transferMetrics.sent}
          </strong>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Pendientes</span>
          <strong className={styles.metricValue}>
            {transferMetrics.pendingReceipts}
          </strong>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Recepciones cerradas</span>
          <strong className={styles.metricValue}>
            {transferMetrics.completedReceipts}
          </strong>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>
            Cancelados / En tránsito
          </span>
          <strong className={styles.metricValue}>
            {transferMetrics.cancelled} / {transferMetrics.unitsInTransit}
          </strong>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
