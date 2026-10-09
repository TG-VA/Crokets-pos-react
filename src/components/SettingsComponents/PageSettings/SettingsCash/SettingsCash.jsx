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
    maxOpeningCashEnabled: true,
    minOpeningCashEnabled: false,
    minOpeningCash: 0,
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
        const cashMaxValue = settings.maxOpeningCashEnabled
          ? cashMax
          : "1000000";
        const resCashMax = await updateCashMaxOpeningAmount(cashMaxValue);
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

  const MonetaryInput = ({
    id,
    value,
    onChange,
    placeholder = "0.00",
    ariaDescribedby,
    disabled = false,
  }) => (
    <div
      className={`${styles.monetaryInputWrapper} ${
        disabled ? styles.fieldDisabled : ""
      }`}
    >
      <span className={styles.monetaryPrefix}>$</span>
      <input
        id={id}
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        disabled={disabled}
        className={styles.monetaryInput}
        value={value}
        onChange={onChange}
        onWheel={(e) => e.currentTarget.blur()}
        placeholder={placeholder}
        aria-describedby={ariaDescribedby}
      />
      <span className={styles.monetarySuffix}>MXN</span>
    </div>
  );

  const isDrawerDisabled = !settings.cashDrawerEnabled;
  const isManualConnection = settings.cashDrawerConnection === "manual";
  const isElectricTriggerDisabled = isDrawerDisabled || isManualConnection;

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
          Configuración de topes, fondos mínimos y valores sugeridos al iniciar
          turno.
        </p>

        {/* BLOQUE 1: Tope Máximo (Admin) */}
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
                    handleSettingChange("maxOpeningCashEnabled", value)
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
                <h3 className={styles.settingsRowTitle}>
                  Monto máximo permitido
                </h3>
                <p className={styles.settingsRowDescription}>
                  Expresado en pesos mexicanos. El valor se aplica al momento de
                  abrir caja.
                </p>
                <p id="cash-max-amount-hint" className={styles.adminHint}>
                  Solo guardado para usuarios administradores.
                </p>
              </div>
              <div className={styles.settingsRowRight}>
                <label
                  htmlFor="cash-max-amount"
                  className={styles.visuallyHidden}
                >
                  Monto máximo
                </label>
                <div
                  className={`${styles.monetaryInputWrapper} ${
                    !settings.maxOpeningCashEnabled
                      ? styles.fieldDisabled
                      : ""
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
                    onChange={(event) => {
                      setCashMax(event.target.value);
                      setCashMaxEdited(true);
                    }}
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

        {/* BLOQUE 2: Fondo Mínimo Obligatorio */}
        <div className={styles.settingsRow}>
          <div className={styles.settingsRowLeft}>
            <h3 className={styles.settingsRowTitle}>
              Exigir fondo inicial mínimo obligatorio
            </h3>
            <p className={styles.settingsRowDescription}>
              Impide abrir caja con un monto inferior al establecido (evita
              aperturas en ceros).
            </p>
          </div>
          <div className={styles.settingsRowRight}>
            <ToggleSwitch
              checked={settings.minOpeningCashEnabled}
              onChange={(value) =>
                handleSettingChange("minOpeningCashEnabled", value)
              }
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
                handleSettingChange("minOpeningCash", event.target.value)
              }
            />
          </div>
        </div>

        {/* BLOQUE 3: Fondo Sugerido Predeterminado */}
        <div className={styles.settingsRow}>
          <div className={styles.settingsRowLeft}>
            <h3 className={styles.settingsRowTitle}>
              Fondo inicial sugerido al abrir caja
            </h3>
            <p className={styles.settingsRowDescription}>
              Monto que se prellena automáticamente en la pantalla de apertura
              para agilizar el inicio de turno.
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
      </article>

      <article className={styles.card}>
        <h2 className={styles.cardTitle}>
          Control de Efectivo y Seguridad en Turno
        </h2>
        <p className={styles.cardDescription}>
          Reglas para prevenir retiros excesivos y exigir justificación en
          salidas.
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
              onChange={(value) =>
                handleSettingChange("drawerAlertEnabled", value)
              }
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
                handleSettingChange("drawerCashLimit", event.target.value)
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
              Exigir nota obligatoria si existe faltante o sobrante en el corte
            </h3>
            <p className={styles.settingsRowDescription}>
              Obliga al cajero a capturar una justificación antes de confirmar
              el corte si el conteo físico no coincide con el saldo esperado.
            </p>
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

        <div
          className={`${styles.settingsRow} ${isElectricTriggerDisabled ? styles.fieldDisabled : ""}`}
        >
          <div className={styles.settingsRowLeft}>
            <h3 className={styles.settingsRowTitle}>Momento de disparo</h3>
            {isManualConnection && !isDrawerDisabled ? (
              <p className={styles.settingsRowDescription}>
                No aplica en modo manual (el cajón se opera exclusivamente con llave).
              </p>
            ) : null}
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
                aria-disabled={isElectricTriggerDisabled}
                tabIndex={settings.cashDrawerTrigger === "cash_only" && !isElectricTriggerDisabled ? 0 : -1}
                className={`${styles.radioCard} ${isElectricTriggerDisabled ? styles.fieldDisabled : ""}`}
                onClick={() => {
                  if (!isElectricTriggerDisabled) {
                    handleSettingChange("cashDrawerTrigger", "cash_only");
                  }
                }}
                onKeyDown={(e) => {
                  if (!isElectricTriggerDisabled && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    handleSettingChange("cashDrawerTrigger", "cash_only");
                  }
                }}
              >
                <input
                  type="radio"
                  checked={settings.cashDrawerTrigger === "cash_only"}
                  readOnly
                  disabled={isElectricTriggerDisabled}
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
                aria-disabled={isElectricTriggerDisabled}
                tabIndex={settings.cashDrawerTrigger === "all_sales" && !isElectricTriggerDisabled ? 0 : -1}
                className={`${styles.radioCard} ${isElectricTriggerDisabled ? styles.fieldDisabled : ""}`}
                onClick={() => {
                  if (!isElectricTriggerDisabled) {
                    handleSettingChange("cashDrawerTrigger", "all_sales");
                  }
                }}
                onKeyDown={(e) => {
                  if (!isElectricTriggerDisabled && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    handleSettingChange("cashDrawerTrigger", "all_sales");
                  }
                }}
              >
                <input
                  type="radio"
                  checked={settings.cashDrawerTrigger === "all_sales"}
                  readOnly
                  disabled={isElectricTriggerDisabled}
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
                aria-disabled={isElectricTriggerDisabled}
                tabIndex={settings.cashDrawerTrigger === "cash_and_movements" && !isElectricTriggerDisabled ? 0 : -1}
                className={`${styles.radioCard} ${isElectricTriggerDisabled ? styles.fieldDisabled : ""}`}
                onClick={() => {
                  if (!isElectricTriggerDisabled) {
                    handleSettingChange("cashDrawerTrigger", "cash_and_movements");
                  }
                }}
                onKeyDown={(e) => {
                  if (!isElectricTriggerDisabled && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    handleSettingChange("cashDrawerTrigger", "cash_and_movements");
                  }
                }}
              >
                <input
                  type="radio"
                  checked={settings.cashDrawerTrigger === "cash_and_movements"}
                  readOnly
                  disabled={isElectricTriggerDisabled}
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
                  <p className={styles.radioCardDescription}>
                    El cajón debe estar conectado con cable RJ11 a la impresora térmica de tickets.
                  </p>
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
                  <p className={styles.radioCardDescription}>
                    Apertura física tradicional mediante llave. No requiere cables ni pulsos eléctricos.
                  </p>
                </div>
              </div>
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
              onClick={handleTestDrawer}
              disabled={testingDrawer || isElectricTriggerDisabled}
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
