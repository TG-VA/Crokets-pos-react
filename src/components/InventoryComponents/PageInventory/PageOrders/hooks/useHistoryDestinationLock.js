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
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setIsAdmin(false);

    checkUserIsAdmin(userId).then((result) => {
      if (!cancelled) setIsAdmin(result === true);
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return useMemo(
    () => getHistoryDestinationLock({ isAdmin, activeBranchId }),
    [isAdmin, activeBranchId]
  ).lockedDestinationId;
};
