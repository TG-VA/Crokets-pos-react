import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../Navbar/Navbar";
import Footer from "../../Footer/Footer";
import styles from "./Settings.module.css";

const SETTINGS_SECTIONS = [
  {
    id: "general",
    title: "General",
    description: "Usuarios, accesos y estructura base del sistema.",
    options: [
      {
        key: "Perfiles",
        code: "PF",
        title: "Perfiles",
        description: "Gestion de usuarios, roles y accesos del sistema.",
        status: "available",
      },
    ],
  },
  {
    id: "personalizacion",
    title: "Personalizacion",
    description: "Elementos visuales y reglas operativas del punto de venta.",
    options: [
      {
        key: "Logotipo del programa",
        code: "LG",
        title: "Logotipo del programa",
        description: "Personalizar logo, nombre comercial y elementos de marca.",
        status: "coming_soon",
      },
      {
        key: "Tickets",
        code: "TK",
        title: "Tickets",
        description: "Definir folios, mensajes y formato impreso del comprobante.",
        status: "coming_soon",
      },
      {
        key: "Formas de pago",
        code: "FP",
        title: "Formas de pago",
        description: "Configurar metodos permitidos y reglas de cobro.",
        status: "coming_soon",
      },
      {
        key: "Impuestos",
        code: "IM",
        title: "Impuestos",
        description: "Administrar tasas, etiquetas y reglas fiscales.",
        status: "coming_soon",
      },
      {
        key: "Unidades de medida",
        code: "UM",
        title: "Unidades de medida",
        description: "Catalogo de unidades para productos y reportes.",
        status: "coming_soon",
      },
    ],
  },
  {
    id: "dispositivos",
    title: "Dispositivos",
    description: "Perifericos y componentes conectados al POS.",
    options: [
      {
        key: "Impresora de tickets",
        code: "IT",
        title: "Impresora de tickets",
        description: "Administrar integracion, formato y pruebas de impresion.",
        status: "coming_soon",
      },
      {
        key: "Lector de codigos",
        code: "LC",
        title: "Lector de codigos",
        description: "Ajustar compatibilidad y lectura del escaner.",
        status: "coming_soon",
      },
      {
        key: "Cajon de dinero",
        code: "CD",
        title: "Cajon de dinero",
        description: "Parametros de apertura y comportamiento del cajon.",
        status: "coming_soon",
      },
      {
        key: "Terminal TPV",
        code: "TP",
        title: "Terminal TPV",
        description: "Conexion y reglas para cobro con terminal bancaria.",
        status: "coming_soon",
      },
    ],
  },
  {
    id: "mantenimiento",
    title: "Mantenimiento",
    description: "Herramientas administrativas y control operativo.",
    options: [
      {
        key: "Respaldos automaticos",
        code: "RA",
        title: "Respaldos automaticos",
        description: "Programar copias de seguridad y recuperacion.",
        status: "coming_soon",
      },
      {
        key: "Actualizaciones",
        code: "AC",
        title: "Actualizaciones",
        description: "Controlar version, cambios y despliegues del sistema.",
        status: "coming_soon",
      },
      {
        key: "Limpieza de datos",
        code: "LD",
        title: "Limpieza de datos",
        description: "Depurar archivos temporales y recursos locales.",
        status: "coming_soon",
      },
      {
        key: "Logs del sistema",
        code: "LG",
        title: "Logs del sistema",
        description: "Consultar actividad, errores y eventos operativos.",
        status: "coming_soon",
      },
    ],
  },
];

const Settings = () => {
  const navigate = useNavigate();

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
        <div className={styles.content}>
          <section className={styles.hero}>
            <div className={styles.heroCopy}>
              <span className={styles.eyebrow}>ADMINISTRACION DEL SISTEMA</span>
              <h1>Configuracion</h1>
              <p>
                Centraliza usuarios, dispositivos y reglas operativas del POS en
                un solo espacio, con el mismo estilo sobrio del resto del
                sistema.
              </p>
            </div>

            <div className={styles.heroMeta}>
              <div className={styles.metric}>
                <strong>1</strong>
                <span>Modulo activo</span>
              </div>
              <div className={styles.metric}>
                <strong>13</strong>
                <span>Opciones listas para crecer</span>
              </div>
              <div className={styles.metricAccent}>
                <span>Acceso restringido</span>
                <strong>SOLO ADMINISTRADORES</strong>
              </div>
            </div>
          </section>

          <div className={styles.sections}>
            {SETTINGS_SECTIONS.map((section) => (
              <section key={section.id} className={styles.section}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.sectionTitle}>{section.title}</h2>
                    <p className={styles.sectionDescription}>
                      {section.description}
                    </p>
                  </div>
                  <span className={styles.sectionCount}>
                    {section.options.length} opcion
                    {section.options.length === 1 ? "" : "es"}
                  </span>
                </div>

                <div className={styles.optionList}>
                  {section.options.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      className={styles.optionRow}
                      onClick={() => handleOptionClick(option.key)}
                    >
                      <span className={styles.optionCode}>{option.code}</span>

                      <div className={styles.optionInfo}>
                        <h3>{option.title}</h3>
                        <p>{option.description}</p>
                      </div>

                      <span
                        className={
                          option.status === "available"
                            ? `${styles.optionBadge} ${styles.optionBadgeAvailable}`
                            : `${styles.optionBadge} ${styles.optionBadgeSoon}`
                        }
                      >
                        {option.status === "available"
                          ? "Disponible"
                          : "Proximamente"}
                      </span>

                      <span className={styles.optionArrow}>{">"}</span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Settings;
