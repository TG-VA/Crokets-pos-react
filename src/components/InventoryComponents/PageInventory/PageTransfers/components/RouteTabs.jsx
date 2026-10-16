import styles from "../PageTransfers.module.css";

const TRANSFER_TABS = [
  {
    id: "send",
    label: "Enviar",
    hint: "Descuenta existencias de la sucursal origen.",
  },
  {
    id: "receive",
    label: "Recibir",
    hint: "Captura la llegada, diferencias y devoluciones.",
  },
  {
    id: "history",
    label: "Historial",
    hint: "Consulta los traspasos emitidos y recibidos.",
  },
];

const RouteTabs = ({ activeTab, pendingReceiptsCount, onTabChange }) => {
  const activeTabMeta = TRANSFER_TABS.find((tab) => tab.id === activeTab);

  return (
    <nav className={styles.tabBar} aria-label="Subnavegación de traspasos">
      <div className={styles.segmentedControl}>
        {TRANSFER_TABS.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              className={`${styles.tabButton}${
                isActive ? ` ${styles.tabButtonActive}` : ""
              }`}
              aria-current={isActive ? "true" : undefined}
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
            </button>
          );
        })}
      </div>

      {activeTabMeta ? (
        <p className={styles.tabHint}>{activeTabMeta.hint}</p>
      ) : null}
    </nav>
  );
};

export default RouteTabs;
