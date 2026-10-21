/**
 * Servicio de hardware para la gaveta de dinero (proceso principal de Electron).
 *
 * Vive aparte de `mainProcess.js` y de `ticketPrintService.js` por SRP: aqui esta
 * unicamente el ciclo de vida del pulso electrico del cajon. Chromium solo puede
 * imprimir HTML/GDI mediante `webContents.print`, que no transporta secuencias
 * binarias ESC/POS, por lo que el pulso se escribe crudo en la cola de impresion
 * del sistema operativo:
 *
 * - Windows: `winspool.drv` invocado desde PowerShell (`Add-Type` + P/Invoke). No
 *   requiere dependencias nativas de Node ni compilacion con node-gyp.
 * - macOS / Linux: `lpr -l` sobre un archivo temporal con los bytes crudos.
 *
 * Todas las dependencias externas (`execFile`, `fs`, `tmpdir`, `platform`,
 * `env`, `now`) se inyectan para poder probar el flujo completo sin hardware
 * conectado y sin ejecutar comandos reales del sistema.
 */

const { execFile: execFileCallback } = require("node:child_process");
const fsPromises = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { promisify } = require("node:util");

const EXEC_OPTIONS = Object.freeze({
  timeout: 10000,
  maxBuffer: 1024 * 1024,
  windowsHide: true,
});

const TEMP_DIR_PREFIX = "crokets-cash-drawer-";
const TEMP_PULSE_FILENAME = "pulse.bin";
const SIMULATION_ENV_VAR = "CROKETS_CASH_DRAWER_SIMULATE";

/**
 * Enfriamiento minimo entre pulsos exitosos. El solenoide del cajon es una
 * bobina electrica de 24V: pulsos demasiado frecuentes lo recalentarian y
 * pueden danar el transistor del puerto RJ11 de la impresora.
 */
const DEFAULT_PULSE_COOLDOWN_MS = 2000;

const PULSE_IN_FLIGHT_MESSAGE = "El cajón de dinero ya se está abriendo.";
const PULSE_COOLDOWN_MESSAGE =
  "El cajón de dinero está en periodo de enfriamiento; vuelve a intentarlo en unos segundos.";

const DRAWER_PINS = Object.freeze({
  PIN_2: 0,
  PIN_5: 1,
});

/**
 * Secuencias ESC/POS `ESC p n t` para los dos pines documentados por Epson y
 * Xprinter. El pin fisico 2 corresponde al selector `0` y el pin 5 al selector `1`.
 */
const PULSE_BYTES = Object.freeze({
  [DRAWER_PINS.PIN_2]: Object.freeze([0x1b, 0x70, 0x00, 0x19, 0xfa]),
  [DRAWER_PINS.PIN_5]: Object.freeze([0x1b, 0x70, 0x01, 0x19, 0xfa]),
});

/**
 * Pulso en tiempo real `DLE DC4` (1, 0, 1): alternativa para impresoras que
 * atienden la gaveta sin pasar por el flujo normal de comandos.
 */
const REALTIME_PULSE_BYTES = Object.freeze([0x10, 0x14, 0x01, 0x00, 0x01]);

const WINDOWS_PRINTER_LIST_COMMAND = "Get-Printer | ForEach-Object { $_.Name }";

const WINDOWS_RAW_PRINTER_TYPE = `
using System;
using System.Runtime.InteropServices;

namespace CroketsPos
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public class DOCINFO1
    {
        [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
    }

    public static class RawPrinter
    {
        [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
        public static extern bool OpenPrinter(string printerName, out IntPtr printerHandle, IntPtr defaults);

        [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
        public static extern bool ClosePrinter(IntPtr printerHandle);

        [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
        public static extern int StartDocPrinter(IntPtr hPrinter, int level, [In] DOCINFO1 di);

        [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
        public static extern bool EndDocPrinter(IntPtr hPrinter);

        [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
        public static extern bool StartPagePrinter(IntPtr hPrinter);

        [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
        public static extern bool EndPagePrinter(IntPtr hPrinter);

        [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
        public static extern bool WritePrinter(IntPtr printerHandle, byte[] buffer, int count, out int written);

        public static bool Send(string printerName, byte[] data)
        {
            if (data == null || data.Length == 0) return false;
            IntPtr handle;
            if (!OpenPrinter(printerName, out handle, IntPtr.Zero)) return false;
            try
            {
                DOCINFO1 di = new DOCINFO1();
                di.pDocName = "Crokets Cash Drawer";
                di.pDataType = "RAW";
                if (StartDocPrinter(handle, 1, di) == 0) return false;
                try
                {
                    if (!StartPagePrinter(handle)) return false;
                    try
                    {
                        int written;
                        return WritePrinter(handle, data, data.Length, out written);
                    }
                    finally
                    {
                        EndPagePrinter(handle);
                    }
                }
                finally
                {
                    EndDocPrinter(handle);
                }
            }
            finally
            {
                ClosePrinter(handle);
            }
        }
    }
}
`;

const POSIX_PLATFORMS = Object.freeze(["darwin", "linux"]);

