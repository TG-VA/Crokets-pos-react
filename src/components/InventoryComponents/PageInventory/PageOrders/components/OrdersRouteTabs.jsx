import React, { useCallback, useRef } from "react";

import styles from "../PageOrders.module.css";
import ImportIcon from "../../../../../assets/icons/file-import-solid-full.svg";
import AddIcon from "../../../../../assets/icons/plus-solid-full.svg";
import HistoryIcon from "../../../../../assets/icons/table-list-solid-full.svg";
import LockIcon from "../../../../../assets/icons/lock-solid-full.svg";

const TABS = [
  {
    id: "receive",
    label: "Recibidos",
    description: "Pedidos pendientes de recibir",
    icon: ImportIcon,
  },
  {
    id: "create",
    label: "Crear pedido",
    description: "Generar nuevo pedido de abastecimiento",
    icon: AddIcon,
    protectedTab: true,
  },
  {
    id: "history",
    label: "Historial",
    description: "Consulta y filtra pedidos",
    icon: HistoryIcon,
  },
];

const OrdersRouteTabs = ({
  activeTab,
  pendingCount = 0,
  createAccessGranted = false,
  onSelectTab,
}) => {
  const tabRefs = useRef([]);

  const handleKeyDown = useCallback(
    (event, currentIndex) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
        return;
      }

      event.preventDefault();

      const direction = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = (currentIndex + direction + TABS.length) % TABS.length;
      const nextTab = TABS[nextIndex];

      tabRefs.current[nextIndex]?.focus();
      onSelectTab?.(nextTab.id, event);
    },
    [onSelectTab]
  );

  return (
    <nav
      className={styles.tabs}
      role="tablist"
      aria-label="Pestañas de órdenes de pedido"
    >
      {TABS.map((tab, index) => {
        const isActive = activeTab === tab.id;
        const showLock = tab.protectedTab && !createAccessGranted;
        const className = [styles.tab, isActive ? styles.tabActive : ""]
          .filter(Boolean)
          .join(" ");

        return (
          <button
            key={tab.id}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            className={className}
            onClick={(event) => onSelectTab?.(tab.id, event)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            <span className={styles.tabTop}>
              <img
                src={tab.icon}
                alt=""
                aria-hidden="true"
                className={styles.tabIcon}
              />
              <span className={styles.tabLabel}>{tab.label}</span>
              {showLock ? (
                <img
                  src={LockIcon}
                  alt="Requiere autorización de administrador"
                  className={styles.tabLock}
                />
              ) : null}
              {tab.id === "receive" && pendingCount > 0 ? (
                <span
                  className={styles.tabBadge}
                  aria-label={`${pendingCount} pedidos pendientes por recibir`}
                >
                  {pendingCount}
                </span>
              ) : null}
            </span>
            <span className={styles.tabDescription}>{tab.description}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default OrdersRouteTabs;
