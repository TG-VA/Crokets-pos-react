import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../../../../contexts/AuthContext";
import { checkUserIsAdmin } from "../../../../../lib/permissionsService";
import { fetchBranchesCatalog } from "../services/branchesReportService";
import {
  createBranch,
  updateBranchContact,
  setBranchActive,
} from "../services/branchesMutationService";

export const BRANCH_STATUS_FILTERS = {
  ALL: "all",
  ACTIVE: "active",
  INACTIVE: "inactive",
};

export const useSettingsBranches = () => {
  const { user } = useAuth();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);
  const [statusFilter, setStatusFilter] = useState(BRANCH_STATUS_FILTERS.ALL);
  const [searchTerm, setSearchTerm] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [formModal, setFormModal] = useState({ isOpen: false, branch: null });
  const [toggleModal, setToggleModal] = useState({
    isOpen: false,
    branch: null,
  });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    checkUserIsAdmin(user.id).then((result) => {
      if (!mountedRef.current) return;
      setIsAdmin(result);
      setAdminChecked(true);
    });
  }, [user]);

  const loadCatalog = useCallback(async () => {
    const result = await fetchBranchesCatalog();
    if (!mountedRef.current) return result;
    setBranches(result.success ? result.data : []);
    setLoadError(result.success ? null : result.error);
    setLoading(false);
    return result;
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchBranchesCatalog().then((result) => {
      if (cancelled || !mountedRef.current) return;
      setBranches(result.success ? result.data : []);
      setLoadError(result.success ? null : result.error);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredBranches = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return branches.filter((branch) => {
      if (statusFilter === BRANCH_STATUS_FILTERS.ACTIVE && !branch.isActive) {
        return false;
      }
      if (statusFilter === BRANCH_STATUS_FILTERS.INACTIVE && branch.isActive) {
        return false;
      }
      if (!term) return true;
      return (
        branch.name.toLowerCase().includes(term) ||
        branch.code.toLowerCase().includes(term)
      );
    });
  }, [branches, statusFilter, searchTerm]);

  const metrics = useMemo(() => {
    const total = branches.length;
    const active = branches.filter((branch) => branch.isActive).length;
    const terminals = branches.reduce(
      (sum, branch) => sum + (Number(branch.posDevicesCount) || 0),
      0
    );
    return { total, active, inactive: total - active, terminals };
  }, [branches]);

  const openCreateModal = useCallback(() => {
    setFeedback(null);
    setFormModal({ isOpen: true, branch: null });
  }, []);

  const openEditModal = useCallback((branch) => {
    setFeedback(null);
    setFormModal({ isOpen: true, branch });
  }, []);

  const closeFormModal = useCallback(() => {
    setFormModal({ isOpen: false, branch: null });
  }, []);

  const openToggleModal = useCallback((branch) => {
    setFeedback(null);
    setToggleModal({ isOpen: true, branch });
  }, []);

  const closeToggleModal = useCallback(() => {
    setToggleModal({ isOpen: false, branch: null });
  }, []);

  const handleCreateBranch = useCallback(
    async (formValues) => {
      setSaving(true);
      const result = await createBranch({
        ...formValues,
        adminId: user?.id,
      });
      if (!mountedRef.current) return false;
      setSaving(false);
      if (result.success) {
        setFeedback({
          type: "success",
          message: result.data?.name
            ? `Sucursal "${result.data.name}" creada correctamente.`
            : "Sucursal creada correctamente.",
        });
        setFormModal({ isOpen: false, branch: null });
        loadCatalog();
        return true;
      }
      setFeedback({ type: "error", message: result.error });
      return false;
    },
    [user, loadCatalog]
  );

  const handleUpdateBranch = useCallback(
    async (branchId, formValues) => {
      setSaving(true);
      const result = await updateBranchContact(branchId, formValues);
      if (!mountedRef.current) return false;
      setSaving(false);
      if (result.success) {
        setFeedback({
          type: "success",
          message: "Datos de la sucursal actualizados.",
        });
        setFormModal({ isOpen: false, branch: null });
        loadCatalog();
        return true;
      }
      setFeedback({ type: "error", message: result.error });
      return false;
    },
    [loadCatalog]
  );

  const handleToggleStatus = useCallback(
    async (branch, nextIsActive) => {
      setSaving(true);
      const result = await setBranchActive({
        branchId: branch.id,
        isActive: nextIsActive,
        adminId: user?.id,
      });
      if (!mountedRef.current) return false;
      setSaving(false);
      if (result.success) {
        setFeedback({
          type: "success",
          message: result.data?.name
            ? `${result.data.name}: ${nextIsActive ? "reactivada" : "desactivada"} correctamente.`
            : nextIsActive
              ? "Sucursal reactivada correctamente."
              : "Sucursal desactivada correctamente.",
        });
        setToggleModal({ isOpen: false, branch: null });
        loadCatalog();
        return true;
      }
      setFeedback({ type: "error", message: result.error });
      return false;
    },
    [user, loadCatalog]
  );

  const clearFeedback = useCallback(() => setFeedback(null), []);

  return {
    branches: filteredBranches,
    totalBranches: branches.length,
    metrics,
    loading,
    loadError,
    isAdmin,
    adminChecked,
    statusFilter,
    setStatusFilter,
    searchTerm,
    setSearchTerm,
    saving,
    feedback,
    clearFeedback,
    formModal,
    toggleModal,
    openCreateModal,
    openEditModal,
    closeFormModal,
    openToggleModal,
    closeToggleModal,
    handleCreateBranch,
    handleUpdateBranch,
    handleToggleStatus,
    refresh: loadCatalog,
  };
};

export default useSettingsBranches;
