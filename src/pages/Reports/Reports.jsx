import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import NavbarReports from "../../components/ReportsComponents/NavbarReports/NavbarReports";
import ProtectedRoute from "../../components/ProtectedRoute/ProtectedRoute";

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

const PROTECTED_REPORT_PAGES = [
  {
    path: "ventas",
    routePath: "/reports/ventas",
    label: "Ventas",
    action: "reports_sales_access",
    Component: PageSalesReport,
  },
  {
    path: "productos",
    routePath: "/reports/productos",
    label: "Productos",
    action: "reports_products_access",
    Component: PageProductsReport,
  },
  {
    path: "inventario",
    routePath: "/reports/inventario",
    label: "Inventario",
    action: "reports_inventory_access",
    Component: PageInventoryReport,
  },
  {
    path: "caja",
    routePath: "/reports/caja",
    label: "Caja",
    action: "reports_cash_access",
    Component: PageCashReport,
  },
  {
    path: "facturacion",
    routePath: "/reports/facturacion",
    label: "Facturación",
    action: "reports_invoicing_access",
    Component: PageInvoicesReport,
  },
  {
    path: "rentabilidad",
    routePath: "/reports/rentabilidad",
    label: "Rentabilidad",
    action: "reports_profitability_access",
    Component: PageProfitabilityReport,
  },
  {
    path: "comisiones",
    routePath: "/reports/comisiones",
    label: "Comisiones",
    action: "reports_commissions_access",
    Component: PageCommissionsReport,
  },
];

const Reports = () => {
  return (
    <div className={styles.container}>
      <Navbar />

      <NavbarReports />

      <main className={styles.pageContent}>
        <Routes>
          <Route index element={<PageReportsHome />} />

          {PROTECTED_REPORT_PAGES.map(
            ({ path, routePath, label, action, Component }) => (
              <Route
                key={path}
                path={path}
                element={
                  <ProtectedRoute
                    routePath={routePath}
                    routeLabel={label}
                    action={action}
                  >
                    <Component />
                  </ProtectedRoute>
                }
              />
            )
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
