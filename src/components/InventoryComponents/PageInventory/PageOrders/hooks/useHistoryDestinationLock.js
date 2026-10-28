import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../../../../../contexts/AuthContext";
import { checkUserIsAdmin } from "../../../../../lib/permissionsService";
import { getHistoryDestinationLock } from "../utils/ordersHistoryDestinationLock";

/**
 * Devuelve el id de destino fijo del historial, o null si el filtro es libre.
 * Mientras se resuelve el rol se asume no administrador (bloqueado).
 */
export const useHistoryDestinationLock = (activeBranchId) => {
  const { user } = useAuth();
  const userId = user?.id;
  const [adminCheck, setAdminCheck] = useState({
    userId: null,
    isAdmin: false,
  });

  useEffect(() => {
    let cancelled = false;

    checkUserIsAdmin(userId)
      .then((result) => {
        if (!cancelled) setAdminCheck({ userId, isAdmin: result === true });
      })
      .catch((err) => {
        console.error("Error al verificar el rol del usuario:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const isAdmin = adminCheck.isAdmin && adminCheck.userId === userId;

  return useMemo(
    () => getHistoryDestinationLock({ isAdmin, activeBranchId }),
    [isAdmin, activeBranchId]
  ).lockedDestinationId;
};
