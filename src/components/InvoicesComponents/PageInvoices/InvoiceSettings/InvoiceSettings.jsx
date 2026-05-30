import React from "react";
import styles from "./InvoiceSettings.module.css";

const InvoiceSettings = () => {
  return (
    <div className={styles.content}>
      <h1>CONFIGURACIÓN CFDI</h1>
      <p>Aquí se configurará el proveedor de timbrado y datos fiscales.</p>
    </div>
  );
};

export default InvoiceSettings;