import styles from "../PageTransfers.module.css";
import ExportIcon from "../../../../../assets/icons/file-export-solid-full.svg";
import ImportIcon from "../../../../../assets/icons/file-import-solid-full.svg";
import HistoryIcon from "../../../../../assets/icons/table-list-solid-full.svg";

const TRANSFER_TABS = [
  {
    id: "send",
    label: "Enviar",
    description: "Descuenta existencias de la sucursal origen.",
    icon: ExportIcon,
  },
  {
    id: "receive",
    label: "Recibir",
    description: "Captura la llegada, diferencias y devoluciones.",
    icon: ImportIcon,
  },
  {
    id: "history",
    label: "Historial",
    description: "Consulta los traspasos emitidos y recibidos.",
    icon: HistoryIcon,
  },
];

const RouteTabs = ({ activeTab, pendingReceiptsCount, onTabChange }) => {
  return (
    <nav className={styles.tabBar} aria-label="Subnavegación de traspasos">
      {TRANSFER_TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const className = [
          styles.tabButton,
          isActive ? styles.tabButtonActive : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <button
            key={tab.id}
            type="button"
            className={className}
            aria-current={isActive ? "true" : undefined}
            onClick={() => onTabChange(tab.id)}
          >
            <span className={styles.tabTop}>
              <img
                src={tab.icon}
                alt=""
                aria-hidden="true"
                className={styles.tabIcon}
              />
              <span className={styles.tabLabel}>{tab.label}</span>
              {tab.id === "receive" && pendingReceiptsCount > 0 ? (
                <span className={styles.tabBadge}>{pendingReceiptsCount}</span>
              ) : null}
            </span>
            <span className={styles.tabDescription}>{tab.description}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default RouteTabs;
