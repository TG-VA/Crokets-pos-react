import React from "react";
import styles from "../SettingsCash.module.css";
import ToggleSwitch from "./ToggleSwitch";
import RadioOption from "./RadioOption";
import CircleCheckIcon from "../../../../../assets/icons/circle-check-solid-full.svg";
import TriangleExclamationIcon from "../../../../../assets/icons/triangle-exclamation-solid-full.svg";

const CashDrawerCard = ({
  settings,
  onSettingChange,
  testingDrawer,
  drawerFeedback,
  onTestDrawer,
}) => {
  const isDrawerDisabled = !settings.cashDrawerEnabled;
  const isManualConnection = settings.cashDrawerConnection === "manual";
  const isElectricTriggerDisabled = isDrawerDisabled || isManualConnection;

  return (
    <article className={styles.card}>
      <h2 className={styles.cardTitle}>
        Dispositivo: Cajón de Dinero (Gaveta)
      </h2>
      <p className={styles.cardDescription}>
        Configuración del hardware para apertura automática del cajón.
      </p>

      <div className={styles.settingsRow}>
        <div className={styles.settingsRowLeft}>
          <h3 className={styles.settingsRowTitle}>
            Habilitar cajón registrador físico
          </h3>
        </div>
        <div className={styles.settingsRowRight}>
          <ToggleSwitch
            checked={settings.cashDrawerEnabled}
            onChange={(value) => onSettingChange("cashDrawerEnabled", value)}
            ariaLabel="Habilitar cajón registrador físico"
          />
        </div>
      </div>

      <div
        className={`${styles.settingsRow} ${
          isElectricTriggerDisabled ? styles.fieldDisabled : ""
        }`}
      >
        <div className={styles.settingsRowLeft}>
          <h3 className={styles.settingsRowTitle}>Momento de disparo</h3>
          {isManualConnection && !isDrawerDisabled ? (
            <p className={styles.settingsRowDescription}>
              No aplica en modo manual (el cajón se opera exclusivamente con
              llave).
            </p>
          ) : null}
        </div>
        <div
          className={`${styles.settingsRowRight} ${styles.settingsRowRightFull}`}
        >
          <div
            role="radiogroup"
            aria-label="Momento de disparo"
            className={styles.radioCardGroup}
          >
            <RadioOption
              selected={settings.cashDrawerTrigger === "cash_only"}
              disabled={isElectricTriggerDisabled}
              onSelect={() => onSettingChange("cashDrawerTrigger", "cash_only")}
              title="Solo al recibir dinero físico (Efectivo, Dólares o Mixto)"
              description="Abre el cajón en cobros con efectivo o divisas y en movimientos de caja (entradas y salidas). No abre en pagos exclusivos con tarjeta o transferencia."
            />
            <RadioOption
              selected={settings.cashDrawerTrigger === "all_sales"}
              disabled={isElectricTriggerDisabled}
              onSelect={() => onSettingChange("cashDrawerTrigger", "all_sales")}
              title="En todas las ventas (Efectivo, Dólares, Tarjeta, Transferencia o Mixto)"
              description="Abre el cajón al finalizar cualquier cobro (para resguardo de vouchers o comprobantes) y en todos los movimientos de caja."
            />
          </div>
        </div>
      </div>

      <div className={styles.settingsRow}>
        <div className={styles.settingsRowLeft}>
          <h3 className={styles.settingsRowTitle}>Método de conexión</h3>
        </div>
        <div
          className={`${styles.settingsRowRight} ${styles.settingsRowRightFull}`}
        >
          <div
            role="radiogroup"
            aria-label="Método de conexión"
            className={styles.radioCardGroup}
          >
            <RadioOption
              selected={settings.cashDrawerConnection === "printer_rj11"}
              disabled={isDrawerDisabled}
              onSelect={() =>
                onSettingChange("cashDrawerConnection", "printer_rj11")
              }
              title="A través de la impresora térmica (Puerto RJ11 / Drawer Kick)"
              description="El cajón debe estar conectado con cable RJ11 a la impresora térmica de tickets."
            />
            <RadioOption
              selected={settings.cashDrawerConnection === "manual"}
              disabled={isDrawerDisabled}
              onSelect={() =>
                onSettingChange("cashDrawerConnection", "manual")
              }
              title="Manual"
              description="Apertura física tradicional mediante llave. No requiere cables ni pulsos eléctricos."
            />
          </div>
        </div>
      </div>

      <div className={styles.settingsRow}>
        <div className={styles.settingsRowLeft}>
          <h3 className={styles.settingsRowTitle}>Prueba de cajón</h3>
          <p className={styles.settingsRowDescription}>
            {isManualConnection && !isDrawerDisabled
              ? "Prueba no requerida en modo manual (con llave)."
              : "Verifica que el cajón registrador abra correctamente"}
          </p>
        </div>
        <div className={styles.settingsRowRight}>
          <button
            type="button"
            className={styles.buttonSecondary}
            onClick={onTestDrawer}
            disabled={testingDrawer || isElectricTriggerDisabled}
          >
            {testingDrawer ? "Probando..." : "Probar apertura del cajón"}
          </button>
        </div>
      </div>

      {drawerFeedback?.type === "error" ? (
        <div
          role="alert"
          className={`${styles.errorMessage} ${styles.feedbackInline}`}
        >
          <img
            src={TriangleExclamationIcon}
            alt=""
            className={styles.feedbackIcon}
            aria-hidden="true"
          />
          <span>{drawerFeedback.message}</span>
        </div>
      ) : null}

      {drawerFeedback?.type === "success" ? (
        <div
          role="status"
          className={`${styles.statusMessage} ${styles.feedbackInline}`}
        >
          <img
            src={CircleCheckIcon}
            alt=""
            className={styles.feedbackIcon}
            aria-hidden="true"
          />
          <span>{drawerFeedback.message}</span>
        </div>
      ) : null}
    </article>
  );
};

export default CashDrawerCard;
