import React from "react";
import styles from "../SettingsCash.module.css";
import ToggleSwitch from "./ToggleSwitch";

const CashCutCard = ({ settings, onSettingChange }) => (
  <article className={styles.card}>
    <h2 className={styles.cardTitle}>Políticas de Corte y Arqueo de Turno</h2>
    <p className={styles.cardDescription}>
      Configuración para el arqueo y control de descuadres.
    </p>

    <div className={styles.settingsRow}>
      <div className={styles.settingsRowLeft}>
        <h3 className={styles.settingsRowTitle}>Modalidad de arqueo</h3>
      </div>
      <div
        className={`${styles.settingsRowRight} ${styles.settingsRowRightFull}`}
      >
        <div
          role="radiogroup"
          aria-label="Modalidad de arqueo"
          className={styles.arqueoGrid}
        >
          <div
            role="radio"
            aria-checked={!settings.blindCountCut}
            tabIndex={!settings.blindCountCut ? 0 : -1}
            className={styles.radioCard}
            onClick={() => onSettingChange("blindCountCut", false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSettingChange("blindCountCut", false);
              }
            }}
          >
            <input
              type="radio"
              checked={!settings.blindCountCut}
              readOnly
              className={styles.radioCardInput}
            />
            <div className={styles.radioCardContent}>
              <h4 className={styles.radioCardTitle}>
                Arqueo abierto (Estándar)
              </h4>
              <p className={styles.radioCardDescription}>
                El operador visualiza el saldo teórico esperado
              </p>
            </div>
          </div>
          <div
            role="radio"
            aria-checked={settings.blindCountCut}
            tabIndex={settings.blindCountCut ? 0 : -1}
            className={styles.radioCard}
            onClick={() => onSettingChange("blindCountCut", true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSettingChange("blindCountCut", true);
              }
            }}
          >
            <input
              type="radio"
              checked={settings.blindCountCut}
              readOnly
              className={styles.radioCardInput}
            />
            <div className={styles.radioCardContent}>
              <div className={styles.radioCardTitleRow}>
                <h4 className={styles.radioCardTitle}>
                  Arqueo ciego (Recomendado)
                </h4>
                <span className={styles.recommendedBadge}>Recomendado</span>
              </div>
              <p className={styles.radioCardDescription}>
                El operador captura su conteo físico sin ver el saldo esperado
                del sistema
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div className={styles.settingsRow}>
      <div className={styles.settingsRowLeft}>
        <h3 className={styles.settingsRowTitle}>
          Exigir nota obligatoria si existe faltante o sobrante en el corte
        </h3>
        <p className={styles.settingsRowDescription}>
          Obliga al cajero a capturar una justificación antes de confirmar el
          corte si el conteo físico no coincide con el saldo esperado.
        </p>
      </div>
      <div className={styles.settingsRowRight}>
        <ToggleSwitch
          checked={settings.requireCutDifferenceNote}
          onChange={(value) =>
            onSettingChange("requireCutDifferenceNote", value)
          }
          ariaLabel="Exigir nota obligatoria si existe faltante o sobrante en el corte"
        />
      </div>
    </div>
  </article>
);

export default CashCutCard;
