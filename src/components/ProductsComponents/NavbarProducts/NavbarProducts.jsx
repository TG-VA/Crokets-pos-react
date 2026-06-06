import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import styles from "./NavbarProducts.module.css";

import { useAuth } from "../../../contexts/AuthContext";
import { useBranch } from "../../../contexts/BranchContext";
import { checkUserIsAdmin } from "../../../lib/permissionsService";
import AdminAuthorizationModal from "../../AdminAuthorizationModal/AdminAuthorizationModal";

import ProductsIcon from "../../../assets/icons/boxes-stacked-solid-full.svg";
import NewIcon from "../../../assets/icons/plus-solid-full.svg";
import EditIcon from "../../../assets/icons/pencil-solid-full.svg";
import DeleteIcon from "../../../assets/icons/deleteIcon.svg";
import PromotionsIcon from "../../../assets/icons/gifts-solid-full.svg";
import ImportIcon from "../../../assets/icons/file-import-solid-full.svg";
import DepartmentsIcon from "../../../assets/icons/building-solid-full.svg";

const NavbarProducts = ({ onProtectedAccessAuthorized }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { branch } = useBranch();

  const [adminAuthOpen, setAdminAuthOpen] = useState(false);
  const [pendingOption, setPendingOption] = useState(null);

  const options = [
    {
      id: "productos",
      label: "Productos",
      icon: ProductsIcon,
      path: "/products",
      end: true,
      requiresAdmin: false,
    },
    {
      id: "nuevo",
      label: "Nuevo",
      icon: NewIcon,
      path: "/products/nuevo",
      requiresAdmin: true,
    },
    {
      id: "modificar",
      label: "Modificar",
      icon: EditIcon,
      path: "/products/modificar",
      requiresAdmin: false,
    },
    {
      id: "eliminar",
      label: "Eliminar",
      icon: DeleteIcon,
      path: "/products/eliminar",
      requiresAdmin: true,
    },
    {
      id: "departamentos",
      label: "Departamentos",
      icon: DepartmentsIcon,
      path: "/products/departamentos",
      requiresAdmin: true,
    },
    {
      id: "promociones",
      label: "Promociones",
      icon: PromotionsIcon,
      path: "/products/promociones",
      requiresAdmin: true,
    },
    {
      id: "importar",
      label: "Importar",
      icon: ImportIcon,
      path: "/products/importar",
      requiresAdmin: true,
    },
  ];

  const handleProtectedNavigation = async (event, option) => {
    if (!option.requiresAdmin) {
      return;
    }

    event.preventDefault();

    const isAdmin = await checkUserIsAdmin(user?.id);

    if (isAdmin) {
      onProtectedAccessAuthorized?.(option.path);
      navigate(option.path);
      return;
    }

    setPendingOption(option);
    setAdminAuthOpen(true);
  };

  const handleAdminAuthorized = () => {
    if (!pendingOption?.path) {
      setAdminAuthOpen(false);
      setPendingOption(null);
      return;
    }

    const destination = pendingOption.path;

    onProtectedAccessAuthorized?.(destination);

    setAdminAuthOpen(false);
    setPendingOption(null);
    navigate(destination);
  };

  const handleCloseAdminAuth = () => {
    setAdminAuthOpen(false);
    setPendingOption(null);
  };

  return (
    <>
      <div className={styles.navbarProducts}>
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
              <img src={option.icon} alt={option.label} className={styles.icon} />
              <span>{option.label}</span>
            </NavLink>
          ))}
        </div>
      </div>

      <AdminAuthorizationModal
        isOpen={adminAuthOpen}
        onClose={handleCloseAdminAuth}
        onAuthorized={handleAdminAuthorized}
        action={pendingOption?.id || "products_protected_access"}
        title="Acceso restringido"
        message={
          pendingOption
            ? `Para entrar a la sección "${pendingOption.label}", se requiere autorización de un administrador.`
            : "Esta sección requiere autorización de un administrador."
        }
        targetId={pendingOption?.path || null}
        branchId={branch?.id || null}
      />
    </>
  );
};

export default NavbarProducts;