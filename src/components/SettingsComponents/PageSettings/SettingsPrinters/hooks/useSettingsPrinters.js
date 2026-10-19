import { useCallback, useEffect, useMemo, useState } from "react";
import {
  printTicket,
  getAvailablePrinters,
  openCashDrawerBridge,
  hasElectronBridge,
} from "../../../../../utils/ticketPrinter";
import {
  getTicketWidthMm,
  saveTicketWidthMm,
  getPrintMode,
  savePrintMode,
  getTicketPrintProfile,
  getSelectedPrinter,
  saveSelectedPrinter,
  getTicketCopies,
  saveTicketCopies,
  getTicketFeedLines,
  saveTicketFeedLines,
} from "../../../../../services/printSettingsService";
import {
  DEFAULT_TICKET_CUSTOMIZATION,
  getTicketCustomization,
  saveTicketCustomization,
} from "../../../../../services/ticketCustomizationService";
import {
  wrapText,
  centerText,
} from "../../../../../utils/ticket/ticketLayoutFormatters";

const DEFAULT_FEEDBACK = null;

export const useSettingsPrinters = ({ branchId = null } = {}) => {
  const [widthMm, setWidthMm] = useState(() => getTicketWidthMm());
  const [printMode, setPrintMode] = useState(() => getPrintMode());
  const [preferencesFeedback, setPreferencesFeedback] =
    useState(DEFAULT_FEEDBACK);
  const [printing, setPrinting] = useState(false);
  const [printFeedback, setPrintFeedback] = useState(DEFAULT_FEEDBACK);
  const [drawerFeedback, setDrawerFeedback] = useState(DEFAULT_FEEDBACK);

  const [copies, setCopies] = useState(() => getTicketCopies());
  const [feedLines, setFeedLines] = useState(() => getTicketFeedLines());
  const [template, setTemplate] = useState(() => ({
    ...DEFAULT_TICKET_CUSTOMIZATION,
  }));
  const [templateFeedback, setTemplateFeedback] = useState(DEFAULT_FEEDBACK);
  const [savingTemplate, setSavingTemplate] = useState(false);

  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState(() =>
    getSelectedPrinter()
  );
  const [printersLoading, setPrintersLoading] = useState(false);
  const [printersError, setPrintersError] = useState(null);

  const [viewMode, setViewMode] = useState("venta");

  const isElectron = hasElectronBridge();

  useEffect(() => {
    let isMounted = true;
    const fetchTemplate = async () => {
      try {
        const result = await getTicketCustomization({ branchId });
        if (isMounted) {
          setTemplate(result);
        }
      } catch (error) {
        console.error("Error cargando plantilla de ticket:", error);
        if (isMounted) {
          setTemplate({ ...DEFAULT_TICKET_CUSTOMIZATION });
        }
      }
    };
    fetchTemplate();
    return () => {
      isMounted = false;
    };
  }, [branchId]);

  const syncSelectedPrinter = useCallback((availablePrinters = []) => {
    const stored = getSelectedPrinter();
    const names = new Set(
      availablePrinters
        .map((printer) => printer?.name || printer?.deviceName || "")
        .filter(Boolean)
    );

    if (stored && names.has(stored)) {
      setSelectedPrinter(stored);
      return stored;
    }

    const defaultPrinter =
      availablePrinters.find((printer) => printer.isDefault) ||
      availablePrinters[0];
    const fallbackName =
      defaultPrinter?.name || defaultPrinter?.deviceName || "";
    saveSelectedPrinter(fallbackName);
    setSelectedPrinter(fallbackName);
    return fallbackName;
  }, []);

  const refreshPrinters = useCallback(async () => {
    setPrintersLoading(true);
    setPrintersError(null);
    try {
      const result = await getAvailablePrinters();
      setPrintersLoading(false);
      if (!result.success) {
        setPrintersError(result.error || "Error al obtener impresoras");
        setPrinters(result.printers || []);
        return;
      }
      setPrinters(result.printers || []);
      syncSelectedPrinter(result.printers || []);
    } catch (error) {
      console.error("Error al refrescar impresoras:", error);
      setPrintersLoading(false);
      setPrintersError("Error al obtener impresoras");
    }
  }, [syncSelectedPrinter]);

  useEffect(() => {
    let isMounted = true;
    if (isElectron) {
      Promise.resolve().then(() => {
        if (!isMounted) return;
        refreshPrinters();
      });
    }
    return () => {
      isMounted = false;
    };
  }, [isElectron, refreshPrinters]);

  const handleWidthChange = useCallback((event) => {
    const result = saveTicketWidthMm(event.target.value);
    if (!result.success) {
      setPreferencesFeedback({ type: "error", message: result.error });
      return;
    }
    setWidthMm(result.widthMm);
    setPreferencesFeedback({
      type: "success",
      message: `Ancho de ticket guardado: ${result.widthMm} mm.`,
    });
  }, []);

  const handlePrintModeChange = useCallback((event) => {
    const result = savePrintMode(event.target.value);
    if (!result.success) {
      setPreferencesFeedback({ type: "error", message: result.error });
      return;
    }
    setPrintMode(result.printMode);
    setPreferencesFeedback({
      type: "success",
      message: "Modo de impresión guardado.",
    });
  }, []);

  const handleCopiesChange = useCallback((value) => {
    const result = saveTicketCopies(value);
    setCopies(result.copies);
  }, []);

  const handleFeedLinesChange = useCallback((value) => {
    const result = saveTicketFeedLines(value);
    setFeedLines(result.feedLines);
  }, []);

  const handleSelectPrinter = useCallback((printerName) => {
    saveSelectedPrinter(printerName);
    setSelectedPrinter(printerName);
  }, []);

  const handleTemplateChange = useCallback((key, value) => {
    setTemplate((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleToggleChange = useCallback((key, checked) => {
    setTemplate((prev) => ({ ...prev, [key]: Boolean(checked) }));
  }, []);

  const handleSaveTemplate = useCallback(async () => {
    setTemplateFeedback(DEFAULT_FEEDBACK);
    setSavingTemplate(true);
    try {
      const saved = await saveTicketCustomization({ branchId, template });
      setTemplate(saved);
      setTemplateFeedback({
        type: "success",
        message: "Plantilla guardada correctamente.",
      });
    } catch (error) {
      console.error("Error guardando plantilla:", error);
      setTemplateFeedback({
        type: "error",
        message: "No se pudo guardar la plantilla.",
      });
    } finally {
      setSavingTemplate(false);
    }
  }, [branchId, template]);

  const buildTestTicketText = useCallback(() => {
    const cols = widthMm === 80 ? 42 : 32;
    const lines = [];
    const slogan = (template.headerSlogan || "CROKETS").trim();
    if (slogan) {
      const wrapped = wrapText(slogan, cols);
      wrapped.forEach((line) => {
        const trimmed = line.trim();
        if (trimmed) lines.push(centerText(trimmed, cols));
      });
    }
    lines.push("CROKETS - TICKET DE PRUEBA");
    lines.push("-".repeat(cols));
    lines.push(`Ancho de papel: ${widthMm} mm`);
    wrapText("Impresion termica conectada correctamente", cols).forEach(
      (line) => {
        lines.push(line);
      }
    );
    lines.push("-".repeat(cols));
    lines.push("ARTICULO DE PRUEBA x1   $100.00");
    lines.push("TOTAL                $100.00");
    lines.push("-".repeat(cols));
    if (template.footerLine1) {
      wrapText(template.footerLine1, cols).forEach((line) => {
        lines.push(line);
      });
    }
    if (template.footerLine2) {
      wrapText(template.footerLine2, cols).forEach((line) => {
        lines.push(line);
      });
    }
    if (template.footerPhone) lines.push(`Tel.: ${template.footerPhone}`);
    if (template.returnPolicy) {
      wrapText(template.returnPolicy, cols).forEach((line) => {
        lines.push(line);
      });
    }
    return lines.join("\n");
  }, [template, widthMm]);

  const handleTestPrint = useCallback(async () => {
    setPrintFeedback(DEFAULT_FEEDBACK);
    setPrinting(true);
    const text = buildTestTicketText();
    const result = await printTicket(text, {
      profile: getTicketPrintProfile(),
      deviceName: selectedPrinter || undefined,
      copies,
      feedLines: getTicketFeedLines(),
    });
    setPrinting(false);
    if (!result.success) {
      setPrintFeedback({
        type: "error",
        message: result.message || "No se pudo imprimir el ticket de prueba.",
      });
      return;
    }
    setPrintFeedback({ type: "success", message: result.message });
  }, [buildTestTicketText, copies, selectedPrinter]);

  const handleResetTemplate = useCallback(() => {
    setTemplate({ ...DEFAULT_TICKET_CUSTOMIZATION });
  }, []);

  const handleOpenDrawer = useCallback(async () => {
    setDrawerFeedback(DEFAULT_FEEDBACK);
    if (!isElectron) {
      setDrawerFeedback({
        type: "error",
        message:
          "La apertura de cajón solo está disponible en la aplicación de escritorio.",
      });
      return;
    }
    try {
      const result = await openCashDrawerBridge({
        printerDeviceName: selectedPrinter,
      });
      if (!result.success) {
        setDrawerFeedback({
          type: "error",
          message: result.message || "No se pudo abrir el cajón de dinero.",
        });
        return;
      }
      setDrawerFeedback({ type: "success", message: result.message });
    } catch (error) {
      console.error("Error abriendo cajón:", error);
      setDrawerFeedback({
        type: "error",
        message: "No se pudo abrir el cajón de dinero.",
      });
    }
  }, [isElectron, selectedPrinter]);

  useEffect(() => {
    if (templateFeedback?.type === "success") {
      const timer = setTimeout(() => {
        setTemplateFeedback(DEFAULT_FEEDBACK);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [templateFeedback]);

  useEffect(() => {
    if (printFeedback?.type === "success") {
      const timer = setTimeout(() => {
        setPrintFeedback(DEFAULT_FEEDBACK);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [printFeedback]);

  useEffect(() => {
    if (drawerFeedback?.type === "success") {
      const timer = setTimeout(() => {
        setDrawerFeedback(DEFAULT_FEEDBACK);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [drawerFeedback]);

  const previewData = useMemo(
    () => ({
      headerSlogan: template.headerSlogan,
      fiscalInfo: template.fiscalInfo,
      footerLine1: template.footerLine1,
      footerLine2: template.footerLine2,
      footerPhone: template.footerPhone,
      returnPolicy: template.returnPolicy,
      showCustomerPoints: template.showCustomerPoints,
      showCashierName: template.showCashierName,
      showSaleNotes: template.showSaleNotes,
      showBranchAddress: template.showBranchAddress,
      showBranchPhone: template.showBranchPhone,
    }),
    [template]
  );

  return {
    widthMm,
    printMode,
    preferencesFeedback,
    setPreferencesFeedback,
    printing,
    printFeedback,
    setPrintFeedback,
    drawerFeedback,
    setDrawerFeedback,
    copies,
    feedLines,
    template,
    templateFeedback,
    savingTemplate,
    printers,
    selectedPrinter,
    handleSelectPrinter,
    printersLoading,
    printersError,
    viewMode,
    setViewMode,
    isElectron,
    refreshPrinters,
    handleWidthChange,
    handlePrintModeChange,
    handleCopiesChange,
    handleFeedLinesChange,
    handleTemplateChange,
    handleToggleChange,
    handleResetTemplate,
    handleSaveTemplate,
    handleTestPrint,
    handleOpenDrawer,
    previewData,
  };
};
