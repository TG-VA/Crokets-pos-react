import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useBranch } from "../../contexts/BranchContext";
import styles from "./Navbar.module.css";

import AppModal from "../AppModal/AppModal";

import Logo from "../../assets/images/LOGOCROKETS.png";
import SalesIcon from "../../assets/icons/basket-shopping-solid-full.svg";
import ProductsIcon from "../../assets/icons/tag-solid-full.svg";
import InventoryIcon from "../../assets/icons/store-solid-full.svg";
import InvoicesIcon from "../../assets/icons/file-invoice-dollar-solid-full.svg";
import CustomersIcon from "../../assets/icons/user-solid.svg";
import CashoutIcon from "../../assets/icons/money-check-dollar-solid-full.svg";
import ReportsIcon from "../../assets/icons/chart-line-solid-full.svg";
import SettingsIcon from "../../assets/icons/gear-solid-full.svg";
import LogoutIcon from "../../assets/icons/door-open-solid-full.svg";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { user, lockScreen } = useAuth();
  const { branch } = useBranch();

  const [appModal, setAppModal] = useState({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
    confirmText: "Entendido",
    cancelText: "Cancelar",
    showCancel: false,
    loading: false,
    onConfirm: null,
    onCancel: null,
  });

  const navItems = [
    {
      id: "btnVentas",
      label: "Ventas",
      icon: SalesIcon,
      path: "/dashboard",
      shortcut: "F1",
      matchPaths: ["/dashboard", "/sales"],
    },
    {
      id: "btnProductos",
      label: "Productos",
      icon: ProductsIcon,
      path: "/products",
      shortcut: "F2",
      matchPaths: ["/products"],
    },
    {
      id: "btnInventario",
      label: "Inventario",
      icon: InventoryIcon,
      path: "/inventory",
      shortcut: "F3",
      matchPaths: ["/inventory"],
    },
    {
      id: "btnFacturas",
      label: "Facturas",
      icon: InvoicesIcon,
      path: "/invoices",
      matchPaths: ["/invoices"],
    },
    {
      id: "btnClientes",
      label: "Clientes",
      icon: CustomersIcon,
      path: "/customers",
      matchPaths: ["/customers"],
    },
    {
      id: "btnCorte",
      label: "Corte",
      icon: CashoutIcon,
      path: "/cashcut",
      matchPaths: ["/cashcut"],
    },
    {
      id: "btnReportes",
      label: "Reportes",
      icon: ReportsIcon,
      path: "/reports",
      matchPaths: ["/reports"],
    },
    {
      id: "btnConfiguracion",
      label: "Configuración",
      icon: SettingsIcon,
      path: "/settings",
      matchPaths: ["/settings"],
    },
  ];

  const closeAppModal = () => {
    setAppModal((prev) => ({
      ...prev,
      isOpen: false,
      loading: false,
      onConfirm: null,
      onCancel: null,
    }));
  };

  const showAppConfirm = ({
    type = "warning",
    title = "Confirmar acción",
    message = "",
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    onConfirm,
  }) => {
    setAppModal({
      isOpen: true,
      type,
      title,
      message,
      confirmText,
      cancelText,
      showCancel: true,
      loading: false,
      onConfirm: async () => {
        closeAppModal();

        if (onConfirm) {
          await onConfirm();
        }
      },
      onCancel: closeAppModal,
    });
  };

  const clearSalesDraftSessionAcknowledgements = () => {
    Object.keys(sessionStorage).forEach((key) => {
      const isSalesDraftAck =
        key.startsWith("sales_draft_") && key.endsWith("_session_ack");

      if (isSalesDraftAck) {
        sessionStorage.removeItem(key);
      }
    });
  };

  const isTypingTarget = (target) => {
    if (!target) return false;

    const tagName = String(target.tagName || "").toLowerCase();

    return (
      tagName === "input" ||
      tagName === "textarea" ||
      tagName === "select" ||
      target.isContentEditable === true
    );
  };

  const handleLockScreen = () => {
    showAppConfirm({
      type: "warning",
      title: "Volver al inicio",
      message:
        "¿Deseas volver a la pantalla de inicio sin cerrar la sesión actual?",
      confirmText: "Sí, volver",
      cancelText: "Cancelar",
      onConfirm: () => {
        clearSalesDraftSessionAcknowledgements();
        lockScreen();
        navigate("/login", { replace: true });
      },
    });
  };

  const isItemActive = (item) => {
    return item.matchPaths.some((path) => {
      if (path === "/dashboard") {
        return location.pathname === "/dashboard";
      }

      return (
        location.pathname === path || location.pathname.startsWith(`${path}/`)
      );
    });
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (isTypingTarget(event.target)) return;

      const item = navItems.find((nav) => nav.shortcut === event.key);

      if (item) {
        event.preventDefault();
        navigate(item.path);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  return (
    <>
      <nav className={styles.croketsNavbar}>
        <div className={styles.navbarBrand}>
          <img src={Logo} alt="CROKETS LOGO" className={styles.navbarLogo} />
        </div>

        <div className={styles.navbarMenu}>
          {navItems.map((item) => {
            const active = isItemActive(item);

            return (
              <button
                key={item.id}
                type="button"
                className={`${styles.navButton} ${styles[item.id]} ${
                  active ? styles.active : ""
                }`}
                onClick={() => navigate(item.path)}
              >
                <img
                  src={item.icon}
                  alt={`${item.label} icono`}
                  className={styles.navIcon}
                />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className={styles.navbarUser}>
          <div className={styles.userInfo}>
            <div className={styles.userName}>
              Usuario:{" "}
              {(
                user?.username ??
                user?.user_metadata?.username ??
                user?.email?.split("@")[0] ??
                "—"
              ).toUpperCase()}
            </div>

            <div className={styles.branchInfo}>
              Sucursal:{" "}
              {branch?.code
                ? `${branch.code} - ${branch.name}`
                : "Cargando sucursal..."}
            </div>
          </div>

          <button
            type="button"
            className={`${styles.navButton} ${styles.logoutButton}`}
            onClick={handleLockScreen}
          >
            <img src={LogoutIcon} alt="Salir" className={styles.navIcon} />
            Salir
          </button>
        </div>
      </nav>

      <AppModal
        isOpen={appModal.isOpen}
        type={appModal.type}
        title={appModal.title}
        message={appModal.message}
        confirmText={appModal.confirmText}
        cancelText={appModal.cancelText}
        showCancel={appModal.showCancel}
        loading={appModal.loading}
        onConfirm={appModal.onConfirm || closeAppModal}
        onCancel={appModal.onCancel || closeAppModal}
        onClose={closeAppModal}
      />
    </>
  );
};

export default Navbar;