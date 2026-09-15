const { contextBridge, ipcRenderer } = require('electron');

// Lista blanca de canales permitidos para comunicación bidireccional (solicitud-respuesta).
// Debe reflejar exactamente los ipcMain.handle registrados en electron/main.js.
const allowedInvokeChannels = [
  'get-device-code',
  'close-app',
  'set-zoom-factor',
  'configure-zoom',
  'reset-zoom',
  'get-zoom-debug'
];

// API expuesta al proceso de renderizado
contextBridge.exposeInMainWorld('electronAPI', {
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
  }
});
