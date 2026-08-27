import React from "react";
import styles from "../PageTransfers.module.css";

const TRANSFER_TABS = [
  {
    id: "send",
    label: "Enviar",
    description:
      "Preparar y descontar existencias de la sucursal origen.",
  },
  {
    id: "receive",
    label: "Recibir",
    description:
      "Registrar llegada, diferencias y devoluciones automáticas.",
  },
  {
    id: "history",
    label: "Historial",
    description:
      "Consultar todos los traspasos emitidos y recibidos.",
  },
];

const RouteTabs = ({
  activeTab,
  pendingReceiptsCount,
  onTabChange,
}) => {
  return (
    <nav
      className={styles.tabBar}
      aria-label="Subnavegación de traspasos"
    >
      {TRANSFER_TABS.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            className={`${styles.tabButton} ${
              isActive ? styles.tabButtonActive : ""
            }`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className={styles.tabLabelRow}>
              <span>{tab.label}</span>
              {tab.id === "receive" && pendingReceiptsCount > 0 ? (
                <span className={styles.tabBadge}>
                  {pendingReceiptsCount}
                </span>
              ) : null}
            </span>
            <span className={styles.tabDescription}>
              {tab.description}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default RouteTabs;
