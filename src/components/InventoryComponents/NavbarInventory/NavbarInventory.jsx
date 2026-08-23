import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import styles from "./NavbarInventory.module.css";

import { useBranch } from "../../../contexts/BranchContext";
import { loadTransferOrders } from "../PageInventory/PageTransfers/services/transfersService";
import { getPendingReceiptsCount } from "../PageInventory/PageTransfers/utils/transfersUtils";

import AddIcon from "../../../assets/icons/plus-solid-full.svg";
import SettingsIcon from "../../../assets/icons/gear-solid-full.svg";
import InventoryReportIcon from "../../../assets/icons/table-list-solid-full.svg";
import MovementsIcon from "../../../assets/icons/changeIcon.svg";
import KardexIcon from "../../../assets/icons/boxes-stacked-solid-full.svg";
import TransfersIcon from "../../../assets/icons/file-import-solid-full.svg";

const NavbarInventory = () => {
  const { branch } = useBranch();
  const [pendingReceiptsCount, setPendingReceiptsCount] = useState(0);

  useEffect(() => {
    if (!branch?.id) {
      setPendingReceiptsCount(0);
      return undefined;
    }

    let mounted = true;

    const load = async () => {
      try {
        const orders = await loadTransferOrders();
        if (!mounted) return;
        const count = getPendingReceiptsCount({
          orders,
          currentBranchId: branch.id,
        });
        setPendingReceiptsCount(Number.isFinite(count) ? count : 0);
      } catch (err) {
        console.error("No se pudo cargar el conteo de traspasos pendientes:", err);
        if (mounted) setPendingReceiptsCount(0);
      }
    };

    load();

    let interval = setInterval(load, 30 * 1000);

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, [branch?.id]);

  const options = [
    { id: "agregar", label: "Agregar", icon: AddIcon, path: "/inventory/agregar" },
    { id: "ajustes", label: "Ajustes", icon: SettingsIcon, path: "/inventory/ajustes" },
    { id: "reporte-inventario", label: "Reporte inventario", icon: InventoryReportIcon, path: "/inventory/reporte-inventario" },
    { id: "reporte-movimientos", label: "Reporte movimientos", icon: MovementsIcon, path: "/inventory/reporte-movimientos" },
    { id: "kardex", label: "Kardex", icon: KardexIcon, path: "/inventory/kardex" },
    { id: "traspasos", label: "Traspasos", icon: TransfersIcon, path: "/inventory/traspasos", badgeCount: pendingReceiptsCount },
  ];

  return (
    <div className={styles.navbarInventory}>
      <div className={styles.buttonsContainer}>
        {options.map((option) => (
          <NavLink
            key={option.id}
            to={option.path}
            end={option.end}
            className={({ isActive }) =>
              `${styles.navButton} ${isActive ? styles.active : ""}`
            }
          >
            <img src={option.icon} alt={option.label} className={styles.icon} />
            <span>{option.label}</span>
            {option.id === "traspasos" && Number(option.badgeCount || 0) > 0 ? (
              <span className={styles.badgePendientes} title={`${option.badgeCount} recepción(es) pendiente(s)`}>
                {option.badgeCount}
              </span>
            ) : null}
          </NavLink>
        ))}
      </div>
    </div>
  );
};

export default NavbarInventory;
