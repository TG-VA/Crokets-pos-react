import React from "react";
import styles from "./PageCustomersReport.module.css";

const PageCustomersReport = () => {
  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Reporte de clientes</h1>

        <p className={styles.description}>
          Consulta compras, frecuencia, gasto acumulado y movimientos de
          puntos.
        </p>
      </header>

      <div className={styles.content}>
        <h2>Análisis de clientes</h2>

        <p>
          Aquí se mostrarán clientes frecuentes, clientes con mayor gasto,
          puntos acumulados y recompensas utilizadas.
        </p>
      </div>
    </section>
  );
};

export default PageCustomersReport;