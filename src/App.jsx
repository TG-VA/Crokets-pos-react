import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// Importa los componentes de las páginas.
import Login from './pages/Login/Login';
import CashRegister from './pages/CashRegister/CashRegister';
import Dashboard from './pages/Dashboard/Dashboard';
import Products from './pages/Products/Products';
import Settings from './pages/Settings/Settings';
import Profiles from './pages/Profiles/Profiles';
// Importa el contexto de autenticación
import { AuthProvider, useAuth } from './contexts/AuthContext';

function AppRoutes() {
  const { isAuthenticated, cashRegistered, setCashRegistered } = useAuth();

  return (
    <Router>
      <Routes>
        {/* Ruta de login - accesible solo si no está autenticado */}
        <Route 
          path="/login" 
          element={
            !isAuthenticated ? 
              <Login /> : 
              <Navigate to={cashRegistered ? "/dashboard" : "/cash-register"} replace />
          } 
        />
        
        {/* Ruta de caja registradora */}
        <Route 
          path="/cash-register" 
          element={
            isAuthenticated ?
              <CashRegister 
                setCashRegistered={setCashRegistered}
              /> : 
              <Navigate to="/login" replace />
          } 
        />
        
        {/* Ruta de dashboard */}
        <Route 
          path="/dashboard" 
          element={
            cashRegistered ? 
              <Dashboard 
                setCashRegistered={setCashRegistered}
              /> : 
              <Navigate to="/cash-register" replace />
          } 
        />
        
        {/* Ruta de productos */}
        <Route 
          path="/products" 
          element={
            cashRegistered ? 
              <Products /> : 
              <Navigate to="/cash-register" replace />
          } 
        />
        
        {/* Ruta raíz - redirige según estado */}
        <Route 
          path="/" 
          element={
            <Navigate to={
              isAuthenticated ? 
                (cashRegistered ? "/dashboard" : "/cash-register") : 
                "/login"
            } replace />
          } 
        />

        {/* Ruta de configuración */}
        <Route 
          path="/settings" 
          element={
            isAuthenticated ?
            <Settings /> :
            <Navigate to="/login" replace />
          }
        />

        {/* Ruta de perfiles/usuarios */}
        <Route 
          path="/profiles" 
          element={
            isAuthenticated ?
            <Profiles /> :
            <Navigate to="/login" replace />
          }
        />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
