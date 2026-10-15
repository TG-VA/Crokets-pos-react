import React from "react";
import styles from "../PageTransfers.module.css";

const HeroSection = ({ branch, pendingReceiptsCount, transferMetrics }) => {
  return (
    <section className={styles.hero}>
      <div className={styles.heroHeading}>
        <p className={styles.eyebrow}>Inventario / Traspasos</p>
        <h1 className={styles.title}>Traspasos entre sucursales</h1>
        <p className={styles.description}>
          Envíos internos, recepciones y diferencias en un solo flujo operativo.
        </p>
      </div>

      <div className={styles.heroStats}>
        <div className={styles.routeChip}>
          <span className={styles.metricLabel}>Sucursal activa</span>
          <strong className={styles.routeValue}>
            {branch?.name || "Sin sucursal"}
          </strong>
        </div>

        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Enviados</span>
          <strong className={styles.metricValue}>{transferMetrics.sent}</strong>
        </div>

        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>En tránsito</span>
          <strong className={styles.metricValue}>
            {transferMetrics.unitsInTransit}
          </strong>
        </div>

        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Por recibir</span>
          <strong className={styles.metricValue}>{pendingReceiptsCount}</strong>
        </div>

        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Cancelados</span>
          <strong className={styles.metricValue}>
            {transferMetrics.cancelled}
          </strong>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
