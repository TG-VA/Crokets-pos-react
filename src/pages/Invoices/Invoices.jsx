import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import NavbarInvoices from "../../components/InvoicesComponents/NavbarInvoices/NavbarInvoices";

import InvoicesPending from "../../components/InvoicesComponents/PageInvoices/InvoicesPending/InvoicesPending";
import InvoicesHistory from "../../components/InvoicesComponents/PageInvoices/InvoicesHistory/InvoicesHistory";
import InvoiceCustomers from "../../components/InvoicesComponents/PageInvoices/InvoiceCustomers/InvoiceCustomers";
import InvoiceSettings from "../../components/InvoicesComponents/PageInvoices/InvoiceSettings/InvoiceSettings";

import styles from "./Invoices.module.css";

const Invoices = () => {
  return (
    <div className={styles.container}>
      <Navbar />
      <NavbarInvoices />

      <div className={styles.pageContent}>
        <Routes>
          <Route path="/" element={<InvoicesPending />} />
          <Route path="/historial" element={<InvoicesHistory />} />
          <Route path="/clientes" element={<InvoiceCustomers />} />
          <Route path="/configuracion" element={<InvoiceSettings />} />

          <Route path="*" element={<Navigate to="/invoices" replace />} />
        </Routes>
      </div>

      <Footer />
    </div>
  );
};

export default Invoices;