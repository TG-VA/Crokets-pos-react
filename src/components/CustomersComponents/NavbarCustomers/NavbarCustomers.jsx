import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import styles from "./NavbarCustomers.module.css";
import { supabase } from "../../../lib/supabaseClient";

import AdminAuthorizationModal from "../../AdminAuthorizationModal/AdminAuthorizationModal";

import ClientsIcon from "../../../assets/icons/user-solid.svg";
import RewardsIcon from "../../../assets/icons/gifts-solid-full.svg";
import SettingsIcon from "../../../assets/icons/gear-solid-full.svg";
import HistoryIcon from "../../../assets/icons/table-list-solid-full.svg";
import PointsAdjustmentIcon from "../../../assets/icons/pen-solid-full.svg";

const ADMIN_AUTH_STORAGE_KEYS = {
  "ajuste-puntos": "customers_points_adjustment_admin_authorized",
  configuracion: "customers_rewards_settings_admin_authorized",
};

const clearCustomerAdminAuthorizations = (exceptOptionId = null) => {
  Object.entries(ADMIN_AUTH_STORAGE_KEYS).forEach(([optionId, storageKey]) => {
    if (optionId !== exceptOptionId) {
      sessionStorage.removeItem(storageKey);
    }
  });
};

const NavbarCustomers = () => {
  const navigate = useNavigate();

  const [checkingOption, setCheckingOption] = useState(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [pendingOption, setPendingOption] = useState(null);

  const options = [
    {
      id: "clientes",
      label: "Clientes",
      icon: ClientsIcon,
      path: "/customers",
      end: true,
      requiresAdmin: false,
    },
    {
      id: "recompensas-disponibles",
      label: "Consulta de recompensas",
      icon: RewardsIcon,
      path: "/customers/recompensas-disponibles",
      requiresAdmin: false,
    },
    {
      id: "historial",
      label: "Historial de puntos",
      icon: HistoryIcon,
      path: "/customers/historial",
      requiresAdmin: false,
    },
    {
      id: "ajuste-puntos",
      label: "Ajuste de puntos",
      icon: PointsAdjustmentIcon,
      path: "/customers/ajuste-puntos",
      requiresAdmin: true,
    },
    {
      id: "configuracion",
      label: "Configurar recompensas",
      icon: SettingsIcon,
      path: "/customers/recompensas",
      requiresAdmin: true,
    },
  ];

  const getRoleName = (profile) => {
    if (Array.isArray(profile?.roles)) {
      return profile.roles[0]?.name || "";
    }

    return profile?.roles?.name || "";
  };

  const checkCurrentUserIsAdmin = async () => {
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser?.id) {
      return false;
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select(`
        id,
        status,
        roles (
          name
        )
      `)
      .eq("id", authUser.id)
      .maybeSingle();

    if (profileError || !profile) {
      return false;
    }

    const roleName = String(getRoleName(profile) || "").toLowerCase();

    return profile.status !== false && roleName === "admin";
  };

  const authorizeOptionTemporarily = (option) => {
    const storageKey = ADMIN_AUTH_STORAGE_KEYS[option.id];

    clearCustomerAdminAuthorizations(option.id);

    if (storageKey) {
      sessionStorage.setItem(storageKey, "true");
    }
  };

  const handleProtectedNavigation = async (event, option) => {
    if (!option.requiresAdmin) {
      clearCustomerAdminAuthorizations();
      return;
    }

    event.preventDefault();

    if (checkingOption) return;

    try {
      setCheckingOption(option.id);

      const isAdmin = await checkCurrentUserIsAdmin();

      if (isAdmin) {
        authorizeOptionTemporarily(option);
        navigate(option.path);
        return;
      }

      setPendingOption(option);
      setIsAdminModalOpen(true);
    } catch (err) {
      console.error("Error validando acceso administrativo:", err);
      setPendingOption(option);
      setIsAdminModalOpen(true);
    } finally {
      setCheckingOption(null);
    }
  };

  const handleCloseAdminModal = () => {
    setIsAdminModalOpen(false);
    setPendingOption(null);
  };

  const handleAdminAuthorized = () => {
    if (!pendingOption?.path) return;

    authorizeOptionTemporarily(pendingOption);

    const destination = pendingOption.path;

    setIsAdminModalOpen(false);
    setPendingOption(null);

    navigate(destination);
  };

  return (
    <>
      <div className={styles.navbarCustomers}>
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
              <img
                src={option.icon}
                alt={option.label}
                className={styles.icon}
              />

              <span>
                {checkingOption === option.id ? "Validando..." : option.label}
              </span>
            </NavLink>
          ))}
        </div>
      </div>

      <AdminAuthorizationModal
        isOpen={isAdminModalOpen}
        onClose={handleCloseAdminModal}
        onAuthorized={handleAdminAuthorized}
        action="customers_protected_access"
        title="Autorización de administrador"
        message={`Para entrar a "${
          pendingOption?.label || "esta sección"
        }", solicita autorización de un administrador.`}
      />
    </>
  );
};

export default NavbarCustomers;