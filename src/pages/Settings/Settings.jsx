import { useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import NavbarSettings from "../../components/SettingsComponents/NavbarSettings/NavbarSettings";
import ProtectedRoute from "../../components/ProtectedRoute/ProtectedRoute";
import {
  PROTECTED_SETTINGS_SECTIONS,
  createAuthorizedRoutesFromState,
} from "../../config/adminProtectedSections";
import SettingsCash from "../../components/SettingsComponents/PageSettings/SettingsCash/SettingsCash";
import SettingsUsers from "../../components/SettingsComponents/PageSettings/SettingsUsers/SettingsUsers";
import SettingsPrinters from "../../components/SettingsComponents/PageSettings/SettingsPrinters/SettingsPrinters";
import SettingsTerminal from "../../components/SettingsComponents/PageSettings/SettingsTerminal/SettingsTerminal";
import SettingsBranches from "../../components/SettingsComponents/PageSettings/SettingsBranches/SettingsBranches";

import styles from "./Settings.module.css";

const SETTINGS_COMPONENTS = {
  "/settings/caja": SettingsCash,
  "/settings/usuarios": SettingsUsers,
  "/settings/impresion": SettingsPrinters,
  "/settings/terminal": SettingsTerminal,
  "/settings/sucursales": SettingsBranches,
};

const Settings = () => {
  const location = useLocation();
  const [authorizedRoutes, setAuthorizedRoutes] = useState(() =>
    createAuthorizedRoutesFromState(location.state, PROTECTED_SETTINGS_SECTIONS)
  );

  const handleAuthorizedRoute = (routePath) => {
    setAuthorizedRoutes((prev) => {
      const next = new Set(prev);
      next.add(routePath);
      return next;
    });
  };

  return (
    <div className={styles.container}>
      <Navbar />
      <NavbarSettings
        authorizedRoutes={authorizedRoutes}
        onProtectedAccessAuthorized={handleAuthorizedRoute}
      />
      <main className={styles.pageContent}>
        <Routes>
          <Route
            path="/"
            element={
              <Navigate to="/settings/caja" replace state={location.state} />
            }
          />

          {PROTECTED_SETTINGS_SECTIONS.map(
            ({ routePath, routeLabel, action }) => {
              const Component = SETTINGS_COMPONENTS[routePath];

              return (
                <Route
                  key={routePath}
                  path={routePath.replace("/settings/", "")}
                  element={
                    <ProtectedRoute
                      routePath={routePath}
                      routeLabel={routeLabel}
                      action={action}
                      authorizedRoutes={authorizedRoutes}
                      onAuthorizedRoute={handleAuthorizedRoute}
                    >
                      <Component />
                    </ProtectedRoute>
                  }
                />
              );
            }
          )}

          <Route path="*" element={<Navigate to="/settings/caja" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

export default Settings;
