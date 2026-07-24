import React from "react";
import styles from "./PageCashReport.module.css";

const PageCashReport = () => {
  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Reporte de caja</h1>

        <p className={styles.description}>
          Consulta aperturas, cierres, movimientos y diferencias de caja.
        </p>
      </header>

      <div className={styles.content}>
        <h2>Historial de caja</h2>

        <p>
          Aquí se mostrarán los cortes por cajero, cortes finales, ingresos,
          retiros y diferencias encontradas.
        </p>
      </div>
    </section>
  );
};

export default PageCashReport;