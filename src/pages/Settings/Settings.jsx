import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import NavbarSettings from "../../components/SettingsComponents/NavbarSettings/NavbarSettings";
import SettingsCash from "../../components/SettingsComponents/PageSettings/SettingsCash/SettingsCash";
import SettingsUsers from "../../components/SettingsComponents/PageSettings/SettingsUsers/SettingsUsers";
import SettingsPrinters from "../../components/SettingsComponents/PageSettings/SettingsPrinters/SettingsPrinters";
import SettingsTerminal from "../../components/SettingsComponents/PageSettings/SettingsTerminal/SettingsTerminal";

import styles from "./Settings.module.css";

const Settings = () => {
  return (
    <div className={styles.container}>
      <Navbar />
      <NavbarSettings />
      <main className={styles.pageContent}>
        <Routes>
          <Route path="/" element={<Navigate to="/settings/caja" replace />} />
          <Route path="/caja" element={<SettingsCash />} />
          <Route path="/usuarios" element={<SettingsUsers />} />
          <Route path="/impresion" element={<SettingsPrinters />} />
          <Route path="/terminal" element={<SettingsTerminal />} />
          <Route path="*" element={<Navigate to="/settings/caja" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

export default Settings;
