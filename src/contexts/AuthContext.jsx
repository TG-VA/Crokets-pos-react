import React, { createContext, useContext, useState } from 'react';

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [cashRegistered, setCashRegistered] = useState(false);

  // Función para realizar login
  const login = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
  };

  // Función para realizar logout
  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setCashRegistered(false);
  };

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
    setIsAuthenticated
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
