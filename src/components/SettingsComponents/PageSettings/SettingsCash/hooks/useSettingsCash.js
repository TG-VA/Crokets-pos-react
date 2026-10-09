import { useEffect, useState } from "react";

import { useAuth } from "../../../../../contexts/AuthContext";
import { checkUserIsAdmin } from "../../../../../lib/permissionsService";
import {
  getCashMaxOpeningAmount,
  updateCashMaxOpeningAmount,
} from "../../../../../pages/Settings/services/cashSettingsService";
import {
  DEFAULT_CASH_OPERATION_SETTINGS,
  getCashOperationSettings,
  saveCashOperationSettings,
  triggerCashDrawerKick,
} from "../../../../../services/cashOperationSettingsService";

/**
 * Estado y ciclo de vida de la configuracion de caja.
 *
 * Concentra la carga (lectura de `getCashOperationSettings` y del tope de
 * apertura via RPC), el guardado y la prueba del cajon, de modo que la vista
 * solo orqueste tarjetas y feedback.
 */
const useSettingsCash = () => {
  const { user } = useAuth();

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  const [cashMax, setCashMax] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_CASH_OPERATION_SETTINGS);
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

  const handleSettingChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleCashMaxChange = (value) => {
    setCashMax(value);
  };

  const handleSave = async () => {
    setDrawerFeedback(null);
    setFeedback(null);
    setSaving(true);

    let consolidatedMessage = null;

    try {
      if (isAdmin) {
        const cashMaxValue = settings.maxOpeningCashEnabled
          ? cashMax
          : "1000000";
        const resCashMax = await updateCashMaxOpeningAmount(cashMaxValue);
        if (!resCashMax.success) {
          setFeedback({ type: "error", message: resCashMax.error });
          return;
        }
        setCashMax(String(resCashMax.amount));
        consolidatedMessage = "Tope de apertura de caja actualizado.";
      }

      const resSettings = saveCashOperationSettings(settings);
      if (!resSettings.success) {
        setFeedback({ type: "error", message: resSettings.error });
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

  return {
    adminLoading,
    cashMax,
    drawerFeedback,
    feedback,
    handleCashMaxChange,
    handleSave,
    handleSettingChange,
    handleTestDrawer,
    isAdmin,
    saving,
    settings,
    testingDrawer,
  };
};

export default useSettingsCash;
