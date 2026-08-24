import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../../contexts/AuthContext";
import { checkUserIsAdmin } from "../../../../lib/permissionsService";

export const useProtectedNavigation = (onProtectedAccessAuthorized) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [adminAuthOpen, setAdminAuthOpen] = useState(false);
  const [pendingOption, setPendingOption] = useState(null);

  const handleProtectedNavigation = async (event, option) => {
    if (!option.requiresAdmin) {
      return;
    }

    event.preventDefault();

    const isAdmin = await checkUserIsAdmin(user?.id);

    if (isAdmin) {
      onProtectedAccessAuthorized?.(option.path);
      navigate(option.path);
      return;
    }

    setPendingOption(option);
    setAdminAuthOpen(true);
  };

  const handleAdminAuthorized = () => {
    if (!pendingOption?.path) {
      setAdminAuthOpen(false);
      setPendingOption(null);
      return;
    }

    const destination = pendingOption.path;

    onProtectedAccessAuthorized?.(destination);

    setAdminAuthOpen(false);
    setPendingOption(null);
    navigate(destination);
  };

  const handleCloseAdminAuth = () => {
    setAdminAuthOpen(false);
    setPendingOption(null);
  };

  return {
    adminAuthOpen,
    pendingOption,
    handleProtectedNavigation,
    handleAdminAuthorized,
    handleCloseAdminAuth,
  };
};