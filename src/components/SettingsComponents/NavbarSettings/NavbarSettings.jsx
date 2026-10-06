import { NavLink } from "react-router-dom";
import styles from "./NavbarSettings.module.css";

import CashIcon from "../../../assets/icons/money-bill-wave-solid-full.svg";
import UsersIcon from "../../../assets/icons/user-solid.svg";
import PrintIcon from "../../../assets/icons/print-solid-full.svg";
import TerminalIcon from "../../../assets/icons/store-solid-full.svg";
import FiscalIcon from "../../../assets/icons/file-invoice-dollar-solid-full.svg";

const SETTINGS_TABS = [
  {
    id: "caja",
    label: "Caja y Operación",
    icon: CashIcon,
    path: "/settings/caja",
    end: true,
  },
  {
    id: "usuarios",
    label: "Usuarios y Permisos",
    icon: UsersIcon,
    path: "/settings/usuarios",
  },
  {
    id: "impresion",
    label: "Impresión y Tickets",
    icon: PrintIcon,
    path: "/settings/impresion",
  },
  {
    id: "terminal",
    label: "Terminal y Sucursal",
    icon: TerminalIcon,
    path: "/settings/terminal",
  },
  {
    id: "fiscal",
    label: "Acceso rápido fiscal",
    icon: FiscalIcon,
    path: "/invoices/configuracion",
  },
];

const joinClasses = (...classes) => classes.filter(Boolean).join(" ");

const NavbarSettings = () => {
  return (
    <nav
      aria-label="Submenú de configuración"
      className={styles.navbarSettings}
    >
      <div className={styles.buttonsContainer}>
        {SETTINGS_TABS.map((tab) => (
          <NavLink
            key={tab.id}
            to={tab.path}
            end={tab.end}
            className={({ isActive }) =>
              joinClasses(styles.navButton, isActive ? styles.active : "")
            }
          >
            <img
              src={tab.icon}
              alt=""
              aria-hidden="true"
              className={styles.icon}
            />
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default NavbarSettings;
