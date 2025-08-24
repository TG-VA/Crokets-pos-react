import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar';
import Footer from '../../components/Footer/Footer';
import styles from './Settings.module.css';

const Settings = () => {
  const navigate = useNavigate();

  const handleOptionClick = (optionName) => {
    if (optionName === 'Perfiles') {
      navigate('/profiles');
    } else {
      alert(`Función "${optionName}" próximamente disponible.\nEsta página será creada en la siguiente fase del desarrollo.`);
    }
  };

  return (
    <div className={styles.container}>
      <Navbar />
      <main className={styles.mainContent}>
        <div className={styles.header}>
          <h1>CONFIGURACIÓN</h1>
          <p>Apartado de configuración únicamente accesible para administradores</p>
        </div>
        
        <div className={styles.content}>
          {/* Menú de configuración */}
          <div className={styles.settingsMenu}>
            
            {/* Sección General */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>General</h2>
              <div className={styles.optionsGrid}>
                <div className={styles.optionCard} onClick={() => handleOptionClick('Perfiles')}>
                  <div className={styles.iconContainer}>
                    <span className={styles.icon}>👤</span>
                  </div>
                  <div className={styles.optionInfo}>
                    <h3>Perfiles</h3>
                    <p>Gestión de usuarios y permisos</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sección Personalización */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Personalización</h2>
              <div className={styles.optionsGrid}>
                <div className={styles.optionCard} onClick={() => handleOptionClick('Logotipo del programa')}>
                  <div className={styles.iconContainer}>
                    <span className={styles.icon}>🎨</span>
                  </div>
                  <div className={styles.optionInfo}>
                    <h3>Logotipo del programa</h3>
                    <p>Personalizar logo y marca</p>
                  </div>
                </div>
                <div className={styles.optionCard} onClick={() => handleOptionClick('Tickets')}>
                  <div className={styles.iconContainer}>
                    <span className={styles.icon}>🎫</span>
                  </div>
                  <div className={styles.optionInfo}>
                    <h3>Tickets</h3>
                    <p>Configurar formato de tickets</p>
                  </div>
                </div>
                <div className={styles.optionCard} onClick={() => handleOptionClick('Formas de pago')}>
                  <div className={styles.iconContainer}>
                    <span className={styles.icon}>💳</span>
                  </div>
                  <div className={styles.optionInfo}>
                    <h3>Formas de pago</h3>
                    <p>Configurar métodos de pago</p>
                  </div>
                </div>
                <div className={styles.optionCard} onClick={() => handleOptionClick('Impuestos')}>
                  <div className={styles.iconContainer}>
                    <span className={styles.icon}>📊</span>
                  </div>
                  <div className={styles.optionInfo}>
                    <h3>Impuestos</h3>
                    <p>Configurar tasas de impuestos</p>
                  </div>
                </div>
                <div className={styles.optionCard} onClick={() => handleOptionClick('Unidades de medida')}>
                  <div className={styles.iconContainer}>
                    <span className={styles.icon}>📏</span>
                  </div>
                  <div className={styles.optionInfo}>
                    <h3>Unidades de medida</h3>
                    <p>Configurar unidades de productos</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sección Dispositivos */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Dispositivos</h2>
              <div className={styles.optionsGrid}>
                <div className={styles.optionCard} onClick={() => handleOptionClick('Impresora de tickets')}>
                  <div className={styles.iconContainer}>
                    <span className={styles.icon}>🖨️</span>
                  </div>
                  <div className={styles.optionInfo}>
                    <h3>Impresora de tickets</h3>
                    <p>Configurar impresora térmica</p>
                  </div>
                </div>
                <div className={styles.optionCard} onClick={() => handleOptionClick('Lector de códigos')}>
                  <div className={styles.iconContainer}>
                    <span className={styles.icon}>📷</span>
                  </div>
                  <div className={styles.optionInfo}>
                    <h3>Lector de códigos</h3>
                    <p>Configurar escáner de códigos de barras</p>
                  </div>
                </div>
                <div className={styles.optionCard} onClick={() => handleOptionClick('Cajón de dinero')}>
                  <div className={styles.iconContainer}>
                    <span className={styles.icon}>💰</span>
                  </div>
                  <div className={styles.optionInfo}>
                    <h3>Cajón de dinero</h3>
                    <p>Configurar cajón registrador</p>
                  </div>
                </div>
                <div className={styles.optionCard} onClick={() => handleOptionClick('Terminal TPV')}>
                  <div className={styles.iconContainer}>
                    <span className={styles.icon}>💻</span>
                  </div>
                  <div className={styles.optionInfo}>
                    <h3>Terminal TPV</h3>
                    <p>Configurar terminal de punto de venta</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sección Mantenimiento */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Mantenimiento</h2>
              <div className={styles.optionsGrid}>
                <div className={styles.optionCard} onClick={() => handleOptionClick('Respaldos automáticos')}>
                  <div className={styles.iconContainer}>
                    <span className={styles.icon}>💾</span>
                  </div>
                  <div className={styles.optionInfo}>
                    <h3>Respaldos automáticos</h3>
                    <p>Configurar copias de seguridad</p>
                  </div>
                </div>
                <div className={styles.optionCard} onClick={() => handleOptionClick('Actualizaciones')}>
                  <div className={styles.iconContainer}>
                    <span className={styles.icon}>🔄</span>
                  </div>
                  <div className={styles.optionInfo}>
                    <h3>Actualizaciones</h3>
                    <p>Gestionar actualizaciones del sistema</p>
                  </div>
                </div>
                <div className={styles.optionCard} onClick={() => handleOptionClick('Limpieza de datos')}>
                  <div className={styles.iconContainer}>
                    <span className={styles.icon}>🧹</span>
                  </div>
                  <div className={styles.optionInfo}>
                    <h3>Limpieza de datos</h3>
                    <p>Limpiar archivos temporales</p>
                  </div>
                </div>
                <div className={styles.optionCard} onClick={() => handleOptionClick('Logs del sistema')}>
                  <div className={styles.iconContainer}>
                    <span className={styles.icon}>📈</span>
                  </div>
                  <div className={styles.optionInfo}>
                    <h3>Logs del sistema</h3>
                    <p>Ver registros de actividad</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Settings;