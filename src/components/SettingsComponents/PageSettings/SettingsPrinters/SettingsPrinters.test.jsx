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
  copiesText: "1",
  feedLines: 2,
  feedLinesText: "2",
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
  handleCopiesBlur: vi.fn(),
  handleFeedLinesChange: vi.fn(),
  handleFeedLinesBlur: vi.fn(),
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

  it("usa inputs de texto numericos sin spinners y normaliza en onBlur", () => {
    render(<SettingsPrinters />);

    const copiesInput = document.getElementById("copies-input");
    const feedLinesInput = document.getElementById("feedlines-input");

    expect(copiesInput.getAttribute("type")).toBe("text");
    expect(copiesInput.getAttribute("inputmode")).toBe("numeric");
    expect(feedLinesInput.getAttribute("type")).toBe("text");
    expect(feedLinesInput.getAttribute("inputmode")).toBe("numeric");

    fireEvent.change(copiesInput, { target: { value: "4" } });
    expect(currentHookData.handleCopiesChange).toHaveBeenCalledWith("4");

    fireEvent.blur(copiesInput);
    expect(currentHookData.handleCopiesBlur).toHaveBeenCalled();

    fireEvent.change(feedLinesInput, { target: { value: "6" } });
    expect(currentHookData.handleFeedLinesChange).toHaveBeenCalledWith("6");

    fireEvent.blur(feedLinesInput);
    expect(currentHookData.handleFeedLinesBlur).toHaveBeenCalled();

    const blurSpy = vi.spyOn(copiesInput, "blur");
    fireEvent.keyDown(copiesInput, { key: "Enter" });
    expect(blurSpy).toHaveBeenCalled();
  });

  it("informa los rangos permitidos en las ayudas de los campos", () => {
    render(<SettingsPrinters />);
    expect(screen.getByText("Entre 1 y 10 copias por venta")).toBeTruthy();
    expect(
      screen.getByText("Entre 0 y 25 líneas de avance antes del corte")
    ).toBeTruthy();
  });

  it("expone los limites numericos en los inputs de copias y saltos de linea", () => {
    render(<SettingsPrinters />);

    const copiesInput = document.getElementById("copies-input");
    const feedLinesInput = document.getElementById("feedlines-input");

    expect(copiesInput.getAttribute("min")).toBe("1");
    expect(copiesInput.getAttribute("max")).toBe("10");
    expect(copiesInput.getAttribute("maxlength")).toBe("2");

    expect(feedLinesInput.getAttribute("min")).toBe("0");
    expect(feedLinesInput.getAttribute("max")).toBe("25");
    expect(feedLinesInput.getAttribute("maxlength")).toBe("2");
  });

  it("expone los limites de longitud en los campos de la plantilla comercial", () => {
    render(<SettingsPrinters />);

    const expectedLimits = {
      headerSlogan: 80,
      fiscalInfo: 100,
      footerLine1: 60,
      footerLine2: 60,
      footerPhone: 20,
      returnPolicy: 250,
    };

    Object.entries(expectedLimits).forEach(([id, limit]) => {
      const field = document.getElementById(id);
      expect(field).toBeTruthy();
      expect(field.getAttribute("maxlength")).toBe(String(limit));
    });
  });

  it("muestra los contadores de caracteres de la plantilla comercial", () => {
    render(<SettingsPrinters />);

    const template = mockHookReturn.template;
    expect(
      screen.getByText(`${template.headerSlogan.length} / 80`)
    ).toBeTruthy();
    expect(
      screen.getByText(`${template.fiscalInfo.length} / 100`)
    ).toBeTruthy();
    expect(
      screen.getByText(`${template.footerLine1.length} / 60`)
    ).toBeTruthy();
    expect(
      screen.getByText(`${template.footerLine2.length} / 60`)
    ).toBeTruthy();
    expect(
      screen.getByText(`${template.footerPhone.length} / 20`)
    ).toBeTruthy();
    expect(
      screen.getByText(`${template.returnPolicy.length} / 250`)
    ).toBeTruthy();
  });

  it("el simulador omite del pie las lineas que la plantilla deja vacias", () => {
    currentHookData = {
      ...mockHookReturn,
      previewData: {
        ...mockHookReturn.previewData,
        footerLine1: "",
        footerLine2: "",
        footerPhone: "",
        returnPolicy: "",
      },
    };

    render(<SettingsPrinters />);

    const preview = document.querySelector("pre");
    expect(preview.textContent).not.toContain("Gracias por su compra");
    expect(preview.textContent).not.toContain("Agenda tu cita de baño");
    expect(preview.textContent).not.toContain("Tel. 998 117 5387");
  });

  it("el simulador conserva las lineas que la plantilla si define", () => {
    currentHookData = {
      ...mockHookReturn,
      previewData: {
        ...mockHookReturn.previewData,
        footerLine1: "Gracias por todo",
        footerLine2: "",
        footerPhone: "998 117 5387",
        returnPolicy: "",
      },
    };

    render(<SettingsPrinters />);

    const preview = document.querySelector("pre");
    expect(preview.textContent).toContain("Gracias por todo");
    expect(preview.textContent).toContain("Tel. 998 117 5387");
    expect(preview.textContent).not.toContain("Agenda tu cita de baño");
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
