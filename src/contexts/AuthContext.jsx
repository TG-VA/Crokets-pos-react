import React, { createContext, useContext, useState, useEffect } from 'react';

// Crear el contexto de autenticación
const AuthContext = createContext();

// Hook personalizado para usar el contexto de autenticación
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

// Proveedor del contexto de autenticación
export const AuthProvider = ({ children }) => {
  // Inicializa desde localStorage si existe
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [cashRegistered, setCashRegistered] = useState(() => {
    return localStorage.getItem('cashRegistered') === 'true';
  });
  const [cashAmount, setCashAmount] = useState(() => {
    const stored = localStorage.getItem('cashAmount');
    return stored ? parseFloat(stored) : 0;
  });

  // Sincroniza cambios con localStorage
  useEffect(() => {
    localStorage.setItem('cashAmount', cashAmount);
  }, [cashAmount]);

  useEffect(() => {
    localStorage.setItem('isAuthenticated', isAuthenticated);
  }, [isAuthenticated]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('cashRegistered', cashRegistered);
  }, [cashRegistered]);

  // Función para realizar login
  const login = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('user', JSON.stringify(userData));
  };

  // Función para realizar logout
  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setCashRegistered(false);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user');
    localStorage.removeItem('cashRegistered');
    return Promise.resolve(); // Asegura que sea asíncrono
  };

  //Funcion para cuando se abre la caja
  const openCashRegister = (amount) => {
    setCashRegistered(true);
    setCashAmount(amount);
    localStorage.setItem('cashRegistered', 'true');
    localStorage.setItem('cashAmount', amount);
  };

  //Funcion para cuando se hace el corte
  const closeCashRegister = () => {
    setCashRegistered(false);
    setCashAmount(0);
    localStorage.setItem('cashRegistered', 'false');
    localStorage.setItem('cashAmount', '0');
  }

  // Función para actualizar datos del usuario
  const updateUser = (userData) => {
    setUser(userData);
  };

  const value = {
    isAuthenticated,
    user,
    cashRegistered,
    setCashRegistered,
    login,
    logout,
    updateUser,
    setIsAuthenticated,
    openCashRegister,
    closeCashRegister
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
