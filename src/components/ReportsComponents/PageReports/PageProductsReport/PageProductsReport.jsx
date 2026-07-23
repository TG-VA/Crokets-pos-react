import React from "react";
import styles from "./PageProductsReport.module.css";

const PageProductsReport = () => {
  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Reporte de productos</h1>

        <p className={styles.description}>
          Consulta productos vendidos, ingresos, cantidades y rendimiento por
          departamento.
        </p>
      </header>

      <div className={styles.content}>
        <h2>Información de productos</h2>

        <p>
          Aquí se mostrarán los productos más vendidos, menos vendidos y sin
          movimiento.
        </p>
      </div>
    </section>
  );
};

export default PageProductsReport;