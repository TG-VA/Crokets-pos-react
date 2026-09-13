import React, { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import NavbarReports from "../../components/ReportsComponents/NavbarReports/NavbarReports";
import ProtectedRoute from "../../components/ProtectedRoute/ProtectedRoute";
import { PROTECTED_REPORT_SECTIONS } from "../../config/adminProtectedSections";

import PageReportsHome from "../../components/ReportsComponents/PageReports/PageReportsHome/PageReportsHome";
import PageSalesReport from "../../components/ReportsComponents/PageReports/PageSalesReport/PageSalesReport";
import PageProductsReport from "../../components/ReportsComponents/PageReports/PageProductsReport/PageProductsReport";
import PageInventoryReport from "../../components/ReportsComponents/PageReports/PageInventoryReport/PageInventoryReport";
import PageCashReport from "../../components/ReportsComponents/PageReports/PageCashReport/PageCashReport";
import PageCustomersReport from "../../components/ReportsComponents/PageReports/PageCustomersReport/PageCustomersReport";
import PageInvoicesReport from "../../components/ReportsComponents/PageReports/PageInvoicesReport/PageInvoicesReport";
import PageProfitabilityReport from "../../components/ReportsComponents/PageReports/PageProfitabilityReport/PageProfitabilityReport";
import PageCommissionsReport from "../../components/ReportsComponents/PageReports/PageCommissionsReport/PageCommissionsReport";

import styles from "./Reports.module.css";

const PROTECTED_REPORT_COMPONENTS = {
  "/reports/ventas": PageSalesReport,
  "/reports/productos": PageProductsReport,
  "/reports/inventario": PageInventoryReport,
  "/reports/caja": PageCashReport,
  "/reports/facturacion": PageInvoicesReport,
  "/reports/rentabilidad": PageProfitabilityReport,
  "/reports/comisiones": PageCommissionsReport,
};

const Reports = () => {
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

      <NavbarReports onProtectedAccessAuthorized={handleAuthorizedRoute} />

      <main className={styles.pageContent}>
        <Routes>
          <Route index element={<PageReportsHome />} />

          {PROTECTED_REPORT_SECTIONS.map(
            ({ routePath, routeLabel, action }) => {
              const Component = PROTECTED_REPORT_COMPONENTS[routePath];

              return (
                <Route
                  key={routePath}
                  path={routePath.replace("/reports/", "")}
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

          <Route path="clientes" element={<PageCustomersReport />} />

          <Route path="*" element={<Navigate to="/reports" replace />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
};

export default Reports;
