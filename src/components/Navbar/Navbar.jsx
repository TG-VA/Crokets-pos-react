import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Navbar.module.css';

// Importa los recursos de la aplicación (imágenes e íconos).
import Logo from '../../assets/images/LOGOCROKETS.png';
import SalesIcon from '../../assets/icons/basket-shopping-solid-full.svg';
import ProductsIcon from '../../assets/icons/tag-solid-full.svg';
import InventoryIcon from '../../assets/icons/store-solid-full.svg';
import InvoicesIcon from '../../assets/icons/file-invoice-dollar-solid-full.svg';
import CashoutIcon from '../../assets/icons/money-check-dollar-solid-full.svg';
import ReportsIcon from '../../assets/icons/chart-line-solid-full.svg';
import SettingsIcon from '../../assets/icons/gear-solid-full.svg';
import LogoutIcon from '../../assets/icons/door-open-solid-full.svg';

const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Función para manejar el cierre de sesión.
  const handleLogout = () => {
    // Mostrar confirmación antes de cerrar sesión
    const confirmLogout = window.confirm('¿Estás seguro de que deseas cerrar sesión?');
    
    if (confirmLogout) {
      logout(); // Usar el contexto para logout
      navigate('/login');
    }
  };

  // Array de objetos que define los ítems de navegación.
  const navItems = [
    { id: 'ventas', label: 'Ventas', icon: SalesIcon, path: '/dashboard' },
    { id: 'productos', label: 'Productos', icon: ProductsIcon, path: '/products' },
    { id: 'inventario', label: 'Inventario', icon: InventoryIcon, path: '/inventory' },
    { id: 'facturas', label: 'Facturas', icon: InvoicesIcon, path: '/invoices' },
    { id: 'corte', label: 'Corte', icon: CashoutIcon, path: '/cashout' },
    { id: 'reportes', label: 'Reportes', icon: ReportsIcon, path: '/reports' },
    { id: 'configuracion', label: 'Configuración', icon: SettingsIcon, path: '/settings' }
  ];

  return (
    <nav className={styles.croketsNavbar}>
      <div className={styles.navbarBrand}>
        <img src={Logo} alt="CROKETS" className={styles.navbarLogo} />
      </div>
      
      <div className={styles.navbarMenu}>
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`${styles.navButton} ${styles[item.id]}`} // tooltip y estilos de botón
            onClick={() => navigate(item.path)}
          >
            <img src={item.icon} alt={`${item.label} icono`} className={styles.navIcon} />
            {item.label}
          </button>
        ))}
      </div>
      
      <div className={styles.navbarUser}>
        <span>Usuario: {user ? user.name : 'Cargando...'}</span>
        <button className={`${styles.navButton} ${styles.logoutButton}`} onClick={handleLogout}>
          <img src={LogoutIcon} alt="Salir" className={styles.navIcon} />
          Salir
        </button>
      </div>
    </nav>
  );
};

export default Navbar;