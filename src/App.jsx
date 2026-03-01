import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Importa los componentes de las páginas
import Login from './pages/Login/Login';
import CashRegister from './pages/CashRegister/CashRegister';
import Dashboard from './pages/Dashboard/Dashboard';
import Products from './pages/Products/Products';
import Settings from './pages/Settings/Settings';
import Profiles from './pages/Profiles/Profiles';
import CashCut from "./pages/CashCut/CashCut";

// Importa el contexto de autenticación
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProductsProvider } from './contexts/ProductsContext';

function AppRoutes() {
  const { isAuthenticated, cashRegistered, setCashRegistered } = useAuth();

  return (
    <Router>
      <Routes>
        {/* Ruta de login */}
        <Route
          path="/login"
          element={
            !isAuthenticated ? (
              <Login key={Date.now()} />
            ) : (
              <Navigate
                to={cashRegistered ? '/dashboard' : '/cash-register'}
                replace
              />
            )
          }
        />

        {/* Ruta de caja registradora */}
        <Route
          path="/cash-register"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : cashRegistered ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <CashRegister setCashRegistered={setCashRegistered} />
            )
          }
        />

        {/* Ruta de dashboard */}
        <Route
          path="/dashboard"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : !cashRegistered ? (
              <Navigate to="/cash-register" replace />
            ) : (
              <Dashboard setCashRegistered={setCashRegistered} />
            )
          }
        />

        {/* Ruta de productos con subrutas */}
        <Route
          path="/products/*"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : !cashRegistered ? (
              <Navigate to="/cash-register" replace />
            ) : (
              <Products />
            )
          }
        />

        {/* Ruta de corte de caja */}
        <Route
          path="/cashcut/*"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : !cashRegistered ? (
              <Navigate to="/cash-register" replace />
            ) : (
              <CashCut />
            )
          }
        />

        {/* Ruta de configuración */}
        <Route
          path="/settings"
          element={
            isAuthenticated ? (
              <Settings />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Ruta de perfiles/usuarios */}
        <Route
          path="/profiles"
          element={
            isAuthenticated ? (
              <Profiles />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Ruta raíz - redirige según estado */}
        <Route
          path="/"
          element={
            <Navigate
              to={
                !isAuthenticated
                  ? '/login'
                  : !cashRegistered
                  ? '/cash-register'
                  : '/dashboard'
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
  return (
    <AuthProvider>
      <ProductsProvider>
        <AppRoutes />
      </ProductsProvider>
    </AuthProvider>
  );
}

export default App;