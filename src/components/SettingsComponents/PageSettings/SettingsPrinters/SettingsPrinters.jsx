import { useBranch } from "../../../../contexts/BranchContext";
import { useAuth } from "../../../../contexts/AuthContext";
import { useSettingsPrinters } from "./hooks/useSettingsPrinters";
import shared from "../PageSettings.module.css";
import styles from "./SettingsPrinters.module.css";
import PrinterDeviceCard from "./components/PrinterDeviceCard";
import TicketFormatCard from "./components/TicketFormatCard";
import TicketContentCard from "./components/TicketContentCard";
import TicketDiagnosticCard from "./components/TicketDiagnosticCard";
import TicketLivePreview from "./components/TicketLivePreview";

const SettingsPrinters = () => {
  const { branch } = useBranch();
  const { user } = useAuth();

  const {
    widthMm,
    printMode,
    preferencesFeedback,
    printing,
    printFeedback,
    drawerFeedback,
    testingDrawer,
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
  } = useSettingsPrinters({ branchId: branch?.id });

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

      <div className={styles.settingsLayout}>
        <div className={styles.columnLeft}>
          <PrinterDeviceCard
            printers={printers}
            selectedPrinter={selectedPrinter}
            onSelectPrinter={handleSelectPrinter}
            printersLoading={printersLoading}
            printersError={printersError}
            refreshPrinters={refreshPrinters}
            isElectron={isElectron}
          />

          <TicketFormatCard
            widthMm={widthMm}
            handleWidthChange={handleWidthChange}
            printMode={printMode}
            handlePrintModeChange={handlePrintModeChange}
            copies={copies}
            handleCopiesChange={handleCopiesChange}
            feedLines={feedLines}
            handleFeedLinesChange={handleFeedLinesChange}
            preferencesFeedback={preferencesFeedback}
          />

          <TicketContentCard
            template={template}
            handleTemplateChange={handleTemplateChange}
            handleToggleChange={handleToggleChange}
            handleResetTemplate={handleResetTemplate}
            handleSaveTemplate={handleSaveTemplate}
            savingTemplate={savingTemplate}
            templateFeedback={templateFeedback}
          />

          <TicketDiagnosticCard
            widthMm={widthMm}
            printing={printing}
            handleTestPrint={handleTestPrint}
            printFeedback={printFeedback}
            drawerFeedback={drawerFeedback}
            handleOpenDrawer={handleOpenDrawer}
            isElectron={isElectron}
            testingDrawer={testingDrawer}
          />
        </div>

        <div className={styles.columnRight}>
          <TicketLivePreview
            widthMm={widthMm}
            viewMode={viewMode}
            setViewMode={setViewMode}
            template={previewData}
            branch={branch}
            user={user}
          />
        </div>
      </div>
    </section>
  );
};

export default SettingsPrinters;
