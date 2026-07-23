import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import NavbarReports from "../../components/ReportsComponents/NavbarReports/NavbarReports";

import PageReportsHome from "../../components/ReportsComponents/PageReports/PageReportsHome/PageReportsHome";
import PageSalesReport from "../../components/ReportsComponents/PageReports/PageSalesReport/PageSalesReport";
import PageProductsReport from "../../components/ReportsComponents/PageReports/PageProductsReport/PageProductsReport";
import PageInventoryReport from "../../components/ReportsComponents/PageReports/PageInventoryReport/PageInventoryReport";
import PageCashReport from "../../components/ReportsComponents/PageReports/PageCashReport/PageCashReport";
import PageCustomersReport from "../../components/ReportsComponents/PageReports/PageCustomersReport/PageCustomersReport";
import PageInvoicesReport from "../../components/ReportsComponents/PageReports/PageInvoicesReport/PageInvoicesReport";
import PageProfitabilityReport from "../../components/ReportsComponents/PageReports/PageProfitabilityReport/PageProfitabilityReport";

import styles from "./Reports.module.css";

const Reports = () => {
  return (
    <div className={styles.container}>
      <Navbar />

      <NavbarReports />

      <main className={styles.pageContent}>
        <Routes>
          <Route index element={<PageReportsHome />} />
          <Route path="ventas" element={<PageSalesReport />} />
          <Route path="productos" element={<PageProductsReport />} />
          <Route path="inventario" element={<PageInventoryReport />} />
          <Route path="caja" element={<PageCashReport />} />
          <Route path="clientes" element={<PageCustomersReport />} />
          <Route path="facturacion" element={<PageInvoicesReport />} />
          <Route
            path="rentabilidad"
            element={<PageProfitabilityReport />}
          />

          <Route path="*" element={<Navigate to="/reports" replace />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
};

export default Reports;