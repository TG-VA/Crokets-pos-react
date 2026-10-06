import { supabase } from "../lib/supabaseClient";

/**
 * Información operativa de la terminal: código del dispositivo, estado de la
 * conexión con Supabase y control de zoom de la ventana.
 *
 * Cada función devuelve un contrato `{ success, ...data, error }` y nunca lanza,
 * para que la vista solo pinte estados. Los fallos se registran con
 * `console.error` para trazabilidad en producción.
 */

const hasElectronBridge = () =>
  typeof window !== "undefined" &&
  typeof window.electronAPI?.invoke === "function";

export const fetchDeviceCode = async () => {
  if (!hasElectronBridge()) {
    return {
      success: false,
      deviceCode: null,
      error:
        "El código del dispositivo solo está disponible en la aplicación de escritorio.",
    };
  }

  try {
    const result = await window.electronAPI.invoke("get-device-code");

    return {
      success: true,
      deviceCode: result?.deviceCode || null,
      error: null,
    };
  } catch (error) {
    console.error("Error obteniendo el código del dispositivo:", error);

    return {
      success: false,
      deviceCode: null,
      error: error.message || "No se pudo leer el código del dispositivo.",
    };
  }
};

export const checkSupabaseConnection = async () => {
  try {
    const { error } = await supabase.from("users").select("id").limit(1);

    if (error) throw error;

    return { success: true, connected: true, error: null };
  } catch (error) {
    console.error("Error verificando la conexión con Supabase:", error);

    return {
      success: false,
      connected: false,
      error: error.message || "Sin conexión con Supabase.",
    };
  }
};

export const clampZoomFactor = (value, min = 0.5, max = 2) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return 1;

  return Math.min(max, Math.max(min, Math.round(parsed * 100) / 100));
};

export const readZoomFactor = async () => {
  if (!hasElectronBridge()) {
    return { success: false, zoomFactor: null, error: null };
  }

  try {
    const result = await window.electronAPI.invoke("get-zoom-debug");

    return {
      success: true,
      zoomFactor:
        typeof result?.zoomFactor === "number"
          ? clampZoomFactor(result.zoomFactor)
          : 1,
      error: null,
    };
  } catch (error) {
    console.error("Error leyendo el zoom de la ventana:", error);

    return { success: false, zoomFactor: null, error: error.message };
  }
};

export const applyZoomFactor = async (zoomFactor) => {
  if (!hasElectronBridge()) {
    return {
      success: false,
      zoomFactor: null,
      error:
        "El control de zoom solo está disponible en la aplicación de escritorio.",
    };
  }

  try {
    const nextFactor = clampZoomFactor(zoomFactor);
    const result = await window.electronAPI.invoke(
      "set-zoom-factor",
      nextFactor
    );

    if (result?.success === false) {
      return {
        success: false,
        zoomFactor: null,
        error: result.message || "No se pudo aplicar el zoom.",
      };
    }

    return { success: true, zoomFactor: nextFactor, error: null };
  } catch (error) {
    console.error("Error aplicando el zoom de la ventana:", error);

    return { success: false, zoomFactor: null, error: error.message };
  }
};

export const resetZoom = async () => {
  if (!hasElectronBridge()) {
    return {
      success: false,
      zoomFactor: null,
      error:
        "El control de zoom solo está disponible en la aplicación de escritorio.",
    };
  }

  try {
    await window.electronAPI.invoke("reset-zoom");

    return { success: true, zoomFactor: 1, error: null };
  } catch (error) {
    console.error("Error restableciendo el zoom de la ventana:", error);

    return { success: false, zoomFactor: null, error: error.message };
  }
};
