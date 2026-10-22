import { NavLink } from "react-router-dom";
import styles from "./NavbarSettings.module.css";

import { useBranch } from "../../../contexts/BranchContext";
import useProtectedNavigation from "../../../hooks/useProtectedNavigation";
import AdminAuthorizationModal from "../../AdminAuthorizationModal/AdminAuthorizationModal";
import {
  PROTECTED_INVOICE_SECTIONS,
  PROTECTED_SETTINGS_SECTIONS,
  withProtectedMetadata,
} from "../../../config/adminProtectedSections";

import CashIcon from "../../../assets/icons/money-bill-wave-solid-full.svg";
import UsersIcon from "../../../assets/icons/user-solid.svg";
import PrintIcon from "../../../assets/icons/print-solid-full.svg";
import TerminalIcon from "../../../assets/icons/store-solid-full.svg";
import BranchesIcon from "../../../assets/icons/building-solid-full.svg";
import FiscalIcon from "../../../assets/icons/file-invoice-dollar-solid-full.svg";

const SETTINGS_TABS = [
  {
    id: "caja",
    label: "Caja y Operación",
    icon: CashIcon,
    path: "/settings/caja",
    end: true,
  },
  {
    id: "usuarios",
    label: "Usuarios y Permisos",
    icon: UsersIcon,
    path: "/settings/usuarios",
  },
  {
    id: "impresion",
    label: "Impresión y Tickets",
    icon: PrintIcon,
    path: "/settings/impresion",
  },
  {
    id: "terminal",
    label: "Terminal local",
    icon: TerminalIcon,
    path: "/settings/terminal",
  },
  {
    id: "sucursales",
    label: "Sucursales",
    icon: BranchesIcon,
    path: "/settings/sucursales",
  },
  {
    id: "fiscal",
    label: "Acceso rápido fiscal",
    icon: FiscalIcon,
    path: "/invoices/configuracion",
  },
];

const PROTECTED_SETTINGS_LINKS = [
  ...PROTECTED_SETTINGS_SECTIONS,
  ...PROTECTED_INVOICE_SECTIONS,
];

const SETTINGS_OPTIONS = withProtectedMetadata(
  SETTINGS_TABS,
  PROTECTED_SETTINGS_LINKS
);

const joinClasses = (...classes) => classes.filter(Boolean).join(" ");

const NavbarSettings = ({ onProtectedAccessAuthorized }) => {
  const { branch } = useBranch();
  const {
    handleNavigation,
    adminAuthOpen,
    onCloseAdminAuth,
    onAuthorizedAdminAuth,
    pendingNavigation,
  } = useProtectedNavigation(onProtectedAccessAuthorized);

  return (
    <nav
      aria-label="Submenú de configuración"
      className={styles.navbarSettings}
    >
      <div className={styles.buttonsContainer}>
        {SETTINGS_OPTIONS.map((tab) => (
          <NavLink
            key={tab.id}
            to={tab.path}
            end={tab.end}
            onClick={(event) => handleNavigation(tab, event)}
            className={({ isActive }) =>
              joinClasses(styles.navButton, isActive ? styles.active : "")
            }
          >
            <img
              src={tab.icon}
              alt=""
              aria-hidden="true"
              className={styles.icon}
            />
            <span>{tab.label}</span>
          </NavLink>
        ))}
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
    </nav>
  );
};

export default NavbarSettings;
