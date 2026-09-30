import { useCallback, useEffect, useRef, useState } from "react";

import { supabase } from "../../../lib/supabaseClient";
import { useDidChange } from "../../../hooks/useDidChange";

import {
  getOpenCashSession as getOpenCashSessionFromService,
  resolveShiftCutStatus,
} from "../services/salesCashService";

const SHIFT_CUT_STORAGE_KEY = "shift_cut_done";
const REALTIME_REFRESH_DELAY = 400;

const useSalesCashSession = ({ branchId, userId, enabled = true }) => {
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
      const alreadyCut = await resolveShiftCutStatus({ branchId, userId });

      setShiftAlreadyCut(alreadyCut);
      updateLocalShiftCutFlag(alreadyCut);

      return !alreadyCut;
    } catch (error) {
      console.error("Error validando corte:", error);
      return false;
    }
  }, [branchId, userId, updateLocalShiftCutFlag]);

  const syncShiftCutStatus = useCallback(async () => {
    if (!branchId || !userId) {
      return false;
    }

    return validateShiftNotCut();
  }, [branchId, userId, validateShiftNotCut]);

  /*
   * Restablece y sincroniza el estado cuando cambia
   * la sucursal o el usuario autenticado.
   *
   * El indicador se reinicia durante el render (mismas claves y mismas
   * dependencias que antes) para no encadenar un re-render adicional. Ademas
   * parte del valor guardado en localStorage, que antes se aplicaba con un
   * setState sincrono dentro del efecto: asi el corte ya registrado se sigue
   * viendo de inmediato, sin esa pasada extra. Sin sucursal o sin usuario no hay
   * turno que consultar, y el indicador queda en falso.
   */
  if (useDidChange(`${enabled}|${branchId}|${userId}`)) {
    setShiftAlreadyCut(
      enabled &&
        Boolean(branchId) &&
        Boolean(userId) &&
        localStorage.getItem(SHIFT_CUT_STORAGE_KEY) === "true"
    );
  }

  // El efecto llama directo a la funcion de servicio y escribe el estado en la
  // continuacion asincrona. `validateShiftNotCut` conserva el mismo trabajo para
  // los llamadores imperativos (eventos del navegador y refresco en tiempo real).
  useEffect(() => {
    if (!enabled || !branchId || !userId) {
      return undefined;
    }

    let cancelled = false;

    resolveShiftCutStatus({ branchId, userId })
      .then((alreadyCut) => {
        if (cancelled) return;
        setShiftAlreadyCut(alreadyCut);
        updateLocalShiftCutFlag(alreadyCut);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Error validando corte:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, branchId, userId, updateLocalShiftCutFlag]);

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
    window.addEventListener("shift-cut-status-changed", handleCutStatusChanged);

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
