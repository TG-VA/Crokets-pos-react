import React from "react";
import { NavLink } from "react-router-dom";
import styles from "./NavbarProducts.module.css";

import ProductsIcon from "../../../assets/icons/boxes-stacked-solid-full.svg";
import NewIcon from "../../../assets/icons/plus-solid-full.svg";
import EditIcon from "../../../assets/icons/pencil-solid-full.svg";
import DeleteIcon from "../../../assets/icons/deleteIcon.svg";
import PromotionsIcon from "../../../assets/icons/gifts-solid-full.svg";
import ImportIcon from "../../../assets/icons/file-import-solid-full.svg";
import DepartmentsIcon from "../../../assets/icons/building-solid-full.svg"

const NavbarProducts = () => {
  const options = [
    { id: "productos", label: "Productos", icon: ProductsIcon, path: "/products", end: true },
    { id: "nuevo", label: "Nuevo", icon: NewIcon, path: "/products/nuevo" },
    { id: "modificar", label: "Modificar", icon: EditIcon, path: "/products/modificar" },
    { id: "eliminar", label: "Eliminar", icon: DeleteIcon, path: "/products/eliminar" },
    { id: "departamentos", label: "Departamentos", icon: DepartmentsIcon, path: "/products/departamentos" },
    { id: "promociones", label: "Promociones", icon: PromotionsIcon, path: "/products/promociones" },
    { id: "importar", label: "Importar", icon: ImportIcon, path: "/products/importar" },
  ];

  return (
    <div className={styles.navbarProducts}>
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

export default NavbarProducts;