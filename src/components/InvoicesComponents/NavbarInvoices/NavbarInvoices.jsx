import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import styles from "./NavbarInvoices.module.css";

import { useAuth } from "../../../contexts/AuthContext";
import { useBranch } from "../../../contexts/BranchContext";
import { checkUserIsAdmin } from "../../../lib/permissionsService";
import AdminAuthorizationModal from "../../AdminAuthorizationModal/AdminAuthorizationModal";

import PendingIcon from "../../../assets/icons/file-invoice-dollar-solid-full.svg";
import HistoryIcon from "../../../assets/icons/table-list-solid-full.svg";
import ClientsIcon from "../../../assets/icons/user-solid.svg";
import SettingsIcon from "../../../assets/icons/gear-solid-full.svg";

const NavbarInvoices = ({ onProtectedAccessAuthorized }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { branch } = useBranch();

  const [adminAuthOpen, setAdminAuthOpen] = useState(false);
  const [pendingOption, setPendingOption] = useState(null);

  const options = [
    {
      id: "pendientes",
      label: "Ventas por facturar",
      icon: PendingIcon,
      path: "/invoices",
      end: true,
      requiresAdmin: false,
    },
    {
      id: "historial",
      label: "Historial",
      icon: HistoryIcon,
      path: "/invoices/historial",
      requiresAdmin: false,
    },
    {
      id: "clientes",
      label: "Clientes fiscales",
      icon: ClientsIcon,
      path: "/invoices/clientes",
      requiresAdmin: false,
    },
    {
      id: "configuracion",
      label: "Configuración CFDI",
      icon: SettingsIcon,
      path: "/invoices/configuracion",
      requiresAdmin: true,
    },
  ];

  const handleProtectedNavigation = async (event, option) => {
    if (!option.requiresAdmin) {
      return;
    }

    event.preventDefault();

    const isAdmin = await checkUserIsAdmin(user?.id);

    if (isAdmin) {
      onProtectedAccessAuthorized?.(option.path);
      navigate(option.path);
      return;
    }

    setPendingOption(option);
    setAdminAuthOpen(true);
  };

  const handleAdminAuthorized = () => {
    if (!pendingOption?.path) {
      setAdminAuthOpen(false);
      setPendingOption(null);
      return;
    }

    const destination = pendingOption.path;

    onProtectedAccessAuthorized?.(destination);

    setAdminAuthOpen(false);
    setPendingOption(null);
    navigate(destination);
  };

  const handleCloseAdminAuth = () => {
    setAdminAuthOpen(false);
    setPendingOption(null);
  };

  return (
    <>
      <div className={styles.navbarInvoices}>
        <div className={styles.buttonsContainer}>
          {options.map((option) => (
            <NavLink
              key={option.id}
              to={option.path}
              end={option.end}
              onClick={(event) => handleProtectedNavigation(event, option)}
              className={({ isActive }) =>
                `${styles.navButton} ${isActive ? styles.active : ""}`
              }
            >
              <img src={option.icon} alt={option.label} className={styles.icon} />
              <span>{option.label}</span>
            </NavLink>
          ))}
        </div>
      </div>

      <AdminAuthorizationModal
        isOpen={adminAuthOpen}
        onClose={handleCloseAdminAuth}
        onAuthorized={handleAdminAuthorized}
        action={pendingOption?.id || "invoices_protected_access"}
        title="Acceso restringido"
        message={
          pendingOption
            ? `Para entrar a la sección "${pendingOption.label}", se requiere autorización de un administrador.`
            : "Esta sección requiere autorización de un administrador."
        }
        targetId={pendingOption?.path || null}
        branchId={branch?.id || null}
      />
    </>
  );
};

export default NavbarInvoices;