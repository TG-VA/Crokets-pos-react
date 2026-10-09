import { useEffect, useState } from "react";

import { getAvailableCash } from "../services/salesCashService";
import { getCashOperationSettings } from "../../../services/cashOperationSettingsService";

const EMPTY_ALERT = { show: false, limit: 0, message: "" };

/**
 * Aviso preventivo de efectivo en caja.
 *
 * Lee la politica guardada en Configuracion (`drawerAlertEnabled` y
 * `drawerCashLimit`) y, cuando el efectivo disponible del turno supera el
 * limite sugerido, expone un mensaje para que Ventas lo muestre. `refreshKey`
 * permite recalcular despues de movimientos de efectivo o ventas.
 */
const useSalesDrawerAlert = ({
  branchId,
  userId,
  enabled = true,
  getOpenCashSession,
  refreshKey,
}) => {
  const [drawerAlert, setDrawerAlert] = useState(EMPTY_ALERT);

  useEffect(() => {
    if (!enabled || !branchId || !userId) {
      setDrawerAlert(EMPTY_ALERT);
      return undefined;
    }

    const settings = getCashOperationSettings();
    const limit = Number(settings.drawerCashLimit || 0);

    if (!settings.drawerAlertEnabled || limit <= 0) {
      setDrawerAlert(EMPTY_ALERT);
      return undefined;
    }

    let cancelled = false;

    const syncAlert = async () => {
      try {
        const session = await getOpenCashSession();
        const availableCash = await getAvailableCash({ sessionId: session?.id });
        if (cancelled) return;

        setDrawerAlert({
          show: Number(availableCash || 0) > limit,
          limit,
          message: `Efectivo en caja supera el límite sugerido ($${limit.toLocaleString(
            "es-MX"
          )}). Se recomienda realizar un retiro parcial.`,
        });
      } catch (error) {
        if (cancelled) return;
        console.error("Error consultando el efectivo en caja:", error);
        setDrawerAlert(EMPTY_ALERT);
      }
    };

    syncAlert();

    return () => {
      cancelled = true;
    };
  }, [branchId, userId, enabled, getOpenCashSession, refreshKey]);

  return drawerAlert;
};

export default useSalesDrawerAlert;
