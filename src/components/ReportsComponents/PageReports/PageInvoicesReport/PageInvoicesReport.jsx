import React from "react";
import styles from "./PageInvoicesReport.module.css";

const PageInvoicesReport = () => {
  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Reporte de facturación</h1>

        <p className={styles.description}>
          Consulta facturas emitidas, pendientes, canceladas y ventas sin
          facturar.
        </p>
      </header>

      <div className={styles.content}>
        <h2>Información fiscal</h2>

        <p>
          Esta página se conectará con las facturas almacenadas y con la futura
          integración del proveedor de timbrado.
        </p>
      </div>
    </section>
  );
};

export default PageInvoicesReport;