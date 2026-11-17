import { NavLink } from "react-router-dom";
import styles from "./NavbarInventory.module.css";

import { usePendingTransfers } from "../../../contexts/PendingTransfersContext";
import { usePendingOrders } from "../../../contexts/PendingOrdersContext";
import { useBranch } from "../../../contexts/BranchContext";
import useProtectedNavigation from "../../../hooks/useProtectedNavigation";
import AdminAuthorizationModal from "../../AdminAuthorizationModal/AdminAuthorizationModal";
import {
  PROTECTED_INVENTORY_SECTIONS,
  withProtectedMetadata,
} from "../../../config/adminProtectedSections";

import AddIcon from "../../../assets/icons/plus-solid-full.svg";
import SettingsIcon from "../../../assets/icons/gear-solid-full.svg";
import InventoryReportIcon from "../../../assets/icons/table-list-solid-full.svg";
import MovementsIcon from "../../../assets/icons/changeIcon.svg";
import KardexIcon from "../../../assets/icons/boxes-stacked-solid-full.svg";
import TransfersIcon from "../../../assets/icons/file-import-solid-full.svg";
import OrdersIcon from "../../../assets/icons/receipt-solid-full.svg";

const NavbarInventory = ({ onProtectedAccessAuthorized }) => {
  const { pendingReceiptsCount } = usePendingTransfers();
  const { pendingOrdersCount } = usePendingOrders();
  const { branch } = useBranch();
  const {
    handleNavigation,
    adminAuthOpen,
    onCloseAdminAuth,
    onAuthorizedAdminAuth,
    pendingNavigation,
  } = useProtectedNavigation(onProtectedAccessAuthorized);

  const navbarOptions = [
    {
      id: "agregar",
      label: "Agregar",
      icon: AddIcon,
      path: "/inventory/agregar",
    },
    {
      id: "ajustes",
      label: "Ajustes",
      icon: SettingsIcon,
      path: "/inventory/ajustes",
    },
    {
      id: "reporte-inventario",
      label: "Reporte inventario",
      icon: InventoryReportIcon,
      path: "/inventory/reporte-inventario",
    },
    {
      id: "reporte-movimientos",
      label: "Reporte movimientos",
      icon: MovementsIcon,
      path: "/inventory/reporte-movimientos",
    },
    {
      id: "kardex",
      label: "Kardex",
      icon: KardexIcon,
      path: "/inventory/kardex",
    },
    {
      id: "traspasos",
      label: "Traspasos",
      icon: TransfersIcon,
      path: "/inventory/traspasos",
    },
    {
      id: "pedidos",
      label: "Pedidos",
      icon: OrdersIcon,
      path: "/inventory/pedidos",
    },
  ];

  const options = withProtectedMetadata(
    navbarOptions,
    PROTECTED_INVENTORY_SECTIONS
  );

  return (
    <div className={styles.navbarInventory}>
      <div className={styles.buttonsContainer}>
        {options.map((option) => {
          const badgeCount =
            option.id === "traspasos"
              ? Number(pendingReceiptsCount || 0)
              : option.id === "pedidos"
                ? Number(pendingOrdersCount || 0)
                : 0;
          return (
            <NavLink
              key={option.id}
              to={option.path}
              end={option.end}
              onClick={(event) => handleNavigation(option, event)}
              className={({ isActive }) =>
                `${styles.navButton} ${isActive ? styles.active : ""}`
              }
            >
              <img
                src={option.icon}
                alt={option.label}
                className={styles.icon}
              />
              <span>{option.label}</span>
              {(option.id === "traspasos" || option.id === "pedidos") &&
              badgeCount > 0 ? (
                <span
                  className={styles.badgePendientes}
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                  aria-label={
                    option.id === "pedidos"
                      ? `${badgeCount} pedidos pendientes por recibir`
                      : `${badgeCount} recepciones pendientes de inventario`
                  }
                  title={
                    option.id === "pedidos"
                      ? `${badgeCount} pedido(s) pendiente(s) por recibir`
                      : `${badgeCount} recepción(es) pendiente(s)`
                  }
                >
                  {badgeCount}
                </span>
              ) : null}
            </NavLink>
          );
        })}
      </div>

      <AdminAuthorizationModal
        isOpen={adminAuthOpen}
        onClose={onCloseAdminAuth}
        onAuthorized={onAuthorizedAdminAuth}
        action={pendingNavigation?.action}
        title="Acceso restringido"
        message={
          pendingNavigation
            ? `Para entrar a la sección "${pendingNavigation.routeLabel}", se requiere autorización de un administrador.`
            : undefined
        }
        targetId={pendingNavigation?.routePath}
        branchId={branch?.id}
      />
    </div>
  );
};

export default NavbarInventory;