function failure(error, message) {
  return { success: false, error, message };
}

function success(message) {
  return { success: true, error: null, message };
}

/**
 * Respuesta segura ante un pulso descartado por proteccion de hardware: el
 * renderer no debe tratarlo como un fallo, pero tampoco debe reintentar de
 * inmediato.
 */
function throttled(message) {
  return { success: true, throttled: true, error: null, message };
}

/**
 * Normaliza el selector de pin. Sin valor se asume el pin 2 (selector `0`), que
 * es el cableado estandar de Epson y Xprinter. Cualquier otro valor es invalido
 * y se reporta como fallo honesto en lugar de adivinar el pin.
 */
function normalizePin(pin) {
  if (pin === undefined || pin === null || pin === "") {
    return DRAWER_PINS.PIN_2;
  }
  const parsed = Number(pin);
  if (!Number.isInteger(parsed)) return null;
  if (parsed !== DRAWER_PINS.PIN_2 && parsed !== DRAWER_PINS.PIN_5) return null;
  return parsed;
}

function buildPulseCommand(pin) {
  const normalized = normalizePin(pin);
  if (normalized === null) return null;
  return Buffer.from(PULSE_BYTES[normalized]);
}

function buildRealtimePulseCommand() {
  return Buffer.from(REALTIME_PULSE_BYTES);
}

function isSimulationEnabled(env) {
  return Boolean(env) && env[SIMULATION_ENV_VAR] === "1";
}

function normalizePrinterName(value) {
  return typeof value === "string" ? value.replace(/[\r\n]/g, "").trim() : "";
}

/**
 * Valida el nombre de impresora que llega del renderer por IPC.
 *
 * `execFile` ya evita la inyeccion por shell (los argumentos no pasan por un
 * interprete), pero un nombre que empiece con `-` se interpretaria como una
 * opcion de `lpr`/`lpstat` (argument injection) y un nombre vacio o con
 * caracteres de control no tiene sentido. Se rechaza ese conjunto y se exige un
 * charset razonable para nombres de cola de impresion de Windows y CUPS.
 */
function isValidPrinterName(name) {
  if (typeof name !== "string" || name.length === 0 || name.length > 255) {
    return false;
  }
  if (name.startsWith("-")) return false;
  for (let index = 0; index < name.length; index += 1) {
    const code = name.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) return false;
  }
  return true;
}

function parsePrinterNames(stdout) {
  return String(stdout || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function quotePowerShellString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * Construye el script de PowerShell que envia `payload` crudo a la cola de
 * impresion de Windows. Los bytes viajan en base64 para no depender de como el
 * shell interprete caracteres de control.
 */
function buildWindowsRawSendScript(printerName, payload) {
  const encoded = payload.toString("base64");
  return [
    `Add-Type -TypeDefinition @'\n${WINDOWS_RAW_PRINTER_TYPE}\n'@`,
    `$bytes = [Convert]::FromBase64String('${encoded}')`,
    `if (-not [CroketsPos.RawPrinter]::Send(${quotePowerShellString(
      printerName
    )}, $bytes)) { exit 1 }`,
  ].join("\n");
}

async function listWindowsPrinters(execFile) {
  const { stdout } = await execFile(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", WINDOWS_PRINTER_LIST_COMMAND],
    EXEC_OPTIONS
  );
  return parsePrinterNames(stdout);
}

async function sendOnWindows(execFile, printerName, payload) {
  let printers;
  try {
    printers = await listWindowsPrinters(execFile);
  } catch (error) {
    console.error("No se pudo consultar el spooler de Windows:", error);
    return failure(
      "SPOOLER_UNAVAILABLE",
      "No se pudo consultar el spooler de impresión de Windows."
    );
  }

  const target = printerName.toLowerCase();
  const exists = printers.some((name) => name.toLowerCase() === target);
  if (!exists) {
    return failure(
      "PRINTER_NOT_FOUND",
      "La impresora seleccionada no está disponible para abrir el cajón de dinero."
    );
  }

  try {
    await execFile(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        buildWindowsRawSendScript(printerName, payload),
      ],
      EXEC_OPTIONS
    );
  } catch (error) {
    console.error("El spooler de Windows rechazo el pulso del cajon:", error);
    return failure(
      "DRAWER_PULSE_FAILED",
      "El spooler de impresión rechazó el pulso de apertura del cajón de dinero."
    );
  }

  return success("Pulso de apertura enviado al cajón de dinero.");
}

async function checkPosixPrinter(execFile, printerName) {
  try {
    await execFile("lpstat", ["-p", printerName], EXEC_OPTIONS);
    return { exists: true, spoolerUnavailable: false };
  } catch (error) {
    return {
      exists: false,
      spoolerUnavailable: error?.code === "ENOENT",
    };
  }
}

async function sendOnPosix({ execFile, fs, tmpdir, printerName, payload }) {
  const status = await checkPosixPrinter(execFile, printerName);
  if (status.spoolerUnavailable) {
    return failure(
      "SPOOLER_UNAVAILABLE",
      "No se encontró el sistema de impresión (CUPS) para abrir el cajón de dinero."
    );
  }
  if (!status.exists) {
    return failure(
      "PRINTER_NOT_FOUND",
      "La impresora seleccionada no está disponible para abrir el cajón de dinero."
    );
  }

  let tempDir = null;
  try {
    tempDir = await fs.mkdtemp(path.join(tmpdir(), TEMP_DIR_PREFIX));
    const pulseFile = path.join(tempDir, TEMP_PULSE_FILENAME);
    await fs.writeFile(pulseFile, payload);
    await execFile("lpr", ["-l", "-P", printerName, pulseFile], EXEC_OPTIONS);
  } catch (error) {
    console.error("No se pudo enviar el pulso crudo a la impresora:", error);
    return failure(
      "DRAWER_PULSE_FAILED",
      "No se pudo enviar el pulso de apertura a la impresora seleccionada."
    );
  } finally {
    if (tempDir && typeof fs.rm === "function") {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (error) {
        console.error(
          "No se pudo limpiar el archivo temporal del cajón:",
          error
        );
      }
    }
  }

  return success("Pulso de apertura enviado al cajón de dinero.");
}

/**
 * Fabrica el servicio con dependencias inyectables. Devuelve `openCashDrawer`,
 * que siempre resuelve el contrato `{ success, message, error, simulated?,
 * throttled? }`: nunca propaga excepciones al canal IPC.
 *
 * Proteccion de hardware de dos niveles:
 * - Mutex (`isPulseInFlight`): descarta llamadas concurrentes mientras un
 *   pulso sigue en camino al spooler.
 * - Cooldown (`lastPulseTimestamp`): descarta pulsos nuevos dentro de la
 *   ventana de enfriamiento del solenoide.
 *
 * El reloj se inyecta via `now` para poder probar el flujo de forma
 * determinista sin timers reales.
 */
function createCashDrawerService(deps = {}) {
  const execFile = deps.execFile ?? promisify(execFileCallback);
  const fs = deps.fs ?? fsPromises;
  const tmpdir = deps.tmpdir ?? (() => os.tmpdir());
  const platform = deps.platform ?? process.platform;
  const env = deps.env ?? process.env;
  const now = deps.now ?? (() => Date.now());
  const pulseCooldownMs = deps.pulseCooldownMs ?? DEFAULT_PULSE_COOLDOWN_MS;

  let isPulseInFlight = false;
  let lastPulseTimestamp = null;

  async function openCashDrawer({
    printerDeviceName,
    pin,
    realtime = false,
  } = {}) {
    const printerName = normalizePrinterName(printerDeviceName);

    if (!printerName) {
      return failure(
        "PRINTER_NOT_FOUND",
        "No se especificó una impresora para abrir el cajón de dinero."
      );
    }

    if (!isValidPrinterName(printerName)) {
      return failure(
        "PRINTER_NOT_FOUND",
        "El nombre de la impresora no es válido para abrir el cajón de dinero."
      );
    }

    const payload = realtime
      ? buildRealtimePulseCommand()
      : buildPulseCommand(pin);

    if (!payload) {
      return failure(
        "INVALID_PIN",
        "El pin del cajón de dinero debe ser 0 (pin 2) o 1 (pin 5)."
      );
    }

    if (isPulseInFlight) {
      return throttled(PULSE_IN_FLIGHT_MESSAGE);
    }

    if (
      lastPulseTimestamp !== null &&
      now() - lastPulseTimestamp < pulseCooldownMs
    ) {
      return throttled(PULSE_COOLDOWN_MESSAGE);
    }

    isPulseInFlight = true;
    try {
      if (isSimulationEnabled(env)) {
        lastPulseTimestamp = now();
        return {
          success: true,
          simulated: true,
          error: null,
          message:
            "Pulso de apertura simulado (entorno de desarrollo, sin hardware).",
        };
      }

      let result;
      if (platform === "win32") {
        result = await sendOnWindows(execFile, printerName, payload);
      } else if (POSIX_PLATFORMS.includes(platform)) {
        result = await sendOnPosix({
          execFile,
          fs,
          tmpdir,
          printerName,
          payload,
        });
      } else {
        result = failure(
          "UNSUPPORTED_PLATFORM",
          "La apertura de cajón no está soportada en este sistema operativo."
        );
      }

      if (result.success) {
        lastPulseTimestamp = now();
      }
      return result;
    } catch (error) {
      console.error("Error inesperado enviando el pulso del cajón:", error);
      return failure(
        "DRAWER_PULSE_FAILED",
        "No se pudo enviar el pulso de apertura al cajón de dinero."
      );
    } finally {
      isPulseInFlight = false;
    }
  }

  return { openCashDrawer };
}

const defaultService = createCashDrawerService();

module.exports = {
  DEFAULT_PULSE_COOLDOWN_MS,
  DRAWER_PINS,
  PULSE_BYTES,
  REALTIME_PULSE_BYTES,
  buildPulseCommand,
  buildRealtimePulseCommand,
  buildWindowsRawSendScript,
  createCashDrawerService,
  isValidPrinterName,
  openCashDrawer: defaultService.openCashDrawer,
};
