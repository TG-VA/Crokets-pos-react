import React from "react";
import CircleCheckIcon from "../../../../assets/icons/circle-check-solid-full.svg";
import TriangleExclamationIcon from "../../../../assets/icons/triangle-exclamation-solid-full.svg";
import styles from "./SettingsCash.module.css";
import useSettingsCash from "./hooks/useSettingsCash";
import CashOpeningCard from "./components/CashOpeningCard";
import CashSecurityCard from "./components/CashSecurityCard";
import CashCutCard from "./components/CashCutCard";
import CashUsdCard from "./components/CashUsdCard";
import CashDrawerCard from "./components/CashDrawerCard";

const SettingsCash = () => {
  const {
    adminLoading,
    cashMax,
    drawerFeedback,
    feedback,
    handleCashMaxChange,
    handleSave,
    handleSettingChange,
    handleTestDrawer,
    isAdmin,
    saving,
    settings,
    testingDrawer,
  } = useSettingsCash();

  return (
    <section
      className={styles.settingsSection}
      aria-labelledby="settings-cash-title"
    >
      <header className={styles.settingsHeader}>
        <div>
          <h1 id="settings-cash-title" className={styles.settingsTitle}>
            Caja y Operación
          </h1>
          <p className={styles.settingsSubtitle}>
            Parámetros operativos de la caja registradora
          </p>
        </div>
        <button
          type="button"
          className={styles.button}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Guardando..." : "Guardar configuración"}
        </button>
      </header>

      {feedback?.type === "error" ? (
        <div role="alert" className={styles.errorMessage}>
          <img
            src={TriangleExclamationIcon}
            alt=""
            className={styles.feedbackIcon}
            aria-hidden="true"
          />
          <span>{feedback.message}</span>
        </div>
      ) : null}

      {feedback?.type === "success" ? (
        <div role="status" className={styles.statusMessage}>
          <img
            src={CircleCheckIcon}
            alt=""
            className={styles.feedbackIcon}
            aria-hidden="true"
          />
          <span>{feedback.message}</span>
        </div>
      ) : null}

      <CashOpeningCard
        isAdmin={isAdmin}
        adminLoading={adminLoading}
        cashMax={cashMax}
        onCashMaxChange={handleCashMaxChange}
        settings={settings}
        onSettingChange={handleSettingChange}
      />
      <CashSecurityCard
        settings={settings}
        onSettingChange={handleSettingChange}
      />
      <CashCutCard settings={settings} onSettingChange={handleSettingChange} />
      <CashUsdCard settings={settings} onSettingChange={handleSettingChange} />
      <CashDrawerCard
        settings={settings}
        onSettingChange={handleSettingChange}
        testingDrawer={testingDrawer}
        drawerFeedback={drawerFeedback}
        onTestDrawer={handleTestDrawer}
      />
    </section>
  );
};

export default SettingsCash;
