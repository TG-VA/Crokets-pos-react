import React from "react";
import styles from "../SettingsCash.module.css";
import MonetaryInput from "./MonetaryInput";
import ToggleSwitch from "./ToggleSwitch";

const CashOpeningCard = ({
  isAdmin,
  adminLoading,
  cashMax,
  onCashMaxChange,
  settings,
  onSettingChange,
}) => (
  <article className={styles.card}>
    <h2 className={styles.cardTitle}>Políticas de Apertura de Caja</h2>
    <p className={styles.cardDescription}>
      Configuración de topes, fondos mínimos y valores sugeridos al iniciar
      turno.
    </p>

    {adminLoading ? (
      <p role="status" className={styles.adminHint}>
        Cargando configuración de caja...
      </p>
    ) : !isAdmin ? (
      <p role="status" className={styles.adminHint}>
        Se requiere un perfil de administrador para modificar el tope de
        apertura.
      </p>
    ) : (
      <>
        <div className={styles.settingsRow}>
          <div className={styles.settingsRowLeft}>
            <h3 className={styles.settingsRowTitle}>
              Limitar monto máximo de apertura
            </h3>
            <p className={styles.settingsRowDescription}>
              Impide abrir caja con un fondo inicial que supere el límite
              establecido.
            </p>
          </div>
          <div className={styles.settingsRowRight}>
            <ToggleSwitch
              checked={settings.maxOpeningCashEnabled}
              onChange={(value) =>
                onSettingChange("maxOpeningCashEnabled", value)
              }
              ariaLabel="Limitar monto máximo de apertura"
            />
          </div>
        </div>
        <div
          className={`${styles.settingsRow} ${
            !settings.maxOpeningCashEnabled ? styles.fieldDisabled : ""
          }`}
        >
          <div className={styles.settingsRowLeft}>
            <h3 className={styles.settingsRowTitle}>Monto máximo permitido</h3>
            <p className={styles.settingsRowDescription}>
              Expresado en pesos mexicanos. El valor se aplica al momento de
              abrir caja.
            </p>
            <p id="cash-max-amount-hint" className={styles.adminHint}>
              Solo guardado para usuarios administradores.
            </p>
          </div>
          <div className={styles.settingsRowRight}>
            <label htmlFor="cash-max-amount" className={styles.visuallyHidden}>
              Monto máximo
            </label>
            <div
              className={`${styles.monetaryInputWrapper} ${
                !settings.maxOpeningCashEnabled ? styles.fieldDisabled : ""
              }`}
            >
              <span className={styles.monetaryPrefix}>$</span>
              <input
                id="cash-max-amount"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                disabled={!settings.maxOpeningCashEnabled}
                className={styles.monetaryInput}
                value={cashMax}
                onChange={(event) => onCashMaxChange(event.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
                placeholder="1000000"
                aria-describedby="cash-max-amount-hint"
              />
              <span className={styles.monetarySuffix}>MXN</span>
            </div>
          </div>
        </div>
      </>
    )}

    <div className={styles.settingsRow}>
      <div className={styles.settingsRowLeft}>
        <h3 className={styles.settingsRowTitle}>
          Exigir fondo inicial mínimo obligatorio
        </h3>
        <p className={styles.settingsRowDescription}>
          Impide abrir caja con un monto inferior al establecido (evita aperturas
          en ceros).
        </p>
      </div>
      <div className={styles.settingsRowRight}>
        <ToggleSwitch
          checked={settings.minOpeningCashEnabled}
          onChange={(value) => onSettingChange("minOpeningCashEnabled", value)}
          ariaLabel="Exigir fondo inicial mínimo obligatorio"
        />
      </div>
    </div>
    <div
      className={`${styles.settingsRow} ${
        !settings.minOpeningCashEnabled ? styles.fieldDisabled : ""
      }`}
    >
      <div className={styles.settingsRowLeft}>
        <h3 className={styles.settingsRowTitle}>Monto mínimo requerido</h3>
        <p className={styles.settingsRowDescription}>
          Monto mínimo de efectivo en caja para poder iniciar operaciones.
        </p>
      </div>
      <div className={styles.settingsRowRight}>
        <MonetaryInput
          id="min-opening-cash"
          value={settings.minOpeningCash}
          disabled={!settings.minOpeningCashEnabled}
          onChange={(event) =>
            onSettingChange("minOpeningCash", event.target.value)
          }
        />
      </div>
    </div>

    <div className={styles.settingsRow}>
      <div className={styles.settingsRowLeft}>
        <h3 className={styles.settingsRowTitle}>
          Fondo inicial sugerido al abrir caja
        </h3>
        <p className={styles.settingsRowDescription}>
          Monto que se prellena automáticamente en la pantalla de apertura para
          agilizar el inicio de turno.
        </p>
      </div>
      <div className={styles.settingsRowRight}>
        <MonetaryInput
          id="default-opening-cash"
          value={settings.defaultOpeningCash}
          onChange={(event) =>
            onSettingChange("defaultOpeningCash", event.target.value)
          }
        />
      </div>
    </div>
  </article>
);

export default CashOpeningCard;
