import React, { Suspense, lazy } from "react";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";

const Login = lazy(() => import("./pages/Login/Login"));
const CashRegister = lazy(() => import("./pages/CashRegister/CashRegister"));
const Dashboard = lazy(() => import("./pages/Dashboard/Dashboard"));
const Products = lazy(() => import("./pages/Products/Products"));
const Inventory = lazy(() => import("./pages/Inventory/Inventory"));
const Settings = lazy(() => import("./pages/Settings/Settings"));
const Profiles = lazy(() => import("./pages/Profiles/Profiles"));
const CashCut = lazy(() => import("./pages/CashCut/CashCut"));
const Invoices = lazy(() => import("./pages/Invoices/Invoices"));
const Customers = lazy(() => import("./pages/Customers/Customers"));
const Reports = lazy(() => import("./pages/Reports/Reports"));

import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { PendingTransfersProvider } from "./contexts/PendingTransfersContext";
import { ProductsProvider } from "./contexts/ProductsContext";
import useResponsiveScale from "./hooks/useResponsiveScale";
import AuthGuard from "./components/AuthGuard/AuthGuard";
import LoadingScreen from "./components/LoadingScreen/LoadingScreen";

function AppRoutes() {
  const { isAuthenticated, cashRegistered, setCashRegistered, loading, isLocked } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Router>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* RUTA PÚBLICA / LOGIN */}
          <Route
            path="/login"
            element={
              !isAuthenticated || isLocked
                ? <Login />
                : <Navigate to={cashRegistered ? "/dashboard" : "/cash-register"} replace />
            }
          />

          {/* APERTURA DE CAJA (No debe tener caja abierta) */}
          <Route
            path="/cash-register"
            element={
              <AuthGuard requireCashRegister={false} requireNoCashRegister={true}>
                <CashRegister setCashRegistered={setCashRegistered} />
              </AuthGuard>
            }
          />

          {/* RUTAS OPERATIVAS (Requieren sesión y caja abierta) */}
          <Route path="/dashboard" element={<AuthGuard><Dashboard setCashRegistered={setCashRegistered} /></AuthGuard>} />
          <Route path="/products/*" element={<AuthGuard><Products /></AuthGuard>} />
          <Route path="/cashcut/*" element={<AuthGuard><CashCut /></AuthGuard>} />
          <Route path="/inventory/*" element={<AuthGuard><Inventory /></AuthGuard>} />
          <Route path="/invoices/*" element={<AuthGuard><Invoices /></AuthGuard>} />
          <Route path="/customers/*" element={<AuthGuard><Customers /></AuthGuard>} />
          <Route path="/reports/*" element={<AuthGuard><Reports /></AuthGuard>} />

          {/* RUTAS ADMINISTRATIVAS (Requieren sesión, pero NO exigen caja abierta) */}
          <Route path="/settings" element={<AuthGuard requireCashRegister={false}><Settings /></AuthGuard>} />
          <Route path="/profiles" element={<AuthGuard requireCashRegister={false}><Profiles /></AuthGuard>} />

          {/* FALLBACK ROOT */}
          <Route
            path="/"
            element={
              <Navigate to={!isAuthenticated || isLocked ? "/login" : !cashRegistered ? "/cash-register" : "/dashboard"} replace />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

function App() {
  useResponsiveScale(1500, 850);

  return (
    <AuthProvider>
      <PendingTransfersProvider>
        <ProductsProvider>
          <AppRoutes />
        </ProductsProvider>
      </PendingTransfersProvider>
    </AuthProvider>
  );
}

export default App;
