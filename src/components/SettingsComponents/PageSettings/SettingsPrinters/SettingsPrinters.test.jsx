import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SettingsPrinters from "./SettingsPrinters";

const mockHookReturn = {
  widthMm: 58,
  printMode: "auto",
  preferencesFeedback: null,
  printing: false,
  printFeedback: null,
  drawerFeedback: null,
  testingDrawer: false,
  copies: 1,
  feedLines: 2,
  template: {
    headerSlogan: "¡Todo para consentir a tu mascota!",
    fiscalInfo: "RFC: CRO123456",
    footerLine1: "Gracias por su compra",
    footerLine2: "Agenda tu cita de baño",
    footerPhone: "998 117 5387",
    returnPolicy: "Políticas de devolución",
    showCustomerPoints: true,
    showCashierName: true,
    showSaleNotes: true,
    showBranchAddress: true,
    showBranchPhone: true,
  },
  templateFeedback: null,
  savingTemplate: false,
  printers: [{ name: "POS-80", displayName: "POS-80", isDefault: true }],
  selectedPrinter: "POS-80",
  handleSelectPrinter: vi.fn(),
  printersLoading: false,
  printersError: null,
  viewMode: "venta",
  setViewMode: vi.fn(),
  isElectron: true,
  refreshPrinters: vi.fn(),
  handleWidthChange: vi.fn(),
  handlePrintModeChange: vi.fn(),
  handleCopiesChange: vi.fn(),
  handleFeedLinesChange: vi.fn(),
  handleTemplateChange: vi.fn(),
  handleToggleChange: vi.fn(),
  handleResetTemplate: vi.fn(),
  handleSaveTemplate: vi.fn(),
  handleTestPrint: vi.fn(),
  handleOpenDrawer: vi.fn(),
  previewData: {
    headerSlogan: "¡Todo para consentir a tu mascota!",
    fiscalInfo: "RFC: CRO123456",
    footerLine1: "Gracias por su compra",
  },
};

let currentHookData = { ...mockHookReturn };

vi.mock("../../../../contexts/BranchContext", () => ({
  useBranch: () => ({ branch: { id: 1, name: "Sucursal Cancún Centro" } }),
}));

vi.mock("../../../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { username: "admin" } }),
}));

vi.mock("./hooks/useSettingsPrinters", () => ({
  useSettingsPrinters: () => currentHookData,
}));

describe("SettingsPrinters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentHookData = { ...mockHookReturn };
  });

  it("renderizado completo del layout a dos columnas con todas las tarjetas", () => {
    render(<SettingsPrinters />);
    expect(screen.getByText("Impresión y Tickets")).toBeTruthy();
    expect(screen.getByText("Impresora física del sistema")).toBeTruthy();
    expect(screen.getByText("Formato y preferencias")).toBeTruthy();
    expect(screen.getByText("Plantilla comercial del ticket")).toBeTruthy();
    expect(screen.getByText("Diagnóstico de hardware")).toBeTruthy();
    expect(screen.getByText("Simulador Térmico en Vivo")).toBeTruthy();
    expect(screen.getByText("Ticket de Venta")).toBeTruthy();
    expect(screen.getByText("Corte de Caja")).toBeTruthy();
  });

  it("permite conmutar la vista entre ticket de venta y corte de caja en el simulador", () => {
    render(<SettingsPrinters />);
    const corteButton = screen.getByRole("button", { name: "Corte de Caja" });
    fireEvent.click(corteButton);
    expect(currentHookData.setViewMode).toHaveBeenCalledWith("corte");

    const ventaButton = screen.getByRole("button", { name: "Ticket de Venta" });
    fireEvent.click(ventaButton);
    expect(currentHookData.setViewMode).toHaveBeenCalledWith("venta");
  });

  it("despacha las funciones de cambio de configuración al interactuar con los inputs", () => {
    render(<SettingsPrinters />);

    const radio80 = screen.getByDisplayValue("80");
    fireEvent.click(radio80);
    expect(currentHookData.handleWidthChange).toHaveBeenCalled();

    const testPrintBtn = screen.getByRole("button", {
      name: "Imprimir ticket de prueba",
    });
    fireEvent.click(testPrintBtn);
    expect(currentHookData.handleTestPrint).toHaveBeenCalled();

    const resetBtn = screen.getByRole("button", {
      name: "Restablecer valores predeterminados",
    });
    fireEvent.click(resetBtn);
    expect(currentHookData.handleResetTemplate).toHaveBeenCalled();

    const openDrawerBtn = screen.getByRole("button", {
      name: "Probar apertura del cajón",
    });
    fireEvent.click(openDrawerBtn);
    expect(currentHookData.handleOpenDrawer).toHaveBeenCalled();
  });

  it("muestra los mensajes de estado y error cuando hay feedback activo", () => {
    currentHookData = {
      ...mockHookReturn,
      preferencesFeedback: {
        type: "success",
        message: "Ancho de ticket guardado: 80 mm.",
      },
      printFeedback: { type: "error", message: "Impresora desconectada." },
    };

    render(<SettingsPrinters />);
    expect(screen.getByRole("status").textContent).toContain(
      "Ancho de ticket guardado: 80 mm."
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "Impresora desconectada."
    );
  });

  it("bloquea la apertura del cajon durante la ventana de enfriamiento", () => {
    currentHookData = {
      ...mockHookReturn,
      testingDrawer: true,
    };

    render(<SettingsPrinters />);

    const openDrawerBtn = screen.getByRole("button", {
      name: "Abriendo cajón...",
    });
    expect(openDrawerBtn.disabled).toBe(true);
  });

  it("muestra los distintivos de alcance de sucursal y de equipo", () => {
    render(<SettingsPrinters />);

    expect(screen.getAllByText(/Aplica a nivel global/i)).toHaveLength(1);
    expect(screen.getAllByText(/Solo este equipo/i)).toHaveLength(3);
  });
});
