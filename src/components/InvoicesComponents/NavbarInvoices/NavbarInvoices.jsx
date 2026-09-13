import React from "react";
import { NavLink } from "react-router-dom";
import styles from "./NavbarInvoices.module.css";

import { useBranch } from "../../../contexts/BranchContext";
import useProtectedNavigation from "../../../hooks/useProtectedNavigation";
import AdminAuthorizationModal from "../../AdminAuthorizationModal/AdminAuthorizationModal";
import {
  PROTECTED_INVOICE_SECTIONS,
  withProtectedMetadata,
} from "../../../config/adminProtectedSections";

import PendingIcon from "../../../assets/icons/file-invoice-dollar-solid-full.svg";
import HistoryIcon from "../../../assets/icons/table-list-solid-full.svg";
import ClientsIcon from "../../../assets/icons/user-solid.svg";
import SettingsIcon from "../../../assets/icons/gear-solid-full.svg";

const NAVBAR_OPTIONS = [
  {
    id: "pendientes",
    label: "Ventas por facturar",
    icon: PendingIcon,
    path: "/invoices",
    end: true,
  },
  {
    id: "historial",
    label: "Historial",
    icon: HistoryIcon,
    path: "/invoices/historial",
  },
  {
    id: "clientes",
    label: "Clientes fiscales",
    icon: ClientsIcon,
    path: "/invoices/clientes",
  },
  {
    id: "configuracion",
    label: "Configuración CFDI",
    icon: SettingsIcon,
    path: "/invoices/configuracion",
  },
];

const NavbarInvoices = () => {
  const { branch } = useBranch();
  const {
    handleNavigation,
    adminAuthOpen,
    onCloseAdminAuth,
    onAuthorizedAdminAuth,
    pendingNavigation,
  } = useProtectedNavigation();

  const options = withProtectedMetadata(
    NAVBAR_OPTIONS,
    PROTECTED_INVOICE_SECTIONS,
  );

  return (
    <div className={styles.navbarInvoices}>
      <div className={styles.buttonsContainer}>
        {options.map((option) => (
          <NavLink
            key={option.id}
            to={option.path}
            end={option.end}
            onClick={(event) => handleNavigation(option, event)}
            className={({ isActive }) =>
              `${styles.navButton} ${isActive ? styles.active : ""}`
            }
          >
            <img src={option.icon} alt={option.label} className={styles.icon} />
            <span>{option.label}</span>
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
    </div>
  );
};

export default NavbarInvoices;
