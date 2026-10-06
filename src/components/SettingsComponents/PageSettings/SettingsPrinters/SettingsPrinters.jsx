import { useState } from "react";
import { printTicket } from "../../../../utils/ticketPrinter";
import {
  TICKET_WIDTH_OPTIONS,
  PRINT_MODE_AUTO,
  PRINT_MODE_CONFIRM,
  getTicketWidthMm,
  saveTicketWidthMm,
  getPrintMode,
  savePrintMode,
  getTicketPrintProfile,
} from "../../../../services/printSettingsService";
import shared from "../PageSettings.module.css";
import styles from "./SettingsPrinters.module.css";

const PRINT_MODE_LABELS = {
  [PRINT_MODE_AUTO]: "Imprimir automáticamente después de cobrar",
  [PRINT_MODE_CONFIRM]: "Pedir confirmación antes de imprimir",
};

const buildClasses = (...classes) => classes.filter(Boolean).join(" ");

const buildTestTicketText = (widthMm) =>
  [
    "CROKETS - TICKET DE PRUEBA",
    "--------------------------------",
    `Ancho de papel: ${widthMm} mm`,
    "Impresion termica conectada correctamente",
    "--------------------------------",
    "Gracias por su compra",
  ].join("\n");

const SettingsPrinters = () => {
  const [widthMm, setWidthMm] = useState(() => getTicketWidthMm());
  const [printMode, setPrintMode] = useState(() => getPrintMode());
  const [preferencesFeedback, setPreferencesFeedback] = useState(null);
  const [printing, setPrinting] = useState(false);
  const [printFeedback, setPrintFeedback] = useState(null);

  const handleWidthChange = (event) => {
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
  };

  const handlePrintModeChange = (event) => {
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
  };

  const handleTestPrint = async () => {
    setPrintFeedback(null);
    setPrinting(true);

    const result = await printTicket(buildTestTicketText(widthMm), {
      profile: getTicketPrintProfile(),
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
  };

  return (
    <section className={shared.page} aria-labelledby="settings-printers-title">
      <header className={shared.pageHeader}>
        <h1 id="settings-printers-title" className={shared.pageTitle}>
          Impresión y Tickets
        </h1>
        <p className={shared.pageSubtitle}>
          Configuración de la impresora térmica integrada
        </p>
      </header>

      <article className={shared.card}>
        <h2 className={shared.cardTitle}>Preferencias de ticket</h2>
        <p className={shared.cardDescription}>
          El ancho seleccionado se aplica a la venta, a la reimpresión y al
          corte de caja.
        </p>

        <fieldset className={shared.fieldset}>
          <legend className={shared.legend}>Ancho del ticket</legend>
          <div className={shared.radioGroup}>
            {TICKET_WIDTH_OPTIONS.map((option) => (
              <label
                key={option}
                className={shared.radioOption}
                htmlFor={`ticket-width-${option}`}
              >
                <input
                  id={`ticket-width-${option}`}
                  type="radio"
                  name="ticket-width"
                  value={option}
                  checked={widthMm === option}
                  onChange={handleWidthChange}
                />
                {option} mm
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className={shared.fieldset}>
          <legend className={shared.legend}>Impresión post-cobro</legend>
          <div className={shared.radioGroup}>
            <label className={shared.radioOption} htmlFor="print-mode-auto">
              <input
                id="print-mode-auto"
                type="radio"
                name="print-mode"
                value={PRINT_MODE_AUTO}
                checked={printMode === PRINT_MODE_AUTO}
                onChange={handlePrintModeChange}
              />
              {PRINT_MODE_LABELS[PRINT_MODE_AUTO]}
            </label>
            <label className={shared.radioOption} htmlFor="print-mode-confirm">
              <input
                id="print-mode-confirm"
                type="radio"
                name="print-mode"
                value={PRINT_MODE_CONFIRM}
                checked={printMode === PRINT_MODE_CONFIRM}
                onChange={handlePrintModeChange}
              />
              {PRINT_MODE_LABELS[PRINT_MODE_CONFIRM]}
            </label>
          </div>
        </fieldset>

        {preferencesFeedback?.type === "error" ? (
          <p role="alert" className={shared.errorMessage}>
            {preferencesFeedback.message}
          </p>
        ) : null}

        {preferencesFeedback?.type === "success" ? (
          <p role="status" className={shared.statusMessage}>
            {preferencesFeedback.message}
          </p>
        ) : null}
      </article>

      <article className={shared.card}>
        <h2 className={shared.cardTitle}>Ticket de prueba</h2>
        <p className={shared.cardDescription}>
          Envía un ticket de diagnóstico a la impresora del sistema con el ancho
          configurado.
        </p>

        <div className={shared.buttonRow}>
          <button
            type="button"
            className={buildClasses(shared.button, styles.testPrintButton)}
            onClick={handleTestPrint}
            disabled={printing}
          >
            {printing ? "Imprimiendo..." : "Imprimir ticket de prueba"}
          </button>
        </div>

        {printFeedback?.type === "error" ? (
          <p role="alert" className={shared.errorMessage}>
            {printFeedback.message}
          </p>
        ) : null}

        {printFeedback?.type === "success" ? (
          <p role="status" className={shared.statusMessage}>
            {printFeedback.message}
          </p>
        ) : null}
      </article>
    </section>
  );
};

export { buildTestTicketText };
export default SettingsPrinters;
