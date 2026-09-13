import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";
import { checkUserIsAdmin } from "../lib/permissionsService";

/**
 * Hook compartido de navegación protegida por autorización de administrador.
 *
 * Intercepta el click sobre items de un navbar ANTES de que React Router navegue:
 * si el item está marcado como protegido (lleva `action`) y el usuario NO es administrador,
 * la navegación NO ocurre (el usuario se queda exactamente en la página donde estaba) y se
 * abre el modal compartido de autorización encima de la página actual.
 *
 * - Alguno admin -> navega directo (comportamiento actual).
 * - no-admin -> se queda donde está, abre el modal; al autorizar con credenciales válidas
 *   recién ahí navega al destino pendiente.
 * - Cerrar el modal sin autorizar -> todo queda igual (nada se movió).
 *
 * Uso (SRP): un navbar renderiza UNA instancia del modal compartido y delega el click en
 * `handleNavigation(option, event)`, pasando a cada item protegido los mismos campos que ya
 * usa ProtectedRoute (`action`, `routeLabel`, `routePath`/`targetId`, `branchId`).
 *
 * La página del módulo es dueña del registro `authorizedRoutes` (Set por montaje, igual que
 * antes de consolidar el guard): al autorizar, este hook notifica `onProtectedAccessAuthorized`
 * con el `routePath` para que el guard compartido reconozca la ruta como autorizada y no vuelva
 * a pedir credenciales al montarse tras la navegación.
 */
const useProtectedNavigation = (onProtectedAccessAuthorized) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [adminAuthOpen, setAdminAuthOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);

  const handleNavigation = async (option, event) => {
    event?.preventDefault();

    if (!option?.action) {
      navigate(option.path);
      return;
    }

    const isAdmin = await checkUserIsAdmin(user?.id);

    if (isAdmin) {
      navigate(option.path);
      return;
    }

    setPendingNavigation(option);
    setAdminAuthOpen(true);
  };

  const handleAuthorized = () => {
    setAdminAuthOpen(false);
    if (pendingNavigation) {
      onProtectedAccessAuthorized?.(pendingNavigation.routePath);
      navigate(pendingNavigation.path);
    }
    clearPending();
  };

  const clearPending = () => setPendingNavigation(null);

  const handleClose = () => {
    setAdminAuthOpen(false);
    clearPending();
  };

  return {
    handleNavigation,
    adminAuthOpen,
    onCloseAdminAuth: handleClose,
    onAuthorizedAdminAuth: handleAuthorized,
    pendingNavigation,
  };
};

export default useProtectedNavigation;
