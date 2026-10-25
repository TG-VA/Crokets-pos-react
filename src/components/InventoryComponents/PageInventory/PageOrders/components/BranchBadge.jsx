import styles from "../PageOrders.module.css";

/**
 * Color unico por rol en todo el modulo: quien envia (origen) en azul y quien
 * recibe (destino) en naranja. El rol tambien va en texto para no depender
 * solo del color (impresion y accesibilidad).
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
      {showRole ? (
        <span className={styles.routeBadgeRole}>{meta.label}</span>
      ) : null}
      {name}
    </span>
  );
};

export default BranchBadge;
