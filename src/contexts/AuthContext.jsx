import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }

  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  const [cashRegistered, setCashRegistered] = useState(
    localStorage.getItem('cashRegistered') === 'true'
  );

  const [cashAmount, setCashAmount] = useState(() => {
    const stored = localStorage.getItem('cashAmount');
    return stored ? parseFloat(stored) : 0;
  });

  const [isLocked, setIsLocked] = useState(
    localStorage.getItem('isLocked') === 'true'
  );

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    localStorage.setItem('cashRegistered', String(cashRegistered));
  }, [cashRegistered]);

  useEffect(() => {
    localStorage.setItem('cashAmount', String(cashAmount));
  }, [cashAmount]);

  useEffect(() => {
    localStorage.setItem('isLocked', String(isLocked));
  }, [isLocked]);

  const buildUser = (authUser) => {
    const cachedUsername = localStorage.getItem('cachedUsername');

    const username =
      cachedUsername ||
      authUser?.user_metadata?.username ||
      authUser?.email?.split('@')[0] ||
      null;

    return {
      ...authUser,
      username,
    };
  };

  useEffect(() => {
    let isMounted = true;
    let watchdogId = null;

    const initSession = async () => {
      try {
        watchdogId = window.setTimeout(() => {
          if (isMounted) setLoading(false);
        }, 3000);

        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error obteniendo sesión inicial:', error.message);
        }

        const session = data?.session ?? null;

        if (!isMounted) return;

        if (session?.user) {
          setUser(buildUser(session.user));
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error('Error en initSession:', err);

        if (!isMounted) return;

        setUser(null);
        setIsAuthenticated(false);
      } finally {
        if (watchdogId) {
          clearTimeout(watchdogId);
          watchdogId = null;
        }
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      try {
        if (!isMounted) return;

        if (session?.user) {
          setUser(buildUser(session.user));
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error('Error en onAuthStateChange:', err);

        if (!isMounted) return;

        setUser(null);
        setIsAuthenticated(false);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      if (watchdogId) {
        clearTimeout(watchdogId);
        watchdogId = null;
      }
      subscription.unsubscribe();
    };
  }, []);

  const login = (userData) => {
    const finalUser = {
      ...userData,
      username:
        userData?.username ||
        userData?.user_metadata?.username ||
        userData?.email?.split('@')[0] ||
        null,
    };

    if (finalUser?.username) {
      localStorage.setItem('cachedUsername', finalUser.username);
    }

    setUser(finalUser);
    setIsAuthenticated(true);
    setIsLocked(false);

    localStorage.setItem('isLocked', 'false');
  };

  const logout = async () => {
    try {
      const sessionToken = localStorage.getItem('user_session_token');

      if (sessionToken) {
        const { error: closeUserSessionError } = await supabase
          .from('user_sessions')
          .update({
            ended_at: new Date().toISOString(),
            status: 'ended',
          })
          .eq('session_token', sessionToken)
          .is('ended_at', null);

        if (closeUserSessionError) {
          console.error(
            'Error cerrando user_session:',
            closeUserSessionError.message
          );
        }
      }

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Error al cerrar sesión en Supabase:', error.message);
        throw error;
      }

      setIsAuthenticated(false);
      setUser(null);
      setCashRegistered(false);
      setCashAmount(0);
      setIsLocked(false);

      localStorage.removeItem('cashRegistered');
      localStorage.removeItem('cashAmount');
      localStorage.removeItem('user_session_token');
      localStorage.removeItem('isLocked');
      localStorage.removeItem('cachedUsername');
      localStorage.removeItem('current_branch');
    } catch (err) {
      console.error('Error general en logout:', err);
      throw err;
    }
  };

  const openCashRegister = (amount) => {
    setCashRegistered(true);
    setCashAmount(amount);

    localStorage.setItem('cashRegistered', 'true');
    localStorage.setItem('cashAmount', String(amount));
  };

  const closeCashRegister = () => {
    setCashRegistered(false);
    setCashAmount(0);

    localStorage.setItem('cashRegistered', 'false');
    localStorage.setItem('cashAmount', '0');
  };

  const lockScreen = () => {
    setIsLocked(true);
    localStorage.setItem('isLocked', 'true');
  };

  const unlockScreen = () => {
    setIsLocked(false);
    localStorage.setItem('isLocked', 'false');
  };

  const updateUser = (userData) => {
    setUser(userData);

    if (userData?.username) {
      localStorage.setItem('cachedUsername', userData.username);
    }
  };

  const value = {
    isAuthenticated,
    user,
    cashRegistered,
    cashAmount,
    isLocked,
    loading,
    setCashRegistered,
    setIsAuthenticated,
    setUser,
    setIsLocked,
    login,
    logout,
    updateUser,
    openCashRegister,
    closeCashRegister,
    lockScreen,
    unlockScreen,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
