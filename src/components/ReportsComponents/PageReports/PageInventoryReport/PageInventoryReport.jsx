import React from "react";
import styles from "./PageInventoryReport.module.css";

const PageInventoryReport = () => {
  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Reporte de inventario</h1>

        <p className={styles.description}>
          Consulta existencias, valor del inventario, faltantes y productos
          agotados.
        </p>
      </header>

      <div className={styles.content}>
        <h2>Resumen administrativo de inventario</h2>

        <p>
          Esta vista mostrará información consolidada sin sustituir el Kardex ni
          el reporte de movimientos.
        </p>
      </div>
    </section>
  );
};

export default PageInventoryReport;