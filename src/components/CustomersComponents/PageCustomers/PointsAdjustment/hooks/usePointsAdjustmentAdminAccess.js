import { useEffect, useState } from "react";

import {
  fetchCurrentAuthUser,
  fetchUserProfileWithRole,
} from "../services/pointsAdjustmentService";
import {
  ADMIN_AUTH_STORAGE_KEY,
  isAdminProfile,
} from "../services/pointsAdjustmentCalculationService";

/**
 * Verifica el rol administrativo antes de permitir el ajuste de puntos.
 *
 * La autorizacion obtenida desde el modal de administracion se recuerda en
 * `sessionStorage` durante la sesion de la pestana.
 */
export const usePointsAdjustmentAdminAccess = () => {
  const [adminAccessStatus, setAdminAccessStatus] = useState("checking");
  const [adminAccessMessage, setAdminAccessMessage] = useState("");

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        setAdminAccessStatus("checking");
        setAdminAccessMessage("");

        const wasAuthorizedFromModal =
          sessionStorage.getItem(ADMIN_AUTH_STORAGE_KEY) === "true";

        if (wasAuthorizedFromModal) {
          setAdminAccessStatus("allowed");
          return;
        }

        const authUser = await fetchCurrentAuthUser();

        if (!authUser?.id) {
          setAdminAccessStatus("denied");
          setAdminAccessMessage("No se pudo validar la sesión del usuario.");
          return;
        }

        const profile = await fetchUserProfileWithRole(authUser.id);

        if (!profile) {
          setAdminAccessStatus("denied");
          setAdminAccessMessage("No se encontró el perfil del usuario actual.");
          return;
        }

        if (!isAdminProfile(profile)) {
          setAdminAccessStatus("denied");
          setAdminAccessMessage(
            "Solo un administrador puede realizar ajustes manuales de puntos."
          );
          return;
        }

        sessionStorage.setItem(ADMIN_AUTH_STORAGE_KEY, "true");
        setAdminAccessStatus("allowed");
      } catch (err) {
        console.error("Error validando acceso administrativo:", err);
        setAdminAccessStatus("denied");
        setAdminAccessMessage("No se pudo validar el acceso administrativo.");
      }
    };

    checkAdminAccess();
  }, []);

  return { adminAccessMessage, adminAccessStatus };
};
