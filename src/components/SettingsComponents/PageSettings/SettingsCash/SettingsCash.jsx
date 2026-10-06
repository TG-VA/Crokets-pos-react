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
import shared from "../PageSettings.module.css";

const SettingsCash = () => {
  const { user } = useAuth();

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  const [cashMax, setCashMax] = useState("");
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
      } else {
        setFeedback({ type: "error", message: res.error });
      }
    };

    loadConfiguration(user?.id);

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const handleSaveCashMax = async () => {
    setFeedback(null);
    setSaving(true);

    const res = await updateCashMaxOpeningAmount(cashMax);

    setSaving(false);

    if (!res.success) {
      setFeedback({ type: "error", message: res.error });
      return;
    }

    setCashMax(String(res.amount));
    setFeedback({
      type: "success",
      message: "Tope de apertura de caja actualizado.",
    });
  };

  const handleSettingChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = () => {
    setDrawerFeedback(null);
    setFeedback(null);
    const res = saveCashOperationSettings(settings);
    if (!res.success) {
      setFeedback({ type: "error", message: res.error });
      return;
    }
    setSettings((prev) => ({ ...prev, ...res }));
    setFeedback({
      type: "success",
      message: "Configuración de caja y operación guardada.",
    });
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

  return (
    <section className={shared.page} aria-labelledby="settings-cash-title">
      <header className={shared.pageHeader}>
        <h1 id="settings-cash-title" className={shared.pageTitle}>
          Caja y Operación
        </h1>
        <p className={shared.pageSubtitle}>
          Parámetros operativos de la caja registradora
        </p>
      </header>

      <article className={shared.card}>
        <h2 className={shared.cardTitle}>Políticas de Apertura de Caja</h2>
        <p className={shared.cardDescription}>
          Configuración para el proceso de apertura de caja registradora.
        </p>

        {adminLoading ? (
          <p role="status" className={shared.hint}>
            Cargando configuración de caja...
          </p>
        ) : !isAdmin ? (
          <p role="status" className={shared.hint}>
            Se requiere un perfil de administrador para modificar este valor.
          </p>
        ) : (
          <>
            <div className={shared.field}>
              <label className={shared.label} htmlFor="cash-max-amount">
                Monto máximo
              </label>
              <input
                id="cash-max-amount"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                className={shared.input}
                value={cashMax}
                onChange={(event) => setCashMax(event.target.value)}
                placeholder="Ej. 1000000"
                aria-describedby="cash-max-amount-hint"
              />
            </div>
            <p id="cash-max-amount-hint" className={shared.hint}>
              Expresado en pesos mexicanos. El valor se aplica al momento de
              abrir caja.
            </p>
          </>
        )}

        <div className={shared.field}>
          <label className={shared.label} htmlFor="default-opening-cash">
            Monto predeterminado de fondo inicial
          </label>
          <input
            id="default-opening-cash"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            className={shared.input}
            value={settings.defaultOpeningCash}
            onChange={(event) =>
              handleSettingChange("defaultOpeningCash", event.target.value)
            }
            placeholder="0.00"
            aria-describedby="default-opening-cash-hint"
          />
          <p id="default-opening-cash-hint" className={shared.hint}>
            Expresado en pesos mexicanos.
          </p>
        </div>

        <div className={shared.field}>
          <label className={shared.checkboxLabel}>
            <input
              type="checkbox"
              checked={settings.allowZeroOpening}
              onChange={(event) =>
                handleSettingChange("allowZeroOpening", event.target.checked)
              }
            />
            Permitir apertura de caja con monto cero ($0.00)
          </label>
        </div>

        {isAdmin && (
          <div className={shared.field}>
            <button
              type="button"
              className={shared.button}
              onClick={handleSaveCashMax}
              disabled={saving}
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        )}
      </article>

      <article className={shared.card}>
        <h2 className={shared.cardTitle}>
          Control de Efectivo y Seguridad en Cajón
        </h2>
        <p className={shared.cardDescription}>
          Reglas para prevenir retiros excesivos y exigir justificación.
        </p>

        <div className={shared.field}>
          <label className={shared.label} htmlFor="drawer-cash-limit">
            Límite de efectivo acumulado en cajón
          </label>
          <input
            id="drawer-cash-limit"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            className={shared.input}
            value={settings.drawerCashLimit}
            onChange={(event) =>
              handleSettingChange("drawerCashLimit", event.target.value)
            }
            placeholder="0.00"
            aria-describedby="drawer-cash-limit-hint"
          />
          <p id="drawer-cash-limit-hint" className={shared.hint}>
            $0.00 desactiva la alerta.
          </p>
        </div>

        <div className={shared.field}>
          <label className={shared.checkboxLabel}>
            <input
              type="checkbox"
              checked={settings.drawerAlertEnabled}
              onChange={(event) =>
                handleSettingChange("drawerAlertEnabled", event.target.checked)
              }
            />
            Activar alerta preventiva de retiro en la pantalla de ventas al
            superar este monto
          </label>
        </div>

        <div className={shared.field}>
          <label className={shared.checkboxLabel}>
            <input
              type="checkbox"
              checked={settings.requireExitReason}
              onChange={(event) =>
                handleSettingChange("requireExitReason", event.target.checked)
              }
            />
            Exigir concepto o justificación obligatoria en salidas de dinero
          </label>
        </div>
      </article>

      <article className={shared.card}>
        <h2 className={shared.cardTitle}>Políticas de Corte y Arqueo de Turno</h2>
        <p className={shared.cardDescription}>
          Configuración para el arqueo y control de descuadres.
        </p>

        <fieldset className={shared.fieldset}>
          <legend className={shared.legend}>Modalidad de arqueo</legend>
          <div className={shared.radioGroup}>
            <label className={shared.radioLabel}>
              <input
                type="radio"
                name="blindCountCut"
                value="false"
                checked={!settings.blindCountCut}
                onChange={() => handleSettingChange("blindCountCut", false)}
              />
              Arqueo abierto (Estándar): El operador visualiza el saldo teórico
              esperado
            </label>
            <label className={shared.radioLabel}>
              <input
                type="radio"
                name="blindCountCut"
                value="true"
                checked={settings.blindCountCut}
                onChange={() => handleSettingChange("blindCountCut", true)}
              />
              Arqueo ciego (Recomendado): El operador captura su conteo físico
              sin ver el saldo esperado del sistema
            </label>
          </div>
        </fieldset>

        <div className={shared.field}>
          <label className={shared.label} htmlFor="cut-tolerance-amount">
            Tolerancia máxima de descuadre sin autorización de administrador
          </label>
          <input
            id="cut-tolerance-amount"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            className={shared.input}
            value={settings.cutToleranceAmount}
            onChange={(event) =>
              handleSettingChange("cutToleranceAmount", event.target.value)
            }
            placeholder="0.00"
          />
        </div>

        <div className={shared.field}>
          <label className={shared.checkboxLabel}>
            <input
              type="checkbox"
              checked={settings.requireCutDifferenceNote}
              onChange={(event) =>
                handleSettingChange(
                  "requireCutDifferenceNote",
                  event.target.checked
                )
              }
            />
            Exigir nota obligatoria si existe faltante o sobrante en el corte
          </label>
        </div>
      </article>

      <article className={shared.card}>
        <h2 className={shared.cardTitle}>Dispositivo: Cajón de Dinero (Gaveta)</h2>
        <p className={shared.cardDescription}>
          Configuración del hardware para apertura automática del cajón.
        </p>

        <div className={shared.field}>
          <label className={shared.checkboxLabel}>
            <input
              type="checkbox"
              checked={settings.cashDrawerEnabled}
              onChange={(event) =>
                handleSettingChange("cashDrawerEnabled", event.target.checked)
              }
            />
            Habilitar cajón registrador físico
          </label>
        </div>

        <fieldset className={shared.fieldset}>
          <legend className={shared.legend}>Momento de disparo</legend>
          <div className={shared.radioGroup}>
            <label className={shared.radioLabel}>
              <input
                type="radio"
                name="cashDrawerTrigger"
                value="cash_only"
                checked={settings.cashDrawerTrigger === "cash_only"}
                onChange={() =>
                  handleSettingChange("cashDrawerTrigger", "cash_only")
                }
              />
              Solo al cobrar en efectivo o mixto
            </label>
            <label className={shared.radioLabel}>
              <input
                type="radio"
                name="cashDrawerTrigger"
                value="all_sales"
                checked={settings.cashDrawerTrigger === "all_sales"}
                onChange={() =>
                  handleSettingChange("cashDrawerTrigger", "all_sales")
                }
              />
              En todas las ventas (Efectivo, Tarjeta, Transferencia)
            </label>
            <label className={shared.radioLabel}>
              <input
                type="radio"
                name="cashDrawerTrigger"
                value="cash_and_movements"
                checked={settings.cashDrawerTrigger === "cash_and_movements"}
                onChange={() =>
                  handleSettingChange(
                    "cashDrawerTrigger",
                    "cash_and_movements"
                  )
                }
              />
              En ventas en efectivo y en movimientos de caja (Entradas/Salidas)
            </label>
          </div>
        </fieldset>

        <fieldset className={shared.fieldset}>
          <legend className={shared.legend}>Método de conexión</legend>
          <div className={shared.radioGroup}>
            <label className={shared.radioLabel}>
              <input
                type="radio"
                name="cashDrawerConnection"
                value="printer_rj11"
                checked={settings.cashDrawerConnection === "printer_rj11"}
                onChange={() =>
                  handleSettingChange("cashDrawerConnection", "printer_rj11")
                }
              />
              A través de la impresora térmica (Puerto RJ11 / Drawer Kick)
            </label>
            <label className={shared.radioLabel}>
              <input
                type="radio"
                name="cashDrawerConnection"
                value="manual"
                checked={settings.cashDrawerConnection === "manual"}
                onChange={() =>
                  handleSettingChange("cashDrawerConnection", "manual")
                }
              />
              Manual
            </label>
          </div>
        </fieldset>

        <div className={shared.field}>
          <button
            type="button"
            className={shared.button}
            onClick={handleTestDrawer}
            disabled={testingDrawer}
          >
            {testingDrawer ? "Probando..." : "Probar apertura del cajón"}
          </button>
        </div>

        {drawerFeedback?.type === "error" ? (
          <p role="alert" className={shared.errorMessage}>
            {drawerFeedback.message}
          </p>
        ) : null}

        {drawerFeedback?.type === "success" ? (
          <p role="status" className={shared.statusMessage}>
            {drawerFeedback.message}
          </p>
        ) : null}
      </article>

      <div className={shared.field}>
        <button
          type="button"
          className={shared.button}
          onClick={handleSaveSettings}
        >
          Guardar configuración de caja y operación
        </button>
      </div>

      {feedback?.type === "error" ? (
        <p role="alert" className={shared.errorMessage}>
          {feedback.message}
        </p>
      ) : null}

      {feedback?.type === "success" ? (
        <p role="status" className={shared.statusMessage}>
          {feedback.message}
        </p>
      ) : null}
    </section>
  );
};

export default SettingsCash;
