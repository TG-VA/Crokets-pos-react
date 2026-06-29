import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import styles from "./Navbar.module.css";
import { useBranch } from "../../contexts/BranchContext";

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

  const handleLockScreen = () => {
    const confirmLock = window.confirm(
      "¿Deseas salir a la pantalla de inicio de sesión sin cerrar la sesión actual?"
    );

    if (confirmLock) {
      lockScreen();
      navigate("/login", { replace: true });
    }
  };

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

  const isItemActive = (item) => {
    return item.matchPaths.some((path) => {
      if (path === "/dashboard") {
        return location.pathname === "/dashboard";
      }

      return location.pathname === path || location.pathname.startsWith(`${path}/`);
    });
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      const item = navItems.find((nav) => nav.shortcut === e.key);

      if (item) {
        e.preventDefault();
        navigate(item.path);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  return (
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
          className={`${styles.navButton} ${styles.logoutButton}`}
          onClick={handleLockScreen}
        >
          <img src={LogoutIcon} alt="Salir" className={styles.navIcon} />
          Salir
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
