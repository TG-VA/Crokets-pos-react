const { contextBridge, ipcRenderer } = require("electron");

// Lista blanca de canales permitidos para comunicación bidireccional (solicitud-respuesta).
// Debe reflejar exactamente los ipcMain.handle registrados en electron/mainProcess.js y
// electron/updaterService.js.
const allowedInvokeChannels = [
  "get-device-code",
  "close-app",
  "set-zoom-factor",
  "configure-zoom",
  "reset-zoom",
  "get-zoom-debug",
  "toggle-fullscreen",
  "get-printers",
  "print-ticket",
  "open-cash-drawer",
  "get-app-version",
  "check-for-updates",
  "get-update-status",
  "quit-and-install-update",
  "export-order-pdf",
];

// Canales push (proceso principal -> renderer) que el renderer puede escuchar.
const allowedListenerChannels = ["update-status"];

// API expuesta al proceso de renderizado
contextBridge.exposeInMainWorld("electronAPI", {
  /**
   * Manejador de IPC `invoke` para llamadas asíncronas.
   * Se comprueba si el canal está en la lista blanca antes de ejecutar.
   */
  invoke: (channel, data) => {
    if (allowedInvokeChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, data);
    }

    // Si el canal no está permitido, lanza un error para detener la ejecución.
    throw new Error(`Channel ${channel} is not allowed for invoke`);
  },

  /**
   * Suscripción a notificaciones del proceso principal.
   * Devuelve una función para cancelar la suscripción.
   */
  on: (channel, listener) => {
    if (!allowedListenerChannels.includes(channel)) {
      throw new Error(`Channel ${channel} is not allowed for listening`);
    }

    const subscription = (_event, payload) => listener(payload);
    ipcRenderer.on(channel, subscription);

    return () => ipcRenderer.removeListener(channel, subscription);
  },
});
