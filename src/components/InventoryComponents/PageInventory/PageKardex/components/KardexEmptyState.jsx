import React from "react";

import styles from "./KardexEmptyState.module.css";

const KardexEmptyState = () => {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </div>

      <div className={styles.emptyTitle}>
        Selecciona un producto
      </div>

      <div className={styles.emptySubtitle}>
        Escanea un código de barras o presiona{" "}
        <strong>F10</strong> para buscar un producto y
        consultar su kardex.
      </div>
    </div>
  );
};

export default KardexEmptyState;