import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useSettingsPrinters } from "./useSettingsPrinters";
import {
  getAvailablePrinters,
  printTicket,
} from "../../../../../utils/ticketPrinter";

vi.mock("../../../../../utils/ticketPrinter", async () => {
  const actual = await vi.importActual("../../../../../utils/ticketPrinter");
  return {
    ...actual,
    getAvailablePrinters: vi.fn(async () => ({ success: true, printers: [] })),
    printTicket: vi.fn(async () => ({ success: true, message: "ok" })),
    hasElectronBridge: vi.fn(() => true),
  };
});

vi.mock("../../../../../services/ticketCustomizationService", async () => {
  const actual = await vi.importActual(
    "../../../../../services/ticketCustomizationService"
  );
  return {
    ...actual,
    getTicketCustomization: vi.fn(async () => ({
      ...actual.DEFAULT_TICKET_CUSTOMIZATION,
    })),
    saveTicketCustomization: vi.fn(async ({ template }) => ({
      ...actual.DEFAULT_TICKET_CUSTOMIZATION,
      ...template,
    })),
  };
});

describe("useSettingsPrinters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    getAvailablePrinters.mockResolvedValue({
      success: true,
      printers: [],
    });
    if (typeof window !== "undefined") {
      window.electronAPI = {
        invoke: vi.fn(async (channel) => {
          if (channel === "open-cash-drawer")
            return { success: true, message: "drawer" };
          if (channel === "get-printers") return [];
          if (channel === "print-ticket")
            return { success: true, message: "ok" };
          return { success: true };
        }),
      };
    }
  });

  it("Inicialización, detección de impresoras y sincronización con el contexto de sucursal.", async () => {
    let hookResult;
    await act(async () => {
      hookResult = renderHook(() => useSettingsPrinters({ branchId: null }));
    });
    expect(hookResult.result.current.widthMm).toBe(58);
    expect(hookResult.result.current.printMode).toBe("auto");
  });

  it("Mutación de preferencias de hardware y guardado de plantilla comercial.", async () => {
    getAvailablePrinters.mockResolvedValue({
      success: true,
      printers: [{ name: "POS-80", displayName: "POS-80", isDefault: true }],
    });
    const { result } = renderHook(() =>
      useSettingsPrinters({ branchId: null })
    );
    await act(async () => {
      result.current.handleCopiesChange(2);
      result.current.handleFeedLinesChange(3);
      result.current.handleSelectPrinter("POS-80");
      result.current.handleTemplateChange(
        "footerLine1",
        "Gracias por su compra"
      );
      await result.current.handleSaveTemplate();
    });
    expect(result.current.copies).toBe(2);
    expect(result.current.feedLines).toBe(3);
    expect(result.current.selectedPrinter).toBe("POS-80");
    expect(window.localStorage.getItem("settings_ticket_copies")).toBe("2");
    expect(window.localStorage.getItem("settings_ticket_feed_lines")).toBe("3");
    expect(window.localStorage.getItem("settings_selected_printer")).toBe(
      "POS-80"
    );
  });

  it("hidrata copias, saltos e impresora persistidos al montar", async () => {
    window.localStorage.setItem("settings_ticket_copies", "4");
    window.localStorage.setItem("settings_ticket_feed_lines", "5");
    window.localStorage.setItem("settings_selected_printer", "POS-40");
    getAvailablePrinters.mockResolvedValue({
      success: true,
      printers: [
        { name: "POS-40", displayName: "POS-40" },
        { name: "SERVER", displayName: "SERVER", isDefault: true },
      ],
    });

    const { result } = renderHook(() =>
      useSettingsPrinters({ branchId: null })
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.copies).toBe(4);
    expect(result.current.feedLines).toBe(5);
    expect(result.current.selectedPrinter).toBe("POS-40");
  });

  it("persiste la impresora elegida y respeta la almacenada al refrescar", async () => {
    getAvailablePrinters.mockResolvedValue({
      success: true,
      printers: [{ name: "SERVER", displayName: "SERVER", isDefault: true }],
    });

    const { result } = renderHook(() =>
      useSettingsPrinters({ branchId: null })
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.selectedPrinter).toBe("SERVER");
    expect(window.localStorage.getItem("settings_selected_printer")).toBe(
      "SERVER"
    );

    await act(async () => {
      result.current.handleSelectPrinter("POS-40");
    });
    expect(result.current.selectedPrinter).toBe("POS-40");
    expect(window.localStorage.getItem("settings_selected_printer")).toBe(
      "POS-40"
    );

    getAvailablePrinters.mockResolvedValue({
      success: true,
      printers: [
        { name: "SERVER", displayName: "SERVER", isDefault: true },
        { name: "POS-40", displayName: "POS-40" },
      ],
    });
    await act(async () => {
      result.current.refreshPrinters();
    });
    expect(result.current.selectedPrinter).toBe("POS-40");
  });

  it("Manejo de flujo de impresión de prueba y apertura de cajón.", async () => {
    const { result } = renderHook(() =>
      useSettingsPrinters({ branchId: null })
    );
    await act(async () => {
      await result.current.handleTestPrint();
      await result.current.handleOpenDrawer();
    });
    expect(result.current.printFeedback?.type).toBe("success");
    expect(result.current.drawerFeedback?.type).toBe("success");
    expect(printTicket).toHaveBeenCalledWith(
      expect.stringContaining("CROKETS"),
      expect.objectContaining({ feedLines: 2, copies: 1 })
    );
  });

  it("bloquea la prueba del cajon durante el cooldown y descarta clics repetidos", async () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() =>
        useSettingsPrinters({ branchId: null })
      );

      const drawerCalls = () =>
        window.electronAPI.invoke.mock.calls.filter(
          ([channel]) => channel === "open-cash-drawer"
        );

      await act(async () => {
        await result.current.handleOpenDrawer();
      });

      expect(result.current.drawerFeedback?.type).toBe("success");
      expect(result.current.testingDrawer).toBe(true);

      await act(async () => {
        await result.current.handleOpenDrawer();
      });
      expect(drawerCalls()).toHaveLength(1);

      await act(async () => {
        vi.advanceTimersByTime(2500);
      });
      expect(result.current.testingDrawer).toBe(false);

      await act(async () => {
        await result.current.handleOpenDrawer();
      });
      expect(drawerCalls()).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("no programa el cooldown de cajon si el hook se desmonta con la llamada en vuelo", async () => {
    vi.useFakeTimers();
    try {
      let resolveDrawer;
      window.electronAPI = {
        invoke: vi.fn((channel) => {
          if (channel === "open-cash-drawer") {
            return new Promise((resolve) => {
              resolveDrawer = resolve;
            });
          }
          return Promise.resolve({ success: true, printers: [] });
        }),
      };

      const { result, unmount } = renderHook(() =>
        useSettingsPrinters({ branchId: null })
      );

      let drawerPromise;
      act(() => {
        drawerPromise = result.current.handleOpenDrawer();
      });

      unmount();

      await act(async () => {
        resolveDrawer({ success: true, message: "ok" });
        await drawerPromise;
      });

      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("restablece la plantilla a sus valores por defecto con handleResetTemplate", async () => {
    const { result } = renderHook(() =>
      useSettingsPrinters({ branchId: null })
    );
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      result.current.handleTemplateChange(
        "headerSlogan",
        "Mi Eslogan Modificado"
      );
    });
    expect(result.current.template.headerSlogan).toBe("Mi Eslogan Modificado");

    await act(async () => {
      result.current.handleResetTemplate();
    });
    expect(result.current.template.headerSlogan).toBe(
      "¡Todo para consentir a tu mascota!"
    );
  });
});
