import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// Importa los componentes de las páginas.
import Login from './pages/Login/Login';
import CashRegister from './pages/CashRegister/CashRegister';
import Dashboard from './pages/Dashboard/Dashboard';
import Products from './pages/Products/Products';

function App() {
  // Estado de autenticación del usuario.
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // Estado que indica si la caja ya se abrió.
  const [cashRegistered, setCashRegistered] = useState(false);
  // Estado para validar al usuario admin con sus permisos
  const [isAdmin, setIsAdmin] = useState(false);

  return (
    <Router>
      <Routes>
        {/* Ruta de login - accesible solo si no está autenticado */}
        <Route 
          path="/login" 
          element={
            !isAuthenticated ? 
              <Login setIsAuthenticated={setIsAuthenticated} /> : 
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
                setIsAuthenticated={setIsAuthenticated}
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
                setIsAuthenticated={setIsAuthenticated}
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
      </Routes>
    </Router>
  );
}

export default App;