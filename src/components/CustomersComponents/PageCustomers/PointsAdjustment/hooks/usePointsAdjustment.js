import { useEffect, useMemo, useState } from "react";

import { useBranch } from "../../../../../contexts/BranchContext";
import { useAppModal } from "../../../../../hooks/useAppModal";
import { subscribeToTableChanges } from "../../services/customersRealtimeService";
import { calculatePointsBalance } from "../../services/customerPointsCalculationService";
import { fetchCustomerPointMovements } from "../services/pointsAdjustmentService";
import {
  BLOCKED_GENERIC_NOTES,
  buildFinalNotes,
  calculateNewBalance,
  calculateSignedPoints,
  normalizeNotes,
  sanitizePointsAmountInput,
} from "../services/pointsAdjustmentCalculationService";
import { usePointsAdjustmentAdminAccess } from "./usePointsAdjustmentAdminAccess";
import { usePointsAdjustmentCustomerSearch } from "./usePointsAdjustmentCustomerSearch";
import { usePointsAdjustmentSubmit } from "./usePointsAdjustmentSubmit";

const INACTIVE_CUSTOMER_MESSAGE =
  "No se pueden realizar ajustes de puntos a clientes inactivos. Activa el cliente antes de continuar.";

export const usePointsAdjustment = () => {
  const { branch } = useBranch();

  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [currentPoints, setCurrentPoints] = useState(0);
  const [loadingPoints, setLoadingPoints] = useState(false);

  const [adjustmentType, setAdjustmentType] = useState("add");
  const [pointsAmount, setPointsAmount] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [notes, setNotes] = useState("");

  const numericPoints = Number(pointsAmount || 0);

  const { appModal, closeAppModal, showAppAlert } = useAppModal();

  const { adminAccessMessage, adminAccessStatus } =
    usePointsAdjustmentAdminAccess();

  const isOtherReason = adjustmentReason === "other";

  const finalNotes = useMemo(() => {
    return buildFinalNotes({ adjustmentReason, notes });
  }, [adjustmentReason, notes]);

  const normalizedFinalNotes = useMemo(() => {
    return normalizeNotes(finalNotes);
  }, [finalNotes]);

  const isGenericNote = useMemo(() => {
    if (!isOtherReason) return false;

    return BLOCKED_GENERIC_NOTES.includes(normalizedFinalNotes);
  }, [isOtherReason, normalizedFinalNotes]);

  const signedPoints = useMemo(() => {
    return calculateSignedPoints({ numericPoints, adjustmentType });
  }, [numericPoints, adjustmentType]);

  const newBalance = useMemo(() => {
    return calculateNewBalance({ currentPoints, signedPoints });
  }, [currentPoints, signedPoints]);

  const loadCustomerPoints = async (customerId) => {
    if (!customerId) {
      setCurrentPoints(0);
      return;
    }

    try {
      setLoadingPoints(true);

      const movements = await fetchCustomerPointMovements(customerId);

      setCurrentPoints(calculatePointsBalance(movements));
    } catch (err) {
      console.error("Error cargando puntos del cliente:", err);

      showAppAlert({
        type: "danger",
        title: "No se pudieron cargar los puntos",
        message: "No se pudieron cargar los puntos actuales del cliente.",
        confirmText: "Entendido",
      });

      setCurrentPoints(0);
    } finally {
      setLoadingPoints(false);
    }
  };

  const resetAdjustmentForm = () => {
    setPointsAmount("");
    setAdjustmentReason("");
    setNotes("");
    setAdjustmentType("add");
  };

  const clearCustomerSelection = () => {
    setSelectedCustomer(null);
    setCurrentPoints(0);
    resetAdjustmentForm();
  };

  const handleCustomerSelected = async (customer) => {
    if (customer.status === false) {
      showAppAlert({
        type: "warning",
        title: "Cliente inactivo",
        message: INACTIVE_CUSTOMER_MESSAGE,
        confirmText: "Entendido",
      });
      return;
    }

    setSelectedCustomer(customer);
    resetAdjustmentForm();

    await loadCustomerPoints(customer.id);
  };

  const {
    clearCustomerResults,
    customers,
    handleClearSearch,
    handleSearchChange,
    handleSelectCustomer: selectCustomerFromResults,
    searchCustomers,
    searchingCustomers,
    searchTerm,
  } = usePointsAdjustmentCustomerSearch({
    enabled: adminAccessStatus === "allowed",
    showAppAlert,
    onCustomerSelected: handleCustomerSelected,
    onSelectionCleared: clearCustomerSelection,
  });

  useEffect(() => {
    if (adminAccessStatus !== "allowed") return;
    if (!selectedCustomer?.id) return;

    return subscribeToTableChanges({
      channelName: `points-adjustment-${selectedCustomer.id}`,
      tables: ["customer_points"],
      rowFilter: `customer_id=eq.${selectedCustomer.id}`,
      onChange: () => loadCustomerPoints(selectedCustomer.id),
    });
    // La suscripcion se re-crea solo al cambiar de cliente o de acceso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomer?.id, adminAccessStatus]);

  const handleAdjustSaved = () => {
    resetAdjustmentForm();
    clearCustomerResults();
  };

  const {
    canSubmit,
    handleCloseConfirmModal,
    handleConfirmAdjustment,
    handleOpenConfirmModal,
    isConfirmModalOpen,
    saving,
  } = usePointsAdjustmentSubmit({
    adminAccessStatus,
    selectedCustomer,
    numericPoints,
    adjustmentType,
    newBalance,
    signedPoints,
    adjustmentReason,
    normalizedFinalNotes,
    isGenericNote,
    branch,
    showAppAlert,
    loadCustomerPoints,
    onAdjustSaved: handleAdjustSaved,
  });

  const handlePointsChange = (value) => {
    setPointsAmount(sanitizePointsAmountInput(value));
  };

  const handleReasonChange = (value) => {
    setAdjustmentReason(value);
    setNotes("");
  };

  const handleClearAdjustment = () => {
    resetAdjustmentForm();
  };

  return {
    adminAccessMessage,
    adminAccessStatus,
    adjustmentReason,
    adjustmentType,
    appModal,
    branch,
    canSubmit,
    closeAppModal,
    currentPoints,
    customers,
    handleClearAdjustment,
    handleClearSearch,
    handleCloseConfirmModal,
    handleConfirmAdjustment,
    handleOpenConfirmModal,
    handlePointsChange,
    handleReasonChange,
    handleSearchChange,
    handleSelectCustomer: selectCustomerFromResults,
    isConfirmModalOpen,
    isOtherReason,
    loadingPoints,
    newBalance,
    normalizedFinalNotes,
    notes,
    numericPoints,
    pointsAmount,
    saving,
    searchCustomers,
    searchTerm,
    searchingCustomers,
    selectedCustomer,
    setAdjustmentType,
    setNotes,
    signedPoints,
  };
};
