import React from "react";
import styles from "../SettingsCash.module.css";
import MonetaryInput from "./MonetaryInput";
import ToggleSwitch from "./ToggleSwitch";

const CashUsdCard = ({ settings, onSettingChange }) => (
  <article className={styles.card}>
    <h2 className={styles.cardTitle}>Cobros en Dólares (USD)</h2>
    <p className={styles.cardDescription}>
      Reglas operativas para la recepción de moneda extranjera en punto de
      venta.
    </p>

    <div className={styles.settingsRow}>
      <div className={styles.settingsRowLeft}>
        <h3 className={styles.settingsRowTitle}>
          Aceptar pagos en dólares (USD)
        </h3>
        <p className={styles.settingsRowDescription}>
          Permite a los cajeros recibir billetes de dólares estadounidenses en
          ventas directas y cobros mixtos.
        </p>
      </div>
      <div className={styles.settingsRowRight}>
        <ToggleSwitch
          checked={settings.acceptUsdPayments}
          onChange={(value) => onSettingChange("acceptUsdPayments", value)}
          ariaLabel="Aceptar pagos en dólares (USD)"
        />
      </div>
    </div>

    <div
      className={`${styles.settingsRow} ${
        !settings.acceptUsdPayments ? styles.fieldDisabled : ""
      }`}
    >
      <div className={styles.settingsRowLeft}>
        <h3 className={styles.settingsRowTitle}>
          Tipo de cambio predeterminado
        </h3>
        <p className={styles.settingsRowDescription}>
          Valor de conversión en pesos mexicanos (MXN) sugerido por cada 1 USD
          al registrar un cobro.
        </p>
      </div>
      <div className={styles.settingsRowRight}>
        <MonetaryInput
          id="default-exchange-rate"
          value={settings.defaultExchangeRate}
          disabled={!settings.acceptUsdPayments}
          min="1"
          onChange={(event) =>
            onSettingChange("defaultExchangeRate", event.target.value)
          }
        />
      </div>
    </div>
  </article>
);

export default CashUsdCard;
