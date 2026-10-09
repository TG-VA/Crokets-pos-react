import React from "react";
import styles from "../SettingsCash.module.css";
import MonetaryInput from "./MonetaryInput";
import ToggleSwitch from "./ToggleSwitch";

const CashSecurityCard = ({ settings, onSettingChange }) => (
  <article className={styles.card}>
    <h2 className={styles.cardTitle}>
      Control de Efectivo y Seguridad en Turno
    </h2>
    <p className={styles.cardDescription}>
      Reglas para prevenir retiros excesivos y exigir justificación en salidas.
    </p>

    <div className={styles.settingsRow}>
      <div className={styles.settingsRowLeft}>
        <h3 className={styles.settingsRowTitle}>
          Activar alerta preventiva por límite de efectivo en cajón
        </h3>
        <p className={styles.settingsRowDescription}>
          Emite una notificación en la pantalla de cobro cuando el efectivo
          acumulado supere el monto sugerido.
        </p>
      </div>
      <div className={styles.settingsRowRight}>
        <ToggleSwitch
          checked={settings.drawerAlertEnabled}
          onChange={(value) => onSettingChange("drawerAlertEnabled", value)}
          ariaLabel="Activar alerta preventiva por límite de efectivo en cajón"
        />
      </div>
    </div>

    <div
      className={`${styles.settingsRow} ${
        !settings.drawerAlertEnabled ? styles.fieldDisabled : ""
      }`}
    >
      <div className={styles.settingsRowLeft}>
        <h3 className={styles.settingsRowTitle}>
          Monto límite de efectivo permitido en cajón
        </h3>
        <p className={styles.settingsRowDescription}>
          Umbral de efectivo a partir del cual se sugiere realizar un retiro
          parcial.
        </p>
      </div>
      <div className={styles.settingsRowRight}>
        <MonetaryInput
          id="drawer-cash-limit"
          value={settings.drawerCashLimit}
          onChange={(event) =>
            onSettingChange("drawerCashLimit", event.target.value)
          }
          disabled={!settings.drawerAlertEnabled}
        />
      </div>
    </div>

    <div className={styles.settingsRow}>
      <div className={styles.settingsRowLeft}>
        <h3 className={styles.settingsRowTitle}>
          Exigir concepto o justificación obligatoria en salidas de dinero
        </h3>
        <p className={styles.settingsRowDescription}>
          Obliga a capturar un motivo antes de registrar cualquier retiro o
          egreso de caja.
        </p>
      </div>
      <div className={styles.settingsRowRight}>
        <ToggleSwitch
          checked={settings.requireExitReason}
          onChange={(value) => onSettingChange("requireExitReason", value)}
          ariaLabel="Exigir concepto o justificación obligatoria en salidas de dinero"
        />
      </div>
    </div>
  </article>
);

export default CashSecurityCard;
