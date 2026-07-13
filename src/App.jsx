import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login/Login";
import CashRegister from "./pages/CashRegister/CashRegister";
import Dashboard from "./pages/Dashboard/Dashboard";
import Products from "./pages/Products/Products";
import Inventory from "./pages/Inventory/Inventory";
import Settings from "./components/settingsComponents/Settings/Settings";
import Profiles from "./components/settingsComponents/Profiles/Profiles";
import CashCut from "./pages/CashCut/CashCut";
import Invoices from "./pages/Invoices/Invoices";
import Customers from "./pages/Customers/Customers";
import Reports from "./pages/Reports/Reports";

import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ProductsProvider } from "./contexts/ProductsContext";
import useResponsiveScale from "./hooks/useResponsiveScale";
import AuthGuard from "./components/AuthGuard/AuthGuard";

function AppRoutes() {
  const { isAuthenticated, cashRegistered, setCashRegistered, loading, isLocked } = useAuth();

  if (loading) {
    return <div>Iniciando punto de venta...</div>;
  }

  return (
    <Router>
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