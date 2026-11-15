import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useBranch } from "../../contexts/BranchContext";
import {
  ADMIN_BRANCH_HOME_PATH,
  branchRequiresCashRegister,
  canBranchAccessPath,
} from "../../lib/permissionsService";

const AuthGuard = ({
  children,
  requireCashRegister = true,
  requireNoCashRegister = false,
}) => {
  const { isAuthenticated, isLocked, cashRegistered } = useAuth();
  const { branch } = useBranch();
  const { pathname } = useLocation();
  const usesCashRegister = branchRequiresCashRegister(branch);

  // 1. Validar Autenticación
  if (!isAuthenticated || isLocked) {
    return <Navigate to="/login" replace />;
  }

  // 2. Validar que tenga una caja abierta (si la ruta lo exige)
  if (requireCashRegister && usesCashRegister && !cashRegistered) {
    return <Navigate to="/cash-register" replace />;
  }

  // 3. Validar que NO tenga caja abierta (exclusivo para la ruta /cash-register).
  //    Una terminal admin no cobra: nunca abre caja y va directo a su inicio.
  if (requireNoCashRegister && !usesCashRegister) {
    return <Navigate to={ADMIN_BRANCH_HOME_PATH} replace />;
  }

  if (requireNoCashRegister && cashRegistered) {
    return <Navigate to="/dashboard" replace />;
  }

  // 4. Una terminal admin no entra a Ventas, Corte ni Facturacion
  if (!canBranchAccessPath(branch, pathname)) {
    return <Navigate to={ADMIN_BRANCH_HOME_PATH} replace />;
  }

  // 5. Si pasa todos los filtros, renderizar la pantalla solicitada
  return <>{children}</>;
};

export default AuthGuard;
