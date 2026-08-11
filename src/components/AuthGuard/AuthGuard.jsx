import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const AuthGuard = ({ children, requireCashRegister = true, requireNoCashRegister = false }) => {
  const { isAuthenticated, isLocked, cashRegistered } = useAuth();

  // 1. Validar Autenticación
  if (!isAuthenticated || isLocked) {
    return <Navigate to="/login" replace />;
  }

  // 2. Validar que tenga una caja abierta (si la ruta lo exige)
  if (requireCashRegister && !cashRegistered) {
    return <Navigate to="/cash-register" replace />;
  }

  // 3. Validar que NO tenga caja abierta (exclusivo para la ruta /cash-register)
  if (requireNoCashRegister && cashRegistered) {
    return <Navigate to="/dashboard" replace />;
  }

  // 4. Si pasa todos los filtros, renderizar la pantalla solicitada
  return <>{children}</>;
};

export default AuthGuard;