import { useEffect, useState } from "react";

import { useAuth } from "../../../../../contexts/AuthContext";
import { checkUserIsAdmin } from "../../../../../lib/permissionsService";
import {
  getCashMaxOpeningAmount,
  updateCashMaxOpeningAmount,
} from "../../../../../pages/Settings/services/cashSettingsService";
import {
  getCashOperationSettings,
  loadCashOperationSettings,
  persistCashOperationSettings,
  triggerCashDrawerKick,
} from "../../../../../services/cashOperationSettingsService";
import { getSelectedPrinter } from "../../../../../services/printSettingsService";

/**
 * Estado y ciclo de vida de la configuracion de caja.
 *
 * Hidrata primero desde la cache local (lectura sincrona, sin red) y despues
 * desde `system_settings` de la sucursal (`branchId`), guarda de forma
 * asincrona con estrategia cache-first y prueba el cajon. La persistencia
 * afecta a toda la sucursal, por lo que solo los administradores pueden
 * guardar cambios.
 */
const useSettingsCash = ({ branchId = null } = {}) => {
  const { user } = useAuth();

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [cashMax, setCashMax] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [settings, setSettings] = useState(() => getCashOperationSettings());
  const [testingDrawer, setTestingDrawer] = useState(false);
  const [drawerFeedback, setDrawerFeedback] = useState(null);

  useEffect(() => {
    let mounted = true;

    const loadConfiguration = async (userId) => {
      const admin = userId ? await checkUserIsAdmin(userId) : false;

      if (!mounted) return;

      setIsAdmin(admin);
      setAdminLoading(false);
      setSettings(getCashOperationSettings());

      const resOps = await loadCashOperationSettings({ branchId });

      if (!mounted) return;

      setSettings(resOps);
      setLoading(false);

      if (resOps.error) {
        setFeedback({ type: "error", message: resOps.error });
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
  }, [user?.id, branchId]);

  const handleSettingChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleCashMaxChange = (value) => {
    setCashMax(value);
  };

  const handleSave = async () => {
    setDrawerFeedback(null);
    setFeedback(null);

    if (!isAdmin) {
      setFeedback({
        type: "error",
        message:
          "Se requiere un perfil de administrador para guardar la configuración de la sucursal.",
      });
      return;
    }

    setSaving(true);

    let consolidatedMessage = null;

    try {
      const cashMaxValue = settings.maxOpeningCashEnabled ? cashMax : "1000000";
      const resCashMax = await updateCashMaxOpeningAmount(cashMaxValue);
      if (!resCashMax.success) {
        setFeedback({ type: "error", message: resCashMax.error });
        return;
      }
      setCashMax(String(resCashMax.amount));
      consolidatedMessage = "Tope de apertura de caja actualizado.";

      const resSettings = await persistCashOperationSettings({
        branchId,
        settings,
      });

      if (!resSettings.success) {
        setFeedback({ type: "error", message: resSettings.error });
        return;
      }

      setSettings((prev) => ({ ...prev, ...resSettings }));

      if (resSettings.partial) {
        setFeedback({
          type: "error",
          message:
            `Configuración guardada solo en esta máquina; no se sincronizó con la sucursal. ${
              resSettings.error || ""
            }`.trim(),
        });
        return;
      }

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
    const res = await triggerCashDrawerKick({
      printerDeviceName: getSelectedPrinter(),
    });
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
    loading,
    saving,
    settings,
    testingDrawer,
  };
};

export default useSettingsCash;
