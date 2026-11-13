import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { checkUserIsAdmin } from "../lib/permissionsService";

/**
 * Estado del rol de administrador del usuario en sesion.
 * `loading` es true mientras no hay respuesta para el usuario actual, para que
 * la interfaz no muestre un rechazo antes de conocer el rol.
 * Sirve para ocultar acciones en la interfaz; no es un control de seguridad.
 */
export const useAdminStatus = () => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [adminState, setAdminState] = useState({
    userId: null,
    isAdmin: false,
  });

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;

    checkUserIsAdmin(userId)
      .then((isAdmin) => {
        if (!cancelled) setAdminState({ userId, isAdmin: Boolean(isAdmin) });
      })
      .catch((error) => {
        console.error("Error verificando rol de administrador:", error);
        if (!cancelled) setAdminState({ userId, isAdmin: false });
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const resolved = Boolean(userId) && adminState.userId === userId;
  return {
    isAdmin: resolved && adminState.isAdmin,
    loading: Boolean(userId) && !resolved,
  };
};

/**
 * Indica si el usuario en sesion es administrador (false mientras carga).
 */
export const useIsAdmin = () => useAdminStatus().isAdmin;
