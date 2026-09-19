import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import { useAuth } from "../../contexts/AuthContext";
import { checkUserIsAdmin } from "../../lib/permissionsService";
import {
  getCashMaxOpeningAmount,
  updateCashMaxOpeningAmount,
} from "./services/cashSettingsService";
import styles from "./Settings.module.css";
import userIcon from "../../assets/icons/user-solid.svg";
import brushIcon from "../../assets/icons/brush-solid-full.svg";
import receiptIcon from "../../assets/icons/receipt-solid-full.svg";
import creditCardIcon from "../../assets/icons/credit-card-solid-full.svg";
import percentIcon from "../../assets/icons/percent-solid-full.svg";
import rulerIcon from "../../assets/icons/ruler-solid-full.svg";
import printIcon from "../../assets/icons/print-solid-full.svg";
import barcodeIcon from "../../assets/icons/barcode-solid-full.svg";
import moneyIcon from "../../assets/icons/money-bill-wave-solid-full.svg";
import displayIcon from "../../assets/icons/display-solid-full.svg";
import databaseIcon from "../../assets/icons/database-solid-full.svg";
import rotateIcon from "../../assets/icons/rotate-solid-full.svg";
import broomIcon from "../../assets/icons/broom-solid-full.svg";
import chartIcon from "../../assets/icons/chart-line-solid-full.svg";

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  const [cashMax, setCashMax] = useState("");
  const [cashLoading, setCashLoading] = useState(false);
  const [cashError, setCashError] = useState("");
  const [cashSaved, setCashSaved] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadAdminState = async (userId) => {
      const admin = userId ? await checkUserIsAdmin(userId) : false;

      if (!mounted) return;

      setIsAdmin(admin);
      setAdminLoading(false);

      if (admin) {
        const res = await getCashMaxOpeningAmount();

        if (!mounted) return;

        if (res.success) {
          setCashMax(res.amount == null ? "" : String(res.amount));
        }
      }
    };

    loadAdminState(user?.id);

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const handleSaveCashMax = async () => {
    setCashError("");
    setCashSaved("");
    setCashLoading(true);

    const res = await updateCashMaxOpeningAmount(cashMax);

    setCashLoading(false);

    if (!res.success) {
      setCashError(res.error || "No se pudo actualizar el tope de apertura.");
      return;
    }

    setCashMax(String(res.amount));
    setCashSaved("Tope de apertura de caja actualizado.");
  };

  const handleOptionClick = (optionName) => {
    if (optionName === "Perfiles") {
      navigate("/profiles");
    } else {
      alert(
        `Función "${optionName}" próximamente disponible.\nEsta página será creada en la siguiente fase del desarrollo.`
      );
    }
  };

  return (
    <div className={styles.container}>
      <Navbar />
      <main className={styles.mainContent}>
        <div className={styles.header}>
          <h1>CONFIGURACIÓN</h1>
          <p>
            Apartado de configuración únicamente accesible para administradores
          </p>
        </div>

        <div className={styles.content}>
          {/* Menú de configuración */}
          <div className={styles.settingsMenu}>
            {/* Sección General */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>General</h2>
              <div className={styles.optionsGrid}>
                <div
                  className={styles.optionCard}
                  onClick={() => handleOptionClick("Perfiles")}
                >
                  <div className={styles.iconContainer}>
                    <img src={userIcon} alt="" className={styles.icon} />
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
                <div
                  className={styles.optionCard}
                  onClick={() => handleOptionClick("Logotipo del programa")}
                >
                  <div className={styles.iconContainer}>
                    <img src={brushIcon} alt="" className={styles.icon} />
                  </div>
                  <div className={styles.optionInfo}>
                    <h3>Logotipo del programa</h3>
                    <p>Personalizar logo y marca</p>
                  </div>
                </div>
                <div
                  className={styles.optionCard}
                  onClick={() => handleOptionClick("Tickets")}
                >
                  <div className={styles.iconContainer}>
                    <img src={receiptIcon} alt="" className={styles.icon} />
                  </div>
                  <div className={styles.optionInfo}>
                    <h3>Tickets</h3>
                    <p>Configurar formato de tickets</p>
                  </div>
                </div>
                <div
                  className={styles.optionCard}
                  onClick={() => handleOptionClick("Formas de pago")}
                >
                  <div className={styles.iconContainer}>
                    <img src={creditCardIcon} alt="" className={styles.icon} />
                  </div>
                  <div className={styles.optionInfo}>
                    <h3>Formas de pago</h3>
                    <p>Configurar métodos de pago</p>
                  </div>
                </div>
                <div
                  className={styles.optionCard}
                  onClick={() => handleOptionClick("Impuestos")}
                >
                  <div className={styles.iconContainer}>
                    <img src={percentIcon} alt="" className={styles.icon} />
                  </div>
                  <div className={styles.optionInfo}>
                    <h3>Impuestos</h3>
                    <p>Configurar tasas de impuestos</p>
                  </div>
                </div>
                <div
                  className={styles.optionCard}
                  onClick={() => handleOptionClick("Unidades de medida")}
                >
                  <div className={styles.iconContainer}>
                    <img src={rulerIcon} alt="" className={styles.icon} />
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
                <div
                  className={styles.optionCard}
                  onClick={() => handleOptionClick("Impresora de tickets")}
                >
                  <div className={styles.iconContainer}>
                    <img src={printIcon} alt="" className={styles.icon} />
                  </div>
                  <div className={styles.optionInfo}>
                    <h3>Impresora de tickets</h3>
                    <p>Configurar impresora térmica</p>
                  </div>
                </div>
                <div
                  className={styles.optionCard}
                  onClick={() => handleOptionClick("Lector de códigos")}
                >
                  <div className={styles.iconContainer}>
                    <img src={barcodeIcon} alt="" className={styles.icon} />
                  </div>
                  <div className={styles.optionInfo}>
                    <h3>Lector de códigos</h3>
                    <p>Configurar escáner de códigos de barras</p>
                  </div>
                </div>
                <div
                  className={styles.optionCard}
                  onClick={() => handleOptionClick("Cajón de dinero")}
                >
                  <div className={styles.iconContainer}>
                    <img src={moneyIcon} alt="" className={styles.icon} />
                  </div>
                  <div className={styles.optionInfo}>
                    <h3>Cajón de dinero</h3>
                    <p>Configurar cajón registrador</p>
                  </div>
                </div>
                <div
                  className={styles.optionCard}
                  onClick={() => handleOptionClick("Terminal TPV")}
                >
                  <div className={styles.iconContainer}>
                    <img src={displayIcon} alt="" className={styles.icon} />
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
                <div
                  className={styles.optionCard}
                  onClick={() => handleOptionClick("Respaldos automáticos")}
                >
                  <div className={styles.iconContainer}>
                    <img src={databaseIcon} alt="" className={styles.icon} />
                  </div>
                  <div className={styles.optionInfo}>
                    <h3>Respaldos automáticos</h3>
                    <p>Configurar copias de seguridad</p>
                  </div>
                </div>
                <div
                  className={styles.optionCard}
                  onClick={() => handleOptionClick("Actualizaciones")}
                >
                  <div className={styles.iconContainer}>
                    <img src={rotateIcon} alt="" className={styles.icon} />
                  </div>
                  <div className={styles.optionInfo}>
                    <h3>Actualizaciones</h3>
                    <p>Gestionar actualizaciones del sistema</p>
                  </div>
                </div>
                <div
                  className={styles.optionCard}
                  onClick={() => handleOptionClick("Limpieza de datos")}
                >
                  <div className={styles.iconContainer}>
                    <img src={broomIcon} alt="" className={styles.icon} />
                  </div>
                  <div className={styles.optionInfo}>
                    <h3>Limpieza de datos</h3>
                    <p>Limpiar archivos temporales</p>
                  </div>
                </div>
                <div
                  className={styles.optionCard}
                  onClick={() => handleOptionClick("Logs del sistema")}
                >
                  <div className={styles.iconContainer}>
                    <img src={chartIcon} alt="" className={styles.icon} />
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

        {isAdmin && !adminLoading && (
          <div className={styles.adminSection}>
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Caja</h2>
              <div className={styles.adminCard}>
                <div className={styles.adminCardHeader}>
                  <h3>Tope de apertura de caja</h3>
                  <p>
                    Monto máximo de efectivo inicial permitido al abrir la caja
                    registradora.
                  </p>
                </div>
                <div className={styles.adminRow}>
                  <label
                    className={styles.adminLabel}
                    htmlFor="cash-max-amount"
                  >
                    Monto máximo
                  </label>
                  <input
                    id="cash-max-amount"
                    type="number"
                    min="0"
                    step="1"
                    className={styles.adminInput}
                    value={cashMax}
                    onChange={(e) => setCashMax(e.target.value)}
                    placeholder="Ej. 1000000"
                  />
                  <button
                    type="button"
                    className={styles.adminButton}
                    onClick={handleSaveCashMax}
                    disabled={cashLoading}
                  >
                    {cashLoading ? "Guardando..." : "Guardar"}
                  </button>
                </div>
                {cashError && <p className={styles.adminError}>{cashError}</p>}
                {cashSaved && (
                  <p className={styles.adminSuccess}>{cashSaved}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Settings;
