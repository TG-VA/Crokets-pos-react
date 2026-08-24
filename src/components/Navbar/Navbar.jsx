import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useBranch } from "../../contexts/BranchContext";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
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

import {
  loadTransferOrders,
} from "../InventoryComponents/PageInventory/PageTransfers/services/transfersService";
import {
  getPendingReceiptsCount,
} from "../InventoryComponents/PageInventory/PageTransfers/utils/transfersUtils";

import styles from "./Navbar.module.css";

const SALES_DRAFT_RESTORE_REQUEST_KEY = "sales_draft_restore_prompt_requested";

const NAV_ITEMS = [
  { id: "btnVentas", label: "Ventas", icon: SalesIcon, path: "/dashboard", shortcut: "F1", matchPaths: ["/dashboard", "/sales"] },
  { id: "btnProductos", label: "Productos", icon: ProductsIcon, path: "/products", shortcut: "F2", matchPaths: ["/products"] },
  { id: "btnInventario", label: "Inventario", icon: InventoryIcon, path: "/inventory", shortcut: "F3", matchPaths: ["/inventory"] },
  { id: "btnFacturas", label: "Facturas", icon: InvoicesIcon, path: "/invoices", matchPaths: ["/invoices"] },
  { id: "btnClientes", label: "Clientes", icon: CustomersIcon, path: "/customers", matchPaths: ["/customers"] },
  { id: "btnCorte", label: "Corte", icon: CashoutIcon, path: "/cashcut", matchPaths: ["/cashcut"] },
  { id: "btnReportes", label: "Reportes", icon: ReportsIcon, path: "/reports", matchPaths: ["/reports"] },
  { id: "btnConfiguracion", label: "Configuración", icon: SettingsIcon, path: "/settings", matchPaths: ["/settings"] },
];

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, lockScreen } = useAuth();
  const { branch } = useBranch();

  // Inyectamos la lógica separada para atajos (F1, F2, etc.)
  useKeyboardShortcuts(NAV_ITEMS);

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

  const [pendingInventoryTransfers, setPendingInventoryTransfers] = useState(0);

  useEffect(() => {
    let interval = null;
    let mounted = true;

    const refreshPending = async () => {
      if (!branch?.id) {
        if (mounted) setPendingInventoryTransfers(0);
        return;
      }
      try {
        const orders = await loadTransferOrders();
        if (!mounted) return;
        const count = getPendingReceiptsCount({
          orders,
          currentBranchId: branch.id,
        });
        setPendingInventoryTransfers(Number.isFinite(count) ? count : 0);
      } catch (err) {
        console.error("No se pudo cargar el conteo de traspasos pendientes en navbar:", err);
        if (mounted) setPendingInventoryTransfers(0);
      }
    };

    refreshPending();
    interval = setInterval(refreshPending, 10 * 1000);

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, [branch?.id]);

  const closeAppModal = () => {
    setAppModal((prev) => ({ ...prev, isOpen: false, loading: false, onConfirm: null, onCancel: null }));
  };

  // CORRECCIÓN: Forzamos los defaults para no tener "modales fantasma"
  const showAppConfirm = (config) => {
    setAppModal({
      isOpen: true,
      type: config.type || "warning",
      title: config.title || "Confirmar",
      message: config.message || "",
      confirmText: config.confirmText || "Aceptar",
      cancelText: config.cancelText || "Cancelar",
      // FIX NITPICK: Por defecto ya no mostramos el botón cancelar, a menos que config diga lo contrario
      showCancel: config.showCancel !== undefined ? config.showCancel : false,
      loading: false,
      onConfirm: async () => {
        closeAppModal();
        if (typeof config.onConfirm === "function") await config.onConfirm();
      },
      onCancel: closeAppModal,
    });
  };

  const handleLockScreen = () => {
    showAppConfirm({
      type: "warning",
      title: "Volver al inicio",
      message: "¿Deseas volver a la pantalla de inicio sin cerrar la sesión actual?",
      confirmText: "Sí, volver",
      showCancel: true, // <--- AHORA LO PEDIMOS EXPLÍCITAMENTE PARA ESTE CASO
      onConfirm: () => {
        sessionStorage.setItem(SALES_DRAFT_RESTORE_REQUEST_KEY, "true");
        lockScreen();
        navigate("/login", { replace: true });
      },
    });
  };

  const isItemActive = (item) => {
    return item.matchPaths.some((path) => {
      if (path === "/dashboard") return location.pathname === "/dashboard";
      return location.pathname === path || location.pathname.startsWith(`${path}/`);
    });
  };

  const username = (
    user?.username ?? 
    user?.user_metadata?.username ?? 
    user?.email?.split("@")[0] ?? 
    "—"
  ).toUpperCase();

  return (
    <>
      <nav className={styles.croketsNavbar}>
        <div className={styles.navbarBrand}>
          <img src={Logo} alt="CROKETS LOGO" className={styles.navbarLogo} />
        </div>

        <div className={styles.navbarMenu}>
          {NAV_ITEMS.map((item) => {
            const badgeCount = item.id === "btnInventario"
              ? pendingInventoryTransfers
              : 0;

            return (
              <button
                key={item.id}
                type="button"
                className={`${styles.navButton} ${styles[item.id]} ${isItemActive(item) ? styles.active : ""}`}
                onClick={() => navigate(item.path)}
              >
                <img src={item.icon} alt={`${item.label} icono`} className={styles.navIcon} />
                {item.label}
                {badgeCount > 0 ? (
                  <span
                    className={styles.navBadgePendientes}
                    title={`${badgeCount} recepción(es) pendiente(s) de inventario`}
                  >
                    {badgeCount}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className={styles.navbarUser}>
          <div className={styles.userInfo}>
            <div className={styles.userName}>Usuario: {username}</div>
            <div className={styles.branchInfo}>
              Sucursal: {branch?.code ? `${branch.code} - ${branch.name}` : "Cargando sucursal..."}
            </div>
          </div>

          <button type="button" className={`${styles.navButton} ${styles.logoutButton}`} onClick={handleLockScreen}>
            <img src={LogoutIcon} alt="Salir" className={styles.navIcon} /> Salir
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