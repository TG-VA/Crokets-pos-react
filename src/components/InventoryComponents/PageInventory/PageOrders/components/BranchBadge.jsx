import styles from "../PageOrders.module.css";
import { toUpperLabel } from "../utils/ordersFormatters";

/**
 * Color unico por rol en todo el modulo: quien envia (origen) en azul y quien
 * recibe (destino) en naranja. El rol tambien va en texto para no depender
 * solo del color (impresion y accesibilidad). El nombre va primero, en
 * mayusculas y mas grande que el rol; los datos de la base no se modifican.
 */
const ROLE_META = {
  origin: { label: "Origen", className: styles.branchBadgeOrigin },
  destination: { label: "Destino", className: styles.branchBadgeDestination },
};

const BranchBadge = ({ role, name, showRole = true }) => {
  const meta = ROLE_META[role] ?? ROLE_META.origin;

  return (
    <span
      className={[styles.routeBadge, meta.className].filter(Boolean).join(" ")}
    >
      <span className={styles.routeBadgeName}>{toUpperLabel(name)}</span>
      {showRole ? (
        <span className={styles.routeBadgeRole}>{meta.label}</span>
      ) : null}
    </span>
  );
};

export default BranchBadge;
