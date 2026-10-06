import { useEffect, useState } from "react";
import { useAuth } from "../../../../contexts/AuthContext";
import { checkUserIsAdmin } from "../../../../lib/permissionsService";
import {
  getCashMaxOpeningAmount,
  updateCashMaxOpeningAmount,
} from "../../../../pages/Settings/services/cashSettingsService";
import shared from "../PageSettings.module.css";

const SettingsCash = () => {
  const { user } = useAuth();

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  const [cashMax, setCashMax] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    let mounted = true;

    const loadConfiguration = async (userId) => {
      const admin = userId ? await checkUserIsAdmin(userId) : false;

      if (!mounted) return;

      setIsAdmin(admin);
      setAdminLoading(false);

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

  const handleSave = async () => {
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
        <h2 className={shared.cardTitle}>Tope de apertura de caja</h2>
        <p className={shared.cardDescription}>
          Monto máximo de efectivo inicial permitido al abrir la caja
          registradora.
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
              <button
                type="button"
                className={shared.button}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
            <p id="cash-max-amount-hint" className={shared.hint}>
              Expresado en pesos mexicanos. El valor se aplica al momento de
              abrir caja.
            </p>
          </>
        )}

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
      </article>
    </section>
  );
};

export default SettingsCash;
