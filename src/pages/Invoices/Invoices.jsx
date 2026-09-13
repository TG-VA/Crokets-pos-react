import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import NavbarInvoices from "../../components/InvoicesComponents/NavbarInvoices/NavbarInvoices";
import ProtectedRoute from "../../components/ProtectedRoute/ProtectedRoute";
import { PROTECTED_INVOICE_SECTIONS } from "../../config/adminProtectedSections";

import InvoicesPending from "../../components/InvoicesComponents/PageInvoices/InvoicesPending/InvoicesPending";
import InvoicesHistory from "../../components/InvoicesComponents/PageInvoices/InvoicesHistory/InvoicesHistory";
import InvoiceCustomers from "../../components/InvoicesComponents/PageInvoices/InvoiceCustomers/InvoiceCustomers";
import InvoiceSettings from "../../components/InvoicesComponents/PageInvoices/InvoiceSettings/InvoiceSettings";

import styles from "./Invoices.module.css";

const PROTECTED_INVOICE_COMPONENTS = {
  "/invoices/configuracion": InvoiceSettings,
};

const Invoices = () => {
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

      <NavbarInvoices onProtectedAccessAuthorized={handleAuthorizedRoute} />

      <div className={styles.pageContent}>
        <Routes>
          <Route index element={<InvoicesPending />} />
          <Route path="historial" element={<InvoicesHistory />} />
          <Route path="clientes" element={<InvoiceCustomers />} />

          {PROTECTED_INVOICE_SECTIONS.map(
            ({ routePath, routeLabel, action }) => {
              const Component = PROTECTED_INVOICE_COMPONENTS[routePath];

              return (
                <Route
                  key={routePath}
                  path={routePath.replace("/invoices/", "")}
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

          <Route path="*" element={<Navigate to="/invoices" replace />} />
        </Routes>
      </div>

      <Footer />
    </div>
  );
};

export default Invoices;
