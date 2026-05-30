import React from "react";
import styles from "./InvoicesHistory.module.css";

const InvoicesHistory = () => {
  return (
    <div className={styles.content}>
      <h1>HISTORIAL DE FACTURAS</h1>
      <p>Aquí aparecerán las facturas generadas, XML, PDF y cancelaciones.</p>
    </div>
  );
};

export default InvoicesHistory;