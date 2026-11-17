import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import NavbarInventory from "../../components/InventoryComponents/NavbarInventory/NavbarInventory";
import ProtectedRoute from "../../components/ProtectedRoute/ProtectedRoute";
import { PROTECTED_INVENTORY_SECTIONS } from "../../config/adminProtectedSections";

import PageAdd from "../../components/InventoryComponents/PageInventory/PageAdd/PageAdd";
import PageAdjustments from "../../components/InventoryComponents/PageInventory/PageAdjustments/PageAdjustments";
import PageReport from "../../components/InventoryComponents/PageInventory/PageReport/PageReport";
import PageMovementsReport from "../../components/InventoryComponents/PageInventory/PageMovementsReport/PageMovementsReport";
import PageKardex from "../../components/InventoryComponents/PageInventory/PageKardex/Pagekardex";
import PageTransfers from "../../components/InventoryComponents/PageInventory/PageTransfers/PageTransfers";
import PageOrders from "../../components/InventoryComponents/PageInventory/PageOrders/PageOrders";

import styles from "./Inventory.module.css";

// Entrada por defecto del modulo: una seccion publica, para que abrir
// Inventario no pida autorizacion de administrador.
const INVENTORY_HOME_PATH = "/inventory/reporte-inventario";

const PROTECTED_INVENTORY_COMPONENTS = {
  "/inventory/agregar": PageAdd,
};

const Inventory = () => {
  const [authorizedRoutes, setAuthorizedRoutes] = useState(() => new Set());

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
      <NavbarInventory onProtectedAccessAuthorized={handleAuthorizedRoute} />
      <main className={styles.pageContent}>
        <Routes>
          <Route
            path="/"
            element={<Navigate to={INVENTORY_HOME_PATH} replace />}
          />
          {PROTECTED_INVENTORY_SECTIONS.map(
            ({ routePath, routeLabel, action }) => {
              const Component = PROTECTED_INVENTORY_COMPONENTS[routePath];

              return (
                <Route
                  key={routePath}
                  path={routePath.replace("/inventory", "")}
                  element={
                    <ProtectedRoute
                      routePath={routePath}
                      routeLabel={routeLabel}
                      action={action}
                      authorizedRoutes={authorizedRoutes}
                      onAuthorizedRoute={handleAuthorizedRoute}
                      fallbackPath={INVENTORY_HOME_PATH}
                    >
                      <Component />
                    </ProtectedRoute>
                  }
                />
              );
            }
          )}
          <Route path="/ajustes" element={<PageAdjustments />} />
          <Route path="/reporte-inventario" element={<PageReport />} />
          <Route
            path="/reporte-movimientos"
            element={<PageMovementsReport />}
          />
          <Route path="/kardex" element={<PageKardex />} />
          <Route path="/traspasos" element={<PageTransfers />} />
          <Route path="/pedidos" element={<PageOrders />} />
          <Route path="/orders" element={<PageOrders />} />
          <Route
            path="*"
            element={<Navigate to={INVENTORY_HOME_PATH} replace />}
          />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

export default Inventory;
