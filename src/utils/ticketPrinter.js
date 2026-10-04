/**
 * Puente de impresion entre el renderer y el proceso principal de Electron.
 *
 * El canal `print-ticket` lo registra `electron/mainProcess.js` y su lista blanca vive en
 * `electron/preload.js`. El servicio no conoce Electron: solo detecta si la API de contexto
 * esta expuesta y normaliza cualquier resultado al contrato `{ success, message, error?,
 * simulated }`.
 *
 * `simulated` distingue "imprimio en el sistema" de "solo se genero el texto": en un navegador
 * de desarrollo no hay proceso principal, asi que el fallback reporta la simulacion en vez de
 * fingir un trabajo de impresion.
 */

const PRINT_TICKET_CHANNEL = "print-ticket";

const DEFAULT_FAILURE_MESSAGE = "No se pudo imprimir el ticket.";
const DEFAULT_UNKNOWN_ERROR = "UNKNOWN_PRINT_ERROR";

const SIMULATED_MESSAGE =
  "Ticket generado correctamente. La impresion no esta disponible fuera de Electron.";

function hasElectronBridge() {
  return (
    typeof window !== "undefined" &&
    typeof window.electronAPI?.invoke === "function"
  );
}

/**
 * Imprime el ticket ya formateado.
 *
 * Nunca lanza: cualquier fallo del canal, del driver o del contrato llega al llamador como
 * `{ success: false, message, error }` para que los tres call sites puedan reportarlo.
 */
export const printTicket = async (ticketText, options = {}) => {
  if (!hasElectronBridge()) {
    return { success: true, simulated: true, message: SIMULATED_MESSAGE };
  }

  try {
    const result = await window.electronAPI.invoke(PRINT_TICKET_CHANNEL, {
      ticketText,
      options,
    });

    if (!result?.success) {
      return {
        success: false,
        simulated: false,
        message: result?.message || DEFAULT_FAILURE_MESSAGE,
        error: result?.error || DEFAULT_UNKNOWN_ERROR,
      };
    }

    return {
      success: true,
      simulated: false,
      message: result.message || "Ticket impreso correctamente.",
    };
  } catch (error) {
    return {
      success: false,
      simulated: false,
      message: DEFAULT_FAILURE_MESSAGE,
      error: error?.message || DEFAULT_UNKNOWN_ERROR,
    };
  }
};
