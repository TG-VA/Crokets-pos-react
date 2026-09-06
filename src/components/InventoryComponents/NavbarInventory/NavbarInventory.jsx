import React from "react";
import { NavLink } from "react-router-dom";
import styles from "./NavbarInventory.module.css";

import { usePendingTransfers } from "../../../contexts/PendingTransfersContext";

import AddIcon from "../../../assets/icons/plus-solid-full.svg";
import SettingsIcon from "../../../assets/icons/gear-solid-full.svg";
import InventoryReportIcon from "../../../assets/icons/table-list-solid-full.svg";
import MovementsIcon from "../../../assets/icons/changeIcon.svg";
import KardexIcon from "../../../assets/icons/boxes-stacked-solid-full.svg";
import TransfersIcon from "../../../assets/icons/file-import-solid-full.svg";

const NavbarInventory = () => {
  const { pendingReceiptsCount } = usePendingTransfers();

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
        {options.map((option) => {
          const badgeCount = Number(option.badgeCount || 0);
          return (
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
              {option.id === "traspasos" && badgeCount > 0 ? (
                <span
                  className={styles.badgePendientes}
                  title={`${badgeCount} recepción(es) pendiente(s)`}
                >
                  {badgeCount}
                </span>
              ) : null}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};

export default NavbarInventory;
