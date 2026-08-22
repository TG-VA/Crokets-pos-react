import React, { useEffect, useState } from "react";
import AdminAuthorizationModal from "../../AdminAuthorizationModal/AdminAuthorizationModal";
import { checkUserIsAdmin } from "../../../lib/permissionsService";
import { useAuth } from "../../../contexts/AuthContext";
import { useBranch } from "../../../contexts/BranchContext";
import styles from "./ProtectedProductRoute.module.css";

const ProtectedProductRoute = ({
  children,
  routePath,
  routeLabel,
  action,
  authorizedRoutes,
  onAuthorizedRoute,
}) => {
  const { user } = useAuth();
  const { branch } = useBranch();

  const [checkingAccess, setCheckingAccess] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);
  const [adminAuthOpen, setAdminAuthOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkAccess = async () => {
      setCheckingAccess(true);
      setIsAllowed(false);
      setAdminAuthOpen(false);

      if (authorizedRoutes.has(routePath)) {
        if (!isMounted) return;

        setIsAllowed(true);
        setCheckingAccess(false);
        return;
      }

      const isAdmin = await checkUserIsAdmin(user?.id);

      if (!isMounted) return;

      if (isAdmin) {
        setIsAllowed(true);
        setCheckingAccess(false);
        return;
      }

      setIsAllowed(false);
      setCheckingAccess(false);
      setAdminAuthOpen(true);
    };

    checkAccess();

    return () => {
      isMounted = false;
    };
  }, [user?.id, routePath, authorizedRoutes]);

  const handleAdminAuthorized = () => {
    onAuthorizedRoute(routePath);
    setAdminAuthOpen(false);
    setIsAllowed(true);
    setCheckingAccess(false);
  };

  const handleCloseAdminAuth = () => {
    setAdminAuthOpen(false);
    setIsAllowed(false);
    setCheckingAccess(false);
  };

  if (checkingAccess) {
    return <div className={styles.accessMessage}>Verificando acceso...</div>;
  }

  if (!isAllowed) {
    return (
      <>
        <div className={styles.accessMessage}>
          Se requiere autorización de administrador para entrar a esta sección.
        </div>

        <AdminAuthorizationModal
          isOpen={adminAuthOpen}
          onClose={handleCloseAdminAuth}
          onAuthorized={handleAdminAuthorized}
          action={action}
          title="Acceso restringido"
          message={`Para entrar a la sección "${routeLabel}", se requiere autorización de un administrador.`}
          targetId={routePath}
          branchId={branch?.id || null}
        />
      </>
    );
  }

  return children;
};

export default ProtectedProductRoute;