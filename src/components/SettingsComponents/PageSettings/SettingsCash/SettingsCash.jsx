import { useEffect, useState } from "react";
import { useAuth } from "../../../../contexts/AuthContext";
import { checkUserIsAdmin } from "../../../../lib/permissionsService";
import {
  getCashMaxOpeningAmount,
  updateCashMaxOpeningAmount,
} from "../../../../pages/Settings/services/cashSettingsService";
import {
  getCashOperationSettings,
  saveCashOperationSettings,
  triggerCashDrawerKick,
} from "../../../../services/cashOperationSettingsService";
import styles from "./SettingsCash.module.css";

const SettingsCash = () => {
  const { user } = useAuth();

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  const [cashMax, setCashMax] = useState("");
  const [cashMaxEdited, setCashMaxEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [settings, setSettings] = useState({
    defaultOpeningCash: 0,
    allowZeroOpening: true,
    drawerCashLimit: 0,
    drawerAlertEnabled: false,
    requireExitReason: true,
    blindCountCut: false,
    cutToleranceAmount: 0,
    requireCutDifferenceNote: true,
    cashDrawerEnabled: false,
    cashDrawerTrigger: "cash_only",
    cashDrawerConnection: "printer_rj11",
  });
  const [testingDrawer, setTestingDrawer] = useState(false);
  const [drawerFeedback, setDrawerFeedback] = useState(null);

  useEffect(() => {
    let mounted = true;

    const loadConfiguration = async (userId) => {
      const admin = userId ? await checkUserIsAdmin(userId) : false;

      if (!mounted) return;

      setIsAdmin(admin);
      setAdminLoading(false);

      const ops = getCashOperationSettings();
      if (mounted) {
        setSettings(ops);
      }

      if (!admin) return;

      const res = await getCashMaxOpeningAmount();

      if (!mounted) return;

      if (res.success) {
        setCashMax(res.amount == null ? "" : String(res.amount));
        setCashMaxEdited(false);
      } else {
        setFeedback({ type: "error", message: res.error });
      }
    };

    loadConfiguration(user?.id);

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const handleSettingChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setDrawerFeedback(null);
    setFeedback(null);
    setSaving(true);

    let consolidatedMessage = null;
    let hasError = false;

    try {
      if (isAdmin) {
        const resCashMax = await updateCashMaxOpeningAmount(cashMax);
        if (!resCashMax.success) {
          setFeedback({ type: "error", message: resCashMax.error });
          hasError = true;
          return;
        }
        setCashMax(String(resCashMax.amount));
        setCashMaxEdited(false);
        consolidatedMessage = "Tope de apertura de caja actualizado.";
      }

      const resSettings = saveCashOperationSettings(settings);
      if (!resSettings.success) {
        setFeedback({ type: "error", message: resSettings.error });
        hasError = true;
        return;
      }
      setSettings((prev) => ({ ...prev, ...resSettings }));

      const message = consolidatedMessage
        ? `${consolidatedMessage} Configuración de caja y operación guardada.`
        : "Configuración de caja y operación guardada.";
      setFeedback({ type: "success", message });
    } finally {
      setSaving(false);
    }
  };

  const handleTestDrawer = async () => {
    setDrawerFeedback(null);
    setTestingDrawer(true);
    const res = await triggerCashDrawerKick();
    setTestingDrawer(false);
    if (!res.success) {
      setDrawerFeedback({ type: "error", message: res.message });
      return;
    }
    setDrawerFeedback({ type: "success", message: res.message });
  };

  const ToggleSwitch = ({ checked, onChange, disabled = false, id, ariaLabel }) => (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      className={styles.toggleSwitch}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.toggleThumb} />
    </button>
  );

  const MonetaryInput = ({ id, value, onChange, placeholder = "0.00", ariaDescribedby }) => (
    <div className={styles.monetaryInputWrapper}>
      <span className={styles.monetaryPrefix}>$</span>
      <input
        id={id}
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        className={styles.monetaryInput}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-describedby={ariaDescribedby}
      />
      <span className={styles.monetarySuffix}>MXN</span>
    </div>
  );

  const isDrawerDisabled = !settings.cashDrawerEnabled;

  return (
    <section className={styles.settingsSection} aria-labelledby="settings-cash-title">
      <header className={styles.settingsHeader}>
        <div>
          <h1 id="settings-cash-title" className={styles.settingsTitle}>
            Caja y Operación
          </h1>
          <p className={styles.settingsSubtitle}>
            Parámetros operativos de la caja registradora
          </p>
        </div>
        <button
          type="button"
          className={styles.button}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Guardando..." : "Guardar configuración"}
        </button>
      </header>

      {feedback?.type === "error" ? (
        <p role="alert" className={styles.errorMessage}>
          {feedback.message}
        </p>
      ) : null}

      {feedback?.type === "success" ? (
        <p role="status" className={styles.statusMessage}>
          {feedback.message}
        </p>
      ) : null}

      <article className={styles.card}>
        <h2 className={styles.cardTitle}>Políticas de Apertura de Caja</h2>
        <p className={styles.cardDescription}>
          Configuración para el proceso de apertura de caja registradora.
        </p>

        {adminLoading ? (
          <p role="status" className={styles.adminHint}>
            Cargando configuración de caja...
          </p>
        ) : !isAdmin ? (
          <p role="status" className={styles.adminHint}>
            Se requiere un perfil de administrador para modificar este valor.
          </p>
        ) : (
          <div className={styles.settingsRow}>
            <div className={styles.settingsRowLeft}>
              <h3 className={styles.settingsRowTitle}>Monto máximo</h3>
              <p className={styles.settingsRowDescription}>
                Expresado en pesos mexicanos. El valor se aplica al momento de
                abrir caja.
              </p>
              <p id="cash-max-amount-hint" className={styles.adminHint}>
                Solo guardado para usuarios administradores.
              </p>
            </div>
            <div className={styles.settingsRowRight}>
              <label htmlFor="cash-max-amount" className={styles.visuallyHidden}>Monto máximo</label>
              <div className={styles.monetaryInputWrapper}>
                <span className={styles.monetaryPrefix}>$</span>
                <input
                  id="cash-max-amount"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  className={styles.monetaryInput}
                  value={cashMax}
                  onChange={(event) => {
                    setCashMax(event.target.value);
                    setCashMaxEdited(true);
                  }}
                  placeholder="Ej. 1000000"
                  aria-describedby="cash-max-amount-hint"
                />
                <span className={styles.monetarySuffix}>MXN</span>
              </div>
            </div>
          </div>
        )}

        <div className={styles.settingsRow}>
          <div className={styles.settingsRowLeft}>
            <h3 className={styles.settingsRowTitle}>
              Monto predeterminado de fondo inicial
            </h3>
            <p className={styles.settingsRowDescription}>
              Expresado en pesos mexicanos.
            </p>
          </div>
          <div className={styles.settingsRowRight}>
            <MonetaryInput
              id="default-opening-cash"
              value={settings.defaultOpeningCash}
              onChange={(event) =>
                handleSettingChange("defaultOpeningCash", event.target.value)
              }
            />
          </div>
        </div>

        <div className={styles.settingsRow}>
          <div className={styles.settingsRowLeft}>
            <h3 className={styles.settingsRowTitle}>
              Permitir apertura de caja con monto cero ($0.00)
            </h3>
          </div>
          <div className={styles.settingsRowRight}>
            <ToggleSwitch
              checked={settings.allowZeroOpening}
              onChange={(value) =>
                handleSettingChange("allowZeroOpening", value)
              }
              ariaLabel="Permitir apertura de caja con monto cero"
            />
          </div>
        </div>

        <div className={styles.settingsRow}>
          <div className={styles.settingsRowLeft}>
            <h3 className={styles.settingsRowTitle}>
              Límite de efectivo permitido en cajón
            </h3>
            <p className={styles.settingsRowDescription}>
              Al superar este monto, el sistema podrá emitir una alerta
              preventiva.
            </p>
          </div>
          <div className={styles.settingsRowRight}>
            <MonetaryInput
              id="drawer-cash-limit"
              value={settings.drawerCashLimit}
              onChange={(event) =>
                handleSettingChange("drawerCashLimit", event.target.value)
              }
            />
          </div>
        </div>

        <div className={styles.settingsRow}>
          <div className={styles.settingsRowLeft}>
            <h3 className={styles.settingsRowTitle}>
              Activar alerta preventiva de retiro al superar este monto
            </h3>
          </div>
          <div className={styles.settingsRowRight}>
            <ToggleSwitch
              checked={settings.drawerAlertEnabled}
              onChange={(value) =>
                handleSettingChange("drawerAlertEnabled", value)
              }
              ariaLabel="Activar alerta preventiva de retiro al superar este monto"
            />
          </div>
        </div>

        <div className={styles.settingsRow}>
          <div className={styles.settingsRowLeft}>
            <h3 className={styles.settingsRowTitle}>
              Exigir concepto o justificación obligatoria en salidas de dinero
            </h3>
          </div>
          <div className={styles.settingsRowRight}>
            <ToggleSwitch
              checked={settings.requireExitReason}
              onChange={(value) =>
                handleSettingChange("requireExitReason", value)
              }
              ariaLabel="Exigir concepto o justificación obligatoria en salidas de dinero"
            />
          </div>
        </div>
      </article>

      <article className={styles.card}>
        <h2 className={styles.cardTitle}>Políticas de Corte y Arqueo de Turno</h2>
        <p className={styles.cardDescription}>
          Configuración para el arqueo y control de descuadres.
        </p>

        <div className={styles.settingsRow}>
          <div className={styles.settingsRowLeft}>
            <h3 className={styles.settingsRowTitle}>Modalidad de arqueo</h3>
          </div>
          <div className={`${styles.settingsRowRight} ${styles.settingsRowRightFull}`}>
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
                onClick={() => handleSettingChange("blindCountCut", false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSettingChange("blindCountCut", false);
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
                onClick={() => handleSettingChange("blindCountCut", true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSettingChange("blindCountCut", true);
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
                    El operador captura su conteo físico sin ver el saldo
                    esperado del sistema
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.settingsRow}>
          <div className={styles.settingsRowLeft}>
            <h3 className={styles.settingsRowTitle}>
              Tolerancia máxima de descuadre sin autorización de administrador
            </h3>
          </div>
          <div className={styles.settingsRowRight}>
            <MonetaryInput
              id="cut-tolerance-amount"
              value={settings.cutToleranceAmount}
              onChange={(event) =>
                handleSettingChange("cutToleranceAmount", event.target.value)
              }
            />
          </div>
        </div>

        <div className={styles.settingsRow}>
          <div className={styles.settingsRowLeft}>
            <h3 className={styles.settingsRowTitle}>
              Exigir nota obligatoria si existe faltante o sobrante en el corte
            </h3>
          </div>
          <div className={styles.settingsRowRight}>
            <ToggleSwitch
              checked={settings.requireCutDifferenceNote}
              onChange={(value) =>
                handleSettingChange("requireCutDifferenceNote", value)
              }
              ariaLabel="Exigir nota obligatoria si existe faltante o sobrante en el corte"
            />
          </div>
        </div>
      </article>

      <article className={styles.card}>
        <h2 className={styles.cardTitle}>Dispositivo: Cajón de Dinero (Gaveta)</h2>
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
              onChange={(value) =>
                handleSettingChange("cashDrawerEnabled", value)
              }
              ariaLabel="Habilitar cajón registrador físico"
            />
          </div>
        </div>

        <div className={styles.settingsRow}>
          <div className={styles.settingsRowLeft}>
            <h3 className={styles.settingsRowTitle}>Momento de disparo</h3>
          </div>
          <div className={`${styles.settingsRowRight} ${styles.settingsRowRightFull}`}>
            <div
              role="radiogroup"
              aria-label="Momento de disparo"
              className={styles.radioCardGroup}
            >
              <div
                role="radio"
                aria-checked={settings.cashDrawerTrigger === "cash_only"}
                aria-disabled={isDrawerDisabled}
                tabIndex={settings.cashDrawerTrigger === "cash_only" && !isDrawerDisabled ? 0 : -1}
                className={`${styles.radioCard} ${isDrawerDisabled ? styles.fieldDisabled : ""}`}
                onClick={() => {
                  if (!isDrawerDisabled) {
                    handleSettingChange("cashDrawerTrigger", "cash_only");
                  }
                }}
                onKeyDown={(e) => {
                  if (!isDrawerDisabled && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    handleSettingChange("cashDrawerTrigger", "cash_only");
                  }
                }}
              >
                <input
                  type="radio"
                  checked={settings.cashDrawerTrigger === "cash_only"}
                  readOnly
                  disabled={isDrawerDisabled}
                  className={styles.radioCardInput}
                />
                <div className={styles.radioCardContent}>
                  <h4 className={styles.radioCardTitle}>
                    Solo al cobrar en efectivo o mixto
                  </h4>
                </div>
              </div>
              <div
                role="radio"
                aria-checked={settings.cashDrawerTrigger === "all_sales"}
                aria-disabled={isDrawerDisabled}
                tabIndex={settings.cashDrawerTrigger === "all_sales" && !isDrawerDisabled ? 0 : -1}
                className={`${styles.radioCard} ${isDrawerDisabled ? styles.fieldDisabled : ""}`}
                onClick={() => {
                  if (!isDrawerDisabled) {
                    handleSettingChange("cashDrawerTrigger", "all_sales");
                  }
                }}
                onKeyDown={(e) => {
                  if (!isDrawerDisabled && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    handleSettingChange("cashDrawerTrigger", "all_sales");
                  }
                }}
              >
                <input
                  type="radio"
                  checked={settings.cashDrawerTrigger === "all_sales"}
                  readOnly
                  disabled={isDrawerDisabled}
                  className={styles.radioCardInput}
                />
                <div className={styles.radioCardContent}>
                  <h4 className={styles.radioCardTitle}>
                    En todas las ventas (Efectivo, Tarjeta, Transferencia)
                  </h4>
                </div>
              </div>
              <div
                role="radio"
                aria-checked={settings.cashDrawerTrigger === "cash_and_movements"}
                aria-disabled={isDrawerDisabled}
                tabIndex={settings.cashDrawerTrigger === "cash_and_movements" && !isDrawerDisabled ? 0 : -1}
                className={`${styles.radioCard} ${isDrawerDisabled ? styles.fieldDisabled : ""}`}
                onClick={() => {
                  if (!isDrawerDisabled) {
                    handleSettingChange("cashDrawerTrigger", "cash_and_movements");
                  }
                }}
                onKeyDown={(e) => {
                  if (!isDrawerDisabled && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    handleSettingChange("cashDrawerTrigger", "cash_and_movements");
                  }
                }}
              >
                <input
                  type="radio"
                  checked={settings.cashDrawerTrigger === "cash_and_movements"}
                  readOnly
                  disabled={isDrawerDisabled}
                  className={styles.radioCardInput}
                />
                <div className={styles.radioCardContent}>
                  <h4 className={styles.radioCardTitle}>
                    En ventas en efectivo y en movimientos de caja
                    (Entradas/Salidas)
                  </h4>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.settingsRow}>
          <div className={styles.settingsRowLeft}>
            <h3 className={styles.settingsRowTitle}>Método de conexión</h3>
          </div>
          <div className={`${styles.settingsRowRight} ${styles.settingsRowRightFull}`}>
            <div
              role="radiogroup"
              aria-label="Método de conexión"
              className={styles.radioCardGroup}
            >
              <div
                role="radio"
                aria-checked={settings.cashDrawerConnection === "printer_rj11"}
                aria-disabled={isDrawerDisabled}
                tabIndex={settings.cashDrawerConnection === "printer_rj11" && !isDrawerDisabled ? 0 : -1}
                className={`${styles.radioCard} ${isDrawerDisabled ? styles.fieldDisabled : ""}`}
                onClick={() => {
                  if (!isDrawerDisabled) {
                    handleSettingChange("cashDrawerConnection", "printer_rj11");
                  }
                }}
                onKeyDown={(e) => {
                  if (!isDrawerDisabled && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    handleSettingChange("cashDrawerConnection", "printer_rj11");
                  }
                }}
              >
                <input
                  type="radio"
                  checked={settings.cashDrawerConnection === "printer_rj11"}
                  readOnly
                  disabled={isDrawerDisabled}
                  className={styles.radioCardInput}
                />
                <div className={styles.radioCardContent}>
                  <h4 className={styles.radioCardTitle}>
                    A través de la impresora térmica (Puerto RJ11 / Drawer Kick)
                  </h4>
                </div>
              </div>
              <div
                role="radio"
                aria-checked={settings.cashDrawerConnection === "manual"}
                aria-disabled={isDrawerDisabled}
                tabIndex={settings.cashDrawerConnection === "manual" && !isDrawerDisabled ? 0 : -1}
                className={`${styles.radioCard} ${isDrawerDisabled ? styles.fieldDisabled : ""}`}
                onClick={() => {
                  if (!isDrawerDisabled) {
                    handleSettingChange("cashDrawerConnection", "manual");
                  }
                }}
                onKeyDown={(e) => {
                  if (!isDrawerDisabled && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    handleSettingChange("cashDrawerConnection", "manual");
                  }
                }}
              >
                <input
                  type="radio"
                  checked={settings.cashDrawerConnection === "manual"}
                  readOnly
                  disabled={isDrawerDisabled}
                  className={styles.radioCardInput}
                />
                <div className={styles.radioCardContent}>
                  <h4 className={styles.radioCardTitle}>Manual</h4>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.settingsRow}>
          <div className={styles.settingsRowLeft}>
            <h3 className={styles.settingsRowTitle}>Prueba de cajón</h3>
            <p className={styles.settingsRowDescription}>
              Verifica que el cajón registrador abra correctamente
            </p>
          </div>
          <div className={styles.settingsRowRight}>
            <button
              type="button"
              className={styles.buttonSecondary}
              onClick={handleTestDrawer}
              disabled={testingDrawer || isDrawerDisabled}
            >
              {testingDrawer ? "Probando..." : "Probar apertura del cajón"}
            </button>
          </div>
        </div>

        {drawerFeedback?.type === "error" ? (
          <p role="alert" className={`${styles.errorMessage} ${styles.feedbackInline}`}>
            {drawerFeedback.message}
          </p>
        ) : null}

        {drawerFeedback?.type === "success" ? (
          <p role="status" className={`${styles.statusMessage} ${styles.feedbackInline}`}>
            {drawerFeedback.message}
          </p>
        ) : null}
      </article>
    </section>
  );
};

export default SettingsCash;
