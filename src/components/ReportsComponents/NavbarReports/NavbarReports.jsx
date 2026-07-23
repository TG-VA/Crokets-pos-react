import React from "react";
import { NavLink } from "react-router-dom";

import styles from "./NavbarReports.module.css";

import SummaryIcon from "../../../assets/icons/table-list-solid-full.svg";
import SalesIcon from "../../../assets/icons/basket-shopping-solid-full.svg";
import ProductsIcon from "../../../assets/icons/tag-solid-full.svg";
import InventoryIcon from "../../../assets/icons/store-solid-full.svg";
import CashIcon from "../../../assets/icons/money-check-dollar-solid-full.svg";
import CustomersIcon from "../../../assets/icons/user-solid.svg";
import InvoicesIcon from "../../../assets/icons/file-invoice-dollar-solid-full.svg";
import ProfitabilityIcon from "../../../assets/icons/chart-line-solid-full.svg";

const REPORT_OPTIONS = [
  {
    id: "resumen",
    label: "Resumen",
    icon: SummaryIcon,
    path: "/reports",
    end: true,
  },
  {
    id: "ventas",
    label: "Ventas",
    icon: SalesIcon,
    path: "/reports/ventas",
  },
  {
    id: "productos",
    label: "Productos",
    icon: ProductsIcon,
    path: "/reports/productos",
  },
  {
    id: "inventario",
    label: "Inventario",
    icon: InventoryIcon,
    path: "/reports/inventario",
  },
  {
    id: "caja",
    label: "Caja",
    icon: CashIcon,
    path: "/reports/caja",
  },
  {
    id: "clientes",
    label: "Clientes",
    icon: CustomersIcon,
    path: "/reports/clientes",
  },
  {
    id: "facturacion",
    label: "Facturación",
    icon: InvoicesIcon,
    path: "/reports/facturacion",
  },
  {
    id: "rentabilidad",
    label: "Rentabilidad",
    icon: ProfitabilityIcon,
    path: "/reports/rentabilidad",
  },
];

const NavbarReports = () => {
  return (
    <div className={styles.navbarReports}>
      <div className={styles.buttonsContainer}>
        {REPORT_OPTIONS.map((option) => (
          <NavLink
            key={option.id}
            to={option.path}
            end={option.end}
            className={({ isActive }) =>
              `${styles.navButton} ${isActive ? styles.active : ""}`
            }
          >
            <img
              src={option.icon}
              alt=""
              aria-hidden="true"
              className={styles.icon}
            />

            <span>{option.label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
};

export default NavbarReports;