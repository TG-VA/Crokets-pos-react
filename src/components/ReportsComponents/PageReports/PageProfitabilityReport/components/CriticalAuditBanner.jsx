/**
 * CriticalAuditBanner.jsx
 * Banner contextual para la auditoría de productos con margen crítico o venta bajo costo.
 */

import React from "react";
import styles from "./ProfitabilityComponents.module.css";
import warningIcon from "../../../../../assets/icons/triangle-exclamation-solid-full.svg";

const CriticalAuditBanner = () => {
  return (
    <div className={styles.criticalBanner}>
      <div className={styles.criticalBannerIcon}>
        <img src={warningIcon} alt="" />
      </div>
      <div className={styles.criticalBannerContent}>
        <h4 className={styles.criticalBannerTitle}>
          Auditoría de Precios y Márgenes
        </h4>
        <p className={styles.criticalBannerText}>
          Los productos listados en esta pestaña requieren atención prioritaria. Verifica si el costo de adquisición subió con tu proveedor, si existe una bonificación de lealtad aplicada o si es necesario reajustar los precios de venta al público para proteger la utilidad del negocio.
        </p>
      </div>
    </div>
  );
};

export default CriticalAuditBanner;
