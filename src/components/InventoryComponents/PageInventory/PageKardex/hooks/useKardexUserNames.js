import { useEffect, useRef, useState } from "react";

import { loadUsers } from "../../PageMovementsReport/services/movementsReportService";

const buildUserIdsKey = (userIds) =>
  [...new Set((userIds ?? []).filter(Boolean).map(String))].sort().join("|");

/**
 * Resuelve en lote los nombres de usuario de los movimientos visibles. Reusa
 * la lectura de `users` del reporte de movimientos y solo pide los ids que
 * aun no se conocen. Devuelve un Map id -> username.
 */
const useKardexUserNames = (userIds) => {
  const [userNamesById, setUserNamesById] = useState(() => new Map());

  const requestedIdsRef = useRef(new Set());

  const userIdsKey = buildUserIdsKey(userIds);

  useEffect(() => {
    const missingIds = userIdsKey
      ? userIdsKey
          .split("|")
          .filter((userId) => !requestedIdsRef.current.has(userId))
      : [];

    if (missingIds.length === 0) {
      return;
    }

    missingIds.forEach((userId) => requestedIdsRef.current.add(userId));

    loadUsers(missingIds)
      .then((users) => {
        setUserNamesById((currentMap) => {
          const nextMap = new Map(currentMap);

          users.forEach((user) => {
            const username = String(user?.username ?? "").trim();

            if (user?.id && username) {
              nextMap.set(String(user.id), username.toUpperCase());
            }
          });

          return nextMap;
        });
      })
      .catch((error) => {
        console.error("Error cargando usuarios del kardex:", error);

        missingIds.forEach((userId) => requestedIdsRef.current.delete(userId));
      });
  }, [userIdsKey]);

  return userNamesById;
};

export default useKardexUserNames;
