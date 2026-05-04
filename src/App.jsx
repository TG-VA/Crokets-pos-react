import React from "react";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login/Login";
import CashRegister from "./pages/CashRegister/CashRegister";
import Dashboard from "./pages/Dashboard/Dashboard";
import Products from "./pages/Products/Products";
import Inventory from "./pages/Inventory/Inventory";
import Settings from "./pages/Settings/Settings";
import Profiles from "./pages/Profiles/Profiles";
import CashCut from "./pages/CashCut/CashCut";
import Invoices from "./pages/Invoices/Invoices";
import Customers from "./pages/Customers/Customers";

import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ProductsProvider } from "./contexts/ProductsContext";
import useResponsiveScale from "./hooks/useResponsiveScale";

function AppRoutes() {
  const {
    isAuthenticated,
    cashRegistered,
    setCashRegistered,
    loading,
    isLocked,
  } = useAuth();

  if (loading) {
    return <div>Iniciando punto de venta...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            !isAuthenticated || isLocked ? (
              <Login />
            ) : (
              <Navigate
                to={cashRegistered ? "/dashboard" : "/cash-register"}
                replace
              />
            )
          }
        />

        <Route
          path="/cash-register"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : isLocked ? (
              <Navigate to="/login" replace />
            ) : cashRegistered ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <CashRegister setCashRegistered={setCashRegistered} />
            )
          }
        />

        <Route
          path="/dashboard"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : isLocked ? (
              <Navigate to="/login" replace />
            ) : !cashRegistered ? (
              <Navigate to="/cash-register" replace />
            ) : (
              <Dashboard setCashRegistered={setCashRegistered} />
            )
          }
        />

        <Route
          path="/products/*"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : isLocked ? (
              <Navigate to="/login" replace />
            ) : !cashRegistered ? (
              <Navigate to="/cash-register" replace />
            ) : (
              <Products />
            )
          }
        />

        <Route
          path="/cashcut/*"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : isLocked ? (
              <Navigate to="/login" replace />
            ) : !cashRegistered ? (
              <Navigate to="/cash-register" replace />
            ) : (
              <CashCut />
            )
          }
        />

        <Route
          path="/inventory/*"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : isLocked ? (
              <Navigate to="/login" replace />
            ) : !cashRegistered ? (
              <Navigate to="/cash-register" replace />
            ) : (
              <Inventory />
            )
          }
        />

        <Route
          path="/invoices/*"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : isLocked ? (
              <Navigate to="/login" replace />
            ) : !cashRegistered ? (
              <Navigate to="/cash-register" replace />
            ) : (
              <Invoices />
            )
          }
        />

        <Route
          path="/customers/*"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : isLocked ? (
              <Navigate to="/login" replace />
            ) : !cashRegistered ? (
              <Navigate to="/cash-register" replace />
            ) : (
              <Customers />
            )
          }
        />

        <Route
          path="/settings"
          element={
            isAuthenticated && !isLocked ? (
              <Settings />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/profiles"
          element={
            isAuthenticated && !isLocked ? (
              <Profiles />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/"
          element={
            <Navigate
              to={
                !isAuthenticated || isLocked
                  ? "/login"
                  : !cashRegistered
                  ? "/cash-register"
                  : "/dashboard"
              }
              replace
            />
          }
        />
      </Routes>
    </Router>
  );
}

function App() {
  useResponsiveScale(1500, 850);

  return (
    <AuthProvider>
      <ProductsProvider>
        <AppRoutes />
      </ProductsProvider>
    </AuthProvider>
  );
}

export default App;
