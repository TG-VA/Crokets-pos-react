import React from "react";
import { NavLink } from "react-router-dom";
import styles from "./NavbarInvoices.module.css";

import PendingIcon from "../../../assets/icons/file-invoice-dollar-solid-full.svg";
import HistoryIcon from "../../../assets/icons/table-list-solid-full.svg";
import ClientsIcon from "../../../assets/icons/user-solid.svg";
import SettingsIcon from "../../../assets/icons/gear-solid-full.svg";

const NavbarInvoices = () => {
  const options = [
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

  return (
    <div className={styles.navbarInvoices}>
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
          </NavLink>
        ))}
      </div>
    </div>
  );
};

export default NavbarInvoices;