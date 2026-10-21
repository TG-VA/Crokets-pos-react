import path from "node:path";
import { describe, it, expect, vi } from "vitest";

import {
  DEFAULT_PULSE_COOLDOWN_MS,
  DRAWER_PINS,
  PULSE_BYTES,
  REALTIME_PULSE_BYTES,
  buildPulseCommand,
  buildRealtimePulseCommand,
  buildWindowsRawSendScript,
  createCashDrawerService,
  isValidPrinterName,
} from "./cashDrawerService";

const createFs = (overrides = {}) => ({
  mkdtemp: vi.fn((prefix) => Promise.resolve(`${prefix}abc123`)),
  writeFile: vi.fn(() => Promise.resolve()),
  rm: vi.fn(() => Promise.resolve()),
  ...overrides,
});

const createService = (deps = {}) =>
  createCashDrawerService({
    execFile: vi.fn(() => Promise.resolve({ stdout: "" })),
    fs: createFs(),
    tmpdir: () => "/tmp",
    platform: "darwin",
    env: {},
    ...deps,
  });

describe("cashDrawerService", () => {
  describe("generacion de comandos ESC/POS", () => {
    it("construye el pulso del pin 2 (selector 0) como ESC p 0 25 250", () => {
      expect(buildPulseCommand(0)).toEqual(
        Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa])
      );
    });

    it("construye el pulso del pin 5 (selector 1) como ESC p 1 25 250", () => {
      expect(buildPulseCommand(1)).toEqual(
        Buffer.from([0x1b, 0x70, 0x01, 0x19, 0xfa])
      );
    });

    it("usa el pin 2 por defecto cuando no se especifica", () => {
      expect(buildPulseCommand()).toEqual(buildPulseCommand(0));
      expect(buildPulseCommand(null)).toEqual(buildPulseCommand(0));
      expect(buildPulseCommand("")).toEqual(buildPulseCommand(0));
    });

    it("rechaza pines fuera del contrato 0/1", () => {
      expect(buildPulseCommand(2)).toBeNull();
      expect(buildPulseCommand(-1)).toBeNull();
      expect(buildPulseCommand("x")).toBeNull();
      expect(buildPulseCommand(1.5)).toBeNull();
    });

    it("construye el pulso en tiempo real DLE DC4", () => {
      expect(buildRealtimePulseCommand()).toEqual(
        Buffer.from([0x10, 0x14, 0x01, 0x00, 0x01])
      );
    });

    it("expone las secuencias congeladas en las constantes publicas", () => {
      expect(DRAWER_PINS).toEqual({ PIN_2: 0, PIN_5: 1 });
      expect(PULSE_BYTES[0]).toEqual([0x1b, 0x70, 0x00, 0x19, 0xfa]);
      expect(PULSE_BYTES[1]).toEqual([0x1b, 0x70, 0x01, 0x19, 0xfa]);
      expect(REALTIME_PULSE_BYTES).toEqual([0x10, 0x14, 0x01, 0x00, 0x01]);
    });
  });

  describe("buildWindowsRawSendScript", () => {
    it("incrusta el payload en base64 y el nombre escapado", () => {
      const script = buildWindowsRawSendScript(
        "O'Brien Thermic",
        Buffer.from([0x1b, 0x70])
      );

      expect(script).toContain("winspool.drv");
      expect(script).toContain(
        `[Convert]::FromBase64String('${Buffer.from([0x1b, 0x70]).toString(
          "base64"
        )}')`
      );
      expect(script).toContain("'O''Brien Thermic'");
    });
  });

  describe("validacion de destino", () => {
    it("falla honradamente cuando no se indica impresora", async () => {
      const { openCashDrawer } = createService();

      await expect(openCashDrawer({})).resolves.toEqual({
        success: false,
        error: "PRINTER_NOT_FOUND",
        message:
          "No se especificó una impresora para abrir el cajón de dinero.",
      });
    });

    it("falla ante un pin invalido sin tocar el spooler", async () => {
      const execFile = vi.fn(() => Promise.resolve({ stdout: "" }));
      const { openCashDrawer } = createService({ execFile });

      await expect(
        openCashDrawer({ printerDeviceName: "Termica", pin: 4 })
      ).resolves.toMatchObject({ success: false, error: "INVALID_PIN" });
      expect(execFile).not.toHaveBeenCalled();
    });

    it("rechaza plataformas no soportadas", async () => {
      const { openCashDrawer } = createService({ platform: "aix" });

      await expect(
        openCashDrawer({ printerDeviceName: "Termica" })
      ).resolves.toMatchObject({
        success: false,
        error: "UNSUPPORTED_PLATFORM",
      });
    });

    it("rechaza nombres de impresora con inyeccion de argumentos (dash inicial)", async () => {
      const execFile = vi.fn(() => Promise.resolve({ stdout: "" }));
      const { openCashDrawer } = createService({ execFile });

      await expect(
        openCashDrawer({ printerDeviceName: "-o" })
      ).resolves.toMatchObject({
        success: false,
        error: "PRINTER_NOT_FOUND",
      });
      expect(execFile).not.toHaveBeenCalled();
    });

    it("rechaza nombres con caracteres de control sin tocar el spooler", async () => {
      const execFile = vi.fn(() => Promise.resolve({ stdout: "" }));
      const { openCashDrawer } = createService({ execFile });

      await expect(
        openCashDrawer({ printerDeviceName: "Termica\u0007" })
      ).resolves.toMatchObject({
        success: false,
        error: "PRINTER_NOT_FOUND",
      });
      expect(execFile).not.toHaveBeenCalled();
    });
  });

  describe("isValidPrinterName", () => {
    it("acepta nombres de impresora razonables", () => {
      expect(isValidPrinterName("Termica")).toBe(true);
      expect(isValidPrinterName("Epson TM-T20 III")).toBe(true);
      expect(isValidPrinterName("O'Brien")).toBe(true);
    });

    it("rechaza vacios, dash inicial, controles y valores no string", () => {
      expect(isValidPrinterName("")).toBe(false);
      expect(isValidPrinterName("-o")).toBe(false);
      expect(isValidPrinterName("--foo")).toBe(false);
      expect(isValidPrinterName("a\u0000b")).toBe(false);
      expect(isValidPrinterName("x".repeat(256))).toBe(false);
      expect(isValidPrinterName(undefined)).toBe(false);
      expect(isValidPrinterName(123)).toBe(false);
    });
  });

  describe("simulacion de desarrollo", () => {
    it("no invoca el spooler cuando la simulacion esta activa", async () => {
      const execFile = vi.fn();
      const { openCashDrawer } = createService({
        execFile,
        env: { CROKETS_CASH_DRAWER_SIMULATE: "1" },
      });

      await expect(
        openCashDrawer({ printerDeviceName: "Termica" })
      ).resolves.toMatchObject({ success: true, simulated: true });
      expect(execFile).not.toHaveBeenCalled();
    });
  });

  describe("macOS / Linux", () => {
    it("escribe el archivo crudo y lo manda con lpr -l", async () => {
      const execFile = vi.fn((_command, _args) => {
        if (_command === "lpstat") return Promise.resolve({ stdout: "ok" });
        return Promise.resolve({ stdout: "" });
      });
      const fs = createFs();
      const { openCashDrawer } = createService({
        execFile,
        fs,
        platform: "darwin",
      });

      await expect(
        openCashDrawer({ printerDeviceName: "Termica", pin: 1 })
      ).resolves.toEqual({
        success: true,
        error: null,
        message: "Pulso de apertura enviado al cajón de dinero.",
      });

      const expectedDir = path.join("/tmp", "crokets-cash-drawer-abc123");
      const expectedPulseFile = path.join(expectedDir, "pulse.bin");

      expect(execFile).toHaveBeenCalledWith(
        "lpstat",
        ["-p", "Termica"],
        expect.any(Object)
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        expectedPulseFile,
        Buffer.from([0x1b, 0x70, 0x01, 0x19, 0xfa])
      );
      expect(execFile).toHaveBeenCalledWith(
        "lpr",
        ["-l", "-P", "Termica", expectedPulseFile],
        expect.any(Object)
      );
      expect(fs.rm).toHaveBeenCalledWith(expectedDir, {
        recursive: true,
        force: true,
      });
    });

    it("falla con PRINTER_NOT_FOUND cuando lpstat no conoce la impresora", async () => {
      const execFile = vi.fn((command) => {
        if (command === "lpstat") {
          const error = new Error("lpstat failed");
          error.code = 1;
          return Promise.reject(error);
        }
        return Promise.resolve({ stdout: "" });
      });
      const fs = createFs();
      const { openCashDrawer } = createService({ execFile, fs });

      await expect(
        openCashDrawer({ printerDeviceName: "Fantasma" })
      ).resolves.toMatchObject({
        success: false,
        error: "PRINTER_NOT_FOUND",
      });
      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it("reporta SPOOLER_UNAVAILABLE cuando CUPS no esta instalado", async () => {
      const execFile = vi.fn(() => {
        const error = new Error("not found");
        error.code = "ENOENT";
        return Promise.reject(error);
      });
      const { openCashDrawer } = createService({ execFile });

      await expect(
        openCashDrawer({ printerDeviceName: "Termica" })
      ).resolves.toMatchObject({
        success: false,
        error: "SPOOLER_UNAVAILABLE",
      });
    });

    it("falla y limpia el temporal cuando lpr rechaza el trabajo", async () => {
      const execFile = vi.fn((command) => {
        if (command === "lpstat") return Promise.resolve({ stdout: "ok" });
        return Promise.reject(new Error("lpr rejected"));
      });
      const fs = createFs();
      const { openCashDrawer } = createService({ execFile, fs });

      await expect(
        openCashDrawer({ printerDeviceName: "Termica" })
      ).resolves.toMatchObject({
        success: false,
        error: "DRAWER_PULSE_FAILED",
      });
      expect(fs.rm).toHaveBeenCalled();
    });
  });

  describe("Windows", () => {
    const windowsExec = (printers) =>
      vi.fn((_command, args) => {
        const script = args?.[args.length - 1] || "";
        if (script.includes("Get-Printer")) {
          return Promise.resolve({ stdout: printers.join("\r\n") });
        }
        return Promise.resolve({ stdout: "" });
      });

    it("verifica la existencia en el spooler y envia el pulso crudo", async () => {
      const execFile = windowsExec(["Termica", "PDF"]);
      const { openCashDrawer } = createService({
        execFile,
        platform: "win32",
      });

      await expect(
        openCashDrawer({ printerDeviceName: "Termica" })
      ).resolves.toEqual({
        success: true,
        error: null,
        message: "Pulso de apertura enviado al cajón de dinero.",
      });

      const sendCall = execFile.mock.calls.find(([, args = []]) =>
        (args[args.length - 1] || "").includes("FromBase64String")
      );
      expect(sendCall).toBeTruthy();
      expect(sendCall[0]).toBe("powershell.exe");
    });

    it("falla con PRINTER_NOT_FOUND si el spooler no lista la impresora", async () => {
      const execFile = windowsExec(["Otra"]);
      const { openCashDrawer } = createService({
        execFile,
        platform: "win32",
      });

      await expect(
        openCashDrawer({ printerDeviceName: "Termica" })
      ).resolves.toMatchObject({
        success: false,
        error: "PRINTER_NOT_FOUND",
      });
    });

    it("reporta SPOOLER_UNAVAILABLE si PowerShell falla al listar", async () => {
      const execFile = vi.fn(() =>
        Promise.reject(new Error("powershell down"))
      );
      const { openCashDrawer } = createService({
        execFile,
        platform: "win32",
      });

      await expect(
        openCashDrawer({ printerDeviceName: "Termica" })
      ).resolves.toMatchObject({
        success: false,
        error: "SPOOLER_UNAVAILABLE",
      });
    });

    it("falla si WritePrinter devuelve error", async () => {
      const execFile = vi.fn((command, args) => {
        const script = args?.[args.length - 1] || "";
        if (script.includes("Get-Printer")) {
          return Promise.resolve({ stdout: "Termica" });
        }
        return Promise.reject(new Error("exit 1"));
      });
      const { openCashDrawer } = createService({
        execFile,
        platform: "win32",
      });

      await expect(
        openCashDrawer({ printerDeviceName: "Termica" })
      ).resolves.toMatchObject({
        success: false,
        error: "DRAWER_PULSE_FAILED",
      });
    });
  });

  describe("manejo de excepciones", () => {
    it("nunca propaga errores no controlados", async () => {
      const execFile = vi.fn(() => {
        throw new Error("boom sincrono");
      });
      const { openCashDrawer } = createService({ execFile });

      await expect(
        openCashDrawer({ printerDeviceName: "Termica" })
      ).resolves.toMatchObject({ success: false });
    });
  });

  describe("proteccion de hardware: mutex y cooldown", () => {
    const posixExec = () =>
      vi.fn((command) => {
        if (command === "lpstat") return Promise.resolve({ stdout: "ok" });
        return Promise.resolve({ stdout: "" });
      });

    it("expone el cooldown por defecto de 2 segundos", () => {
      expect(DEFAULT_PULSE_COOLDOWN_MS).toBe(2000);
    });

    it("descarta pulsos consecutivos dentro del cooldown sin invocar el spooler", async () => {
      let currentTime = 1000000;
      const execFile = posixExec();
      const { openCashDrawer } = createService({
        execFile,
        now: () => currentTime,
      });

      await expect(
        openCashDrawer({ printerDeviceName: "Termica" })
      ).resolves.toMatchObject({ success: true });
      expect(execFile).toHaveBeenCalledTimes(2);

      currentTime += 1500;

      const second = await openCashDrawer({ printerDeviceName: "Termica" });
      expect(second).toMatchObject({ success: true, throttled: true });
      expect(second.error).toBeNull();
      expect(execFile).toHaveBeenCalledTimes(2);
    });

    it("permite un nuevo pulso cuando el cooldown ya expiro", async () => {
      let currentTime = 1000000;
      const execFile = posixExec();
      const { openCashDrawer } = createService({
        execFile,
        now: () => currentTime,
      });

      await openCashDrawer({ printerDeviceName: "Termica" });

      currentTime += DEFAULT_PULSE_COOLDOWN_MS;

      await expect(
        openCashDrawer({ printerDeviceName: "Termica" })
      ).resolves.toEqual({
        success: true,
        error: null,
        message: "Pulso de apertura enviado al cajón de dinero.",
      });
      expect(execFile).toHaveBeenCalledTimes(4);
    });

    it("descarta pulsos concurrentes mientras hay un pulso en vuelo", async () => {
      let releasePulse;
      const pulseGate = new Promise((resolve) => {
        releasePulse = resolve;
      });
      const execFile = vi.fn((command) => {
        if (command === "lpstat") return Promise.resolve({ stdout: "ok" });
        return pulseGate;
      });
      const { openCashDrawer } = createService({ execFile });

      const firstPulse = openCashDrawer({ printerDeviceName: "Termica" });
      const concurrent = await openCashDrawer({
        printerDeviceName: "Termica",
      });

      expect(concurrent).toMatchObject({
        success: true,
        throttled: true,
        message: "El cajón de dinero ya se está abriendo.",
      });
      expect(execFile).toHaveBeenCalledTimes(1);

      releasePulse({ stdout: "" });
      await expect(firstPulse).resolves.toMatchObject({ success: true });
      expect(execFile).toHaveBeenCalledTimes(2);
    });

    it("no inicia el cooldown cuando el pulso llega fallido", async () => {
      let currentTime = 1000000;
      const execFile = vi.fn((command) => {
        if (command === "lpstat") {
          const error = new Error("lpstat failed");
          error.code = 1;
          return Promise.reject(error);
        }
        return Promise.resolve({ stdout: "" });
      });
      const { openCashDrawer } = createService({
        execFile,
        now: () => currentTime,
      });

      await expect(
        openCashDrawer({ printerDeviceName: "Fantasma" })
      ).resolves.toMatchObject({ success: false });

      const second = await openCashDrawer({ printerDeviceName: "Fantasma" });
      expect(second).toMatchObject({ success: false });
      expect(second.throttled).toBeUndefined();
    });
  });
});
