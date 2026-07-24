import React from "react";
import styles from "./PageSalesReport.module.css";

const PageSalesReport = () => {
  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Reporte de ventas</h1>

          <p className={styles.description}>
            Consulta ventas, tickets, descuentos, devoluciones y métodos de
            pago.
          </p>
        </div>
      </header>

      <div className={styles.filters}>
        <div className={styles.field}>
          <label htmlFor="sales-start-date">Fecha inicial</label>
          <input id="sales-start-date" type="date" />
        </div>

        <div className={styles.field}>
          <label htmlFor="sales-end-date">Fecha final</label>
          <input id="sales-end-date" type="date" />
        </div>

        <button type="button" className={styles.searchButton}>
          Consultar
        </button>
      </div>

      <div className={styles.emptyState}>
        <h2>Reporte pendiente de consulta</h2>
        <p>
          Selecciona un rango de fechas para consultar la información de
          ventas.
        </p>
      </div>
    </section>
  );
};

export default PageSalesReport;