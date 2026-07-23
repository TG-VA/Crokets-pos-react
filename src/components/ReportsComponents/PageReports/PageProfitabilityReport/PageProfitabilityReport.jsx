import React from "react";
import styles from "./PageProfitabilityReport.module.css";

const PageProfitabilityReport = () => {
  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Reporte de rentabilidad</h1>

        <p className={styles.description}>
          Consulta ingresos, costos, utilidad y margen de ganancia.
        </p>
      </header>

      <div className={styles.content}>
        <h2>Análisis de rentabilidad</h2>

        <p>
          Aquí se mostrará la utilidad por producto, departamento, sucursal y
          periodo seleccionado.
        </p>
      </div>
    </section>
  );
};

export default PageProfitabilityReport;