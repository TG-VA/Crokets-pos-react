import { useCallback, useEffect, useState } from "react";

// Frecuencia de sondeo del estado cuando el proceso principal no empuja eventos.
export const STATUS_POLL_INTERVAL_MS = 30000;

const EMPTY_STATUS = { available: false, downloaded: false, version: null };

const getElectronApi = () => {
  const api = window?.electronAPI;
  return api && typeof api.invoke === "function" ? api : null;
};

const normalizeStatus = (status) => ({
  available: Boolean(status?.available),
  downloaded: Boolean(status?.downloaded),
  version: status?.version ?? null,
});

/**
 * Estado de las auto-actualizaciones desatendidas del proceso principal.
 *
 * Consulta la version instalada y el estado de la actualizacion al montar,
 * escucha las notificaciones push del proceso principal y, si el preload no
 * expone listener, degrada a sondeo periodico. Fuera de Electron (navegador o
 * tests) devuelve el estado inicial sin romper el render.
 *
 * @param {object} [options]
 * @param {number} [options.statusPollIntervalMs] - Intervalo de sondeo en ms.
 * @returns {{
 *   appVersion: string|null,
 *   updateReady: boolean,
 *   newVersion: string|null,
 *   installUpdate: () => Promise<object>
 * }}
 */
const useAppUpdater = ({
  statusPollIntervalMs = STATUS_POLL_INTERVAL_MS,
} = {}) => {
  const [appVersion, setAppVersion] = useState(null);
  const [status, setStatus] = useState(EMPTY_STATUS);

  useEffect(() => {
    const api = getElectronApi();
    if (!api) return;

    let isActive = true;

    api
      .invoke("get-app-version")
      .then((version) => {
        if (isActive) setAppVersion(version ?? null);
      })
      .catch((error) => {
        console.error("Error obteniendo la version de la aplicacion:", error);
      });

    const fetchStatus = () =>
      api
        .invoke("get-update-status")
        .then((next) => {
          if (isActive) setStatus(normalizeStatus(next));
        })
        .catch((error) => {
          console.error("Error consultando el estado de actualizacion:", error);
        });

    fetchStatus();

    const subscribe = api.on;
    const canSubscribe = typeof subscribe === "function";
    const unsubscribe = canSubscribe
      ? subscribe("update-status", (payload) => {
          if (isActive) setStatus(normalizeStatus(payload));
        })
      : null;

    const intervalId = canSubscribe
      ? null
      : setInterval(fetchStatus, statusPollIntervalMs);

    return () => {
      isActive = false;
      if (typeof unsubscribe === "function") unsubscribe();
      if (intervalId) clearInterval(intervalId);
    };
  }, [statusPollIntervalMs]);

  const installUpdate = useCallback(async () => {
    const api = getElectronApi();
    if (!api) {
      return {
        success: false,
        message: "Las actualizaciones no estan disponibles.",
      };
    }

    try {
      return await api.invoke("quit-and-install-update");
    } catch (error) {
      console.error(
        "Error al reiniciar para instalar la actualizacion:",
        error
      );
      return {
        success: false,
        error: error?.message || "INSTALL_UPDATE_FAILED",
      };
    }
  }, []);

  return {
    appVersion,
    updateReady: status.downloaded,
    newVersion: status.version,
    installUpdate,
  };
};

export default useAppUpdater;
