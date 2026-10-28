import badgeStyles from "../BranchBadge.module.css";
import { toUpperLabel } from "../utils/ordersFormatters";

/**
 * Color unico por rol en todo el modulo: quien envia (origen) en azul y quien
 * recibe (destino) en naranja. El rol tambien va en texto para no depender
 * solo del color (accesibilidad). El nombre va primero, en
 * mayusculas y mas grande que el rol; los datos de la base no se modifican.
 */
const ROLE_META = {
  origin: { label: "Origen", className: badgeStyles.branchBadgeOrigin },
  destination: {
    label: "Destino",
    className: badgeStyles.branchBadgeDestination,
  },
};

const BranchBadge = ({ role, name, showRole = true }) => {
  const meta = ROLE_META[role] ?? ROLE_META.origin;

  return (
    <span
      className={[badgeStyles.routeBadge, meta.className]
        .filter(Boolean)
        .join(" ")}
    >
      <span className={badgeStyles.routeBadgeName}>{toUpperLabel(name)}</span>
      {showRole ? (
        <span className={badgeStyles.routeBadgeRole}>{meta.label}</span>
      ) : null}
    </span>
  );
};

export default BranchBadge;
