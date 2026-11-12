import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { checkUserIsAdmin } from "../lib/permissionsService";

/**
 * Indica si el usuario en sesion es administrador.
 * Sirve para ocultar acciones en la interfaz; no es un control de seguridad.
 */
export const useIsAdmin = () => {
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

  return Boolean(userId) && adminState.userId === userId && adminState.isAdmin;
};
