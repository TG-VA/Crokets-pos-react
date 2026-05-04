<<<<<<< HEAD
import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import NavbarInvoices from "../../components/InvoicesComponents/NavbarInvoices/NavbarInvoices";

import InvoicesPending from "../../components/InvoicesComponents/PageInvoices/InvoicesPending/InvoicesPending";
import InvoicesHistory from "../../components/InvoicesComponents/PageInvoices/InvoicesHistory/InvoicesHistory";
import InvoiceCustomers from "../../components/InvoicesComponents/PageInvoices/InvoiceCustomers/InvoiceCustomers";
import InvoiceSettings from "../../components/InvoicesComponents/PageInvoices/InvoiceSettings/InvoiceSettings";

import AdminAuthorizationModal from "../../components/AdminAuthorizationModal/AdminAuthorizationModal";
import { checkUserIsAdmin } from "../../lib/permissionsService";
import { useAuth } from "../../contexts/AuthContext";
import { useBranch } from "../../contexts/BranchContext";

import styles from "./Invoices.module.css";

const ProtectedInvoiceRoute = ({
  children,
  routePath,
  routeLabel,
  action,
  authorizedRoutes,
  onAuthorizedRoute,
}) => {
  const { user } = useAuth();
  const { branch } = useBranch();

  const [checkingAccess, setCheckingAccess] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);
  const [adminAuthOpen, setAdminAuthOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkAccess = async () => {
      setCheckingAccess(true);
      setIsAllowed(false);
      setAdminAuthOpen(false);

      if (authorizedRoutes.has(routePath)) {
        if (!isMounted) return;

        setIsAllowed(true);
        setCheckingAccess(false);
        return;
      }

      const isAdmin = await checkUserIsAdmin(user?.id);

      if (!isMounted) return;

      if (isAdmin) {
        setIsAllowed(true);
        setCheckingAccess(false);
        return;
      }

      setIsAllowed(false);
      setCheckingAccess(false);
      setAdminAuthOpen(true);
    };

    checkAccess();

    return () => {
      isMounted = false;
    };
  }, [user?.id, routePath, authorizedRoutes]);

  const handleAdminAuthorized = () => {
    onAuthorizedRoute(routePath);
    setAdminAuthOpen(false);
    setIsAllowed(true);
    setCheckingAccess(false);
  };

  const handleCloseAdminAuth = () => {
    setAdminAuthOpen(false);
    setIsAllowed(false);
    setCheckingAccess(false);
  };

  if (checkingAccess) {
    return <div className={styles.accessMessage}>Verificando acceso...</div>;
  }

  if (!isAllowed) {
    return (
      <>
        <div className={styles.accessMessage}>
          Se requiere autorización de administrador para entrar a esta sección.
        </div>

        <AdminAuthorizationModal
          isOpen={adminAuthOpen}
          onClose={handleCloseAdminAuth}
          onAuthorized={handleAdminAuthorized}
          action={action}
          title="Acceso restringido"
          message={`Para entrar a la sección "${routeLabel}", se requiere autorización de un administrador.`}
          targetId={routePath}
          branchId={branch?.id || null}
        />
      </>
    );
  }

  return children;
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
          <Route path="/" element={<InvoicesPending />} />
          <Route path="/historial" element={<InvoicesHistory />} />
          <Route path="/clientes" element={<InvoiceCustomers />} />

          <Route
            path="/configuracion"
            element={
              <ProtectedInvoiceRoute
                routePath="/invoices/configuracion"
                routeLabel="Configuración CFDI"
                action="invoice_settings_access"
                authorizedRoutes={authorizedRoutes}
                onAuthorizedRoute={handleAuthorizedRoute}
              >
                <InvoiceSettings />
              </ProtectedInvoiceRoute>
            }
          />

          <Route path="*" element={<Navigate to="/invoices" replace />} />
        </Routes>
      </div>

=======
import React from "react";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import styles from "./Invoices.module.css";

const Invoices = () => {
  return (
    <div className={styles.container}>
      <Navbar />
      <main className={styles.main} />
>>>>>>> bd8a423 (InventoryPage v1)
      <Footer />
    </div>
  );
};

<<<<<<< HEAD
export default Invoices;
=======
export default Invoices;
>>>>>>> bd8a423 (InventoryPage v1)
