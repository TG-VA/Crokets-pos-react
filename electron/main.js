// Módulos de Electron y utilidades del sistema
const { app, BrowserWindow, ipcMain } = require('electron'); 
const path = require('path');
const isDev = require('electron-is-dev'); 

// Variable para la ventana principal
let mainWindow = null;

// Estado de la caja registradora
let cashRegisterState = {
  isOpen: false,
  initialAmount: 0,
  currentAmount: 0,
  startTime: null
};

function createMainWindow() {
  // Configuración de la ventana principal
  mainWindow = new BrowserWindow({
    webPreferences: {
      // Configuración de seguridad para la ventana de renderizado
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false
  });

  // Determina qué URL cargar según el entorno (desarrollo o producción)
  const appUrl = isDev
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, '../dist/index.html')}`;
  
  mainWindow.loadURL(appUrl);

  // Eventos de la ventana principal
  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
    mainWindow.setFullScreen(true); 
    if (process.platform === 'darwin') app.dock.show();
  });

  // Limpia la referencia a la ventana cuando se cierra
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Abrir DevTools en desarrollo
  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

// Manejadores de IPC 

// Abre la caja registradora con un monto inicial
ipcMain.handle('set-initial-cash', (event, amount) => {
  cashRegisterState = {
    isOpen: true,
    initialAmount: amount,
    currentAmount: amount,
    startTime: new Date()
  };
  
  return {
    success: true,
    message: `Caja abierta con $${amount.toFixed(2)}`
  };
});

// Devuelve el estado actual de la caja
ipcMain.handle('check-cash-register', () => {
  return cashRegisterState;
});

// Cierra la caja y reinicia su estado
ipcMain.handle('close-cash-register', () => {
  const result = {
    ...cashRegisterState,
    endTime: new Date()
  };

  // Reinicia el estado de la caja
  cashRegisterState = {
    isOpen: false,
    initialAmount: 0,
    currentAmount: 0,
    startTime: null
  };
  
  return result;
});

// Manejador de login con credenciales de prueba
ipcMain.handle('login', async (event, { username, password }) => {
  const validUsername = 'admin';
  const validPassword = '1234'; 

  if (username === validUsername && password === validPassword) {
    return { success: true, message: 'Login exitoso' };
  } else {
    return { success: false, message: 'Credenciales incorrectas' };
  }
});

// Manejo de eventos de la aplicación

// Cierra la aplicación cuando todas las ventanas están cerradas (excepto en macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Crea una ventana si la aplicación se activa y no hay ninguna abierta (solo en macOS)
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

// Crea la ventana principal cuando Electron está listo
app.whenReady().then(() => {
  createMainWindow();
});