const { contextBridge, ipcRenderer } = require('electron');

// Lista blanca de canales permitidos

// Canales permitidos para comunicación bidireccional (solicitud-respuesta).
const allowedInvokeChannels = ['set-initial-cash', 'check-cash-register', 'close-cash-register', 'login','get-device-code'];

// Canales permitidos para enviar mensajes al proceso principal (una sola vía).
const allowedSendChannels = ['log-message', 'window-action'];

// Canales a los que el proceso de renderizado puede escuchar.
const allowedOnChannels = ['update-available', 'print-request'];

//API expuesta al proceso de renderizado
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
  },
    /**
   * Manejador de IPC `send` para mensajes de una sola vía.
   * Si el canal no está permitido, solo emite una advertencia.
   */
  send: (channel, data) => {
    if (allowedSendChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    } else {
      console.warn(`Blocked send to channel: ${channel}`);
    }
  },
   /**
   * Manejador de IPC `on` para escuchar eventos del proceso principal.
   * Si el canal no está permitido, también emite una advertencia.
   */
  on: (channel, func) => {
    if (allowedOnChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    } else {
      console.warn(`Blocked listener for channel: ${channel}`);
    }
  }
});