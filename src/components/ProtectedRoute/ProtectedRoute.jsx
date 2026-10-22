import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminAuthorizationModal from "../AdminAuthorizationModal/AdminAuthorizationModal";
import { checkUserIsAdmin } from "../../lib/permissionsService";
import { useAuth } from "../../contexts/AuthContext";
import { useBranch } from "../../contexts/BranchContext";
import styles from "./ProtectedRoute.module.css";

const ProtectedRoute = ({
  children,
  routePath,
  routeLabel,
  action,
  authorizedRoutes,
  onAuthorizedRoute,
  fallbackPath = "/dashboard",
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { branch } = useBranch();

  const isInitiallyAllowed = Boolean(authorizedRoutes?.has(routePath));

  const [checkingAccess, setCheckingAccess] = useState(!isInitiallyAllowed);
  const [isAllowed, setIsAllowed] = useState(isInitiallyAllowed);
  const [adminAuthOpen, setAdminAuthOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkAccess = async () => {
      if (authorizedRoutes?.has(routePath)) {
        setIsAllowed(true);
        setCheckingAccess(false);
        setAdminAuthOpen(false);
        return;
      }

      setCheckingAccess(true);
      setIsAllowed(false);
      setAdminAuthOpen(false);

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
    onAuthorizedRoute?.(routePath);
    setAdminAuthOpen(false);
    setIsAllowed(true);
    setCheckingAccess(false);
  };

  const handleCloseAdminAuth = () => {
    setAdminAuthOpen(false);
    setIsAllowed(false);
    setCheckingAccess(false);
    navigate(fallbackPath, { replace: true });
  };

  if (checkingAccess) {
    return <div className={styles.placeholder} aria-hidden="true" />;
  }

  if (!isAllowed) {
    return (
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
    );
  }

  return children;
};

export default ProtectedRoute;
