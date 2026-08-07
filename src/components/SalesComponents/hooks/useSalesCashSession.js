import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { supabase } from "../../../lib/supabaseClient";

import {
  getOpenCashSession as getOpenCashSessionFromService,
  getShiftCutStatus,
} from "../services/salesCashService";

const SHIFT_CUT_STORAGE_KEY = "shift_cut_done";
const REALTIME_REFRESH_DELAY = 400;

const useSalesCashSession = ({
  branchId,
  userId,
  enabled = true,
}) => {
  const [shiftAlreadyCut, setShiftAlreadyCut] = useState(false);
  const realtimeTimerRef = useRef(null);

  const getOpenSession = useCallback(async () => {
    return getOpenCashSessionFromService({
      branchId,
      userId,
    });
  }, [branchId, userId]);

  const updateLocalShiftCutFlag = useCallback((alreadyCut) => {
    if (alreadyCut) {
      localStorage.setItem(SHIFT_CUT_STORAGE_KEY, "true");
      return;
    }

    localStorage.removeItem(SHIFT_CUT_STORAGE_KEY);
  }, []);

  const validateShiftNotCut = useCallback(async () => {
    try {
      const session = await getOpenSession();

      // Validación defensiva: si no existe sesión activa o no tiene ID, asumimos que no hay corte efectuado.
      if (!session || !session.id) {
        setShiftAlreadyCut(false);
        updateLocalShiftCutFlag(false);
        return true;
      }

      const alreadyCut = await getShiftCutStatus({
        sessionId: session.id,
      });

      setShiftAlreadyCut(alreadyCut);
      updateLocalShiftCutFlag(alreadyCut);

      return !alreadyCut;
    } catch (error) {
      console.error("Error validando corte:", error);
      return false;
    }
  }, [getOpenSession, updateLocalShiftCutFlag]);

  const syncShiftCutStatus = useCallback(async () => {
    const localFlag = localStorage.getItem(SHIFT_CUT_STORAGE_KEY);

    if (localFlag === "true") {
      setShiftAlreadyCut(true);
    }

    if (!branchId || !userId) {
      setShiftAlreadyCut(false);
      return false;
    }

    return validateShiftNotCut();
  }, [branchId, userId, validateShiftNotCut]);

  /*
   * Restablece y sincroniza el estado cuando cambia
   * la sucursal o el usuario autenticado.
   */
  useEffect(() => {
    setShiftAlreadyCut(false);

    if (!enabled) {
      return undefined;
    }

    syncShiftCutStatus();

    return undefined;
  }, [enabled, branchId, userId, syncShiftCutStatus]);

  /*
   * Sincronización mediante eventos del navegador
   * y eventos internos de la aplicación.
   */
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const handleFocus = () => {
      syncShiftCutStatus();
    };

    const handleStorage = (event) => {
      if (event.key === SHIFT_CUT_STORAGE_KEY) {
        syncShiftCutStatus();
      }
    };

    const handleCutStatusChanged = () => {
      syncShiftCutStatus();
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorage);
    window.addEventListener(
      "shift-cut-status-changed",
      handleCutStatusChanged
    );

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(
        "shift-cut-status-changed",
        handleCutStatusChanged
      );
    };
  }, [enabled, syncShiftCutStatus]);

  /*
   * Escucha cambios en cortes y sesiones de caja.
   */
  useEffect(() => {
    if (!enabled || !branchId || !userId) {
      return undefined;
    }

    const scheduleRefresh = () => {
      if (realtimeTimerRef.current) {
        clearTimeout(realtimeTimerRef.current);
      }

      realtimeTimerRef.current = setTimeout(() => {
        syncShiftCutStatus();
      }, REALTIME_REFRESH_DELAY);
    };

    const channel = supabase
      .channel(`sales-cash-session-${branchId}-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cash_cuts",
          filter: `branch_id=eq.${branchId}`,
        },
        scheduleRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cash_register_sessions",
          filter: `branch_id=eq.${branchId}`,
        },
        scheduleRefresh
      )
      .subscribe();

    return () => {
      if (realtimeTimerRef.current) {
        clearTimeout(realtimeTimerRef.current);
        realtimeTimerRef.current = null;
      }

      supabase.removeChannel(channel);
    };
  }, [enabled, branchId, userId, syncShiftCutStatus]);

  return {
    shiftAlreadyCut,
    getOpenSession,
    validateShiftNotCut,
    syncShiftCutStatus,
  };
};

export default useSalesCashSession;