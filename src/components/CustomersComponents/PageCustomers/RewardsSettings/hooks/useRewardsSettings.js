import { useEffect, useMemo, useState } from "react";

import { useAppModal } from "../../../../../hooks/useAppModal";
import { subscribeToTableChanges } from "../../services/customersRealtimeService";
import {
  POINTS_AMOUNT_SETTING_KEY,
  fetchRewardsCatalog,
  updateRewardStatus,
} from "../services/rewardsSettingsService";
import {
  buildRewardStatusConfirmation,
  filterAndSortRewards,
  normalizeRewardType,
  sortRewards,
} from "../services/rewardsSettingsCalculationService";
import { useRewardsPointsRule } from "./useRewardsPointsRule";

const emptyRewardDetailsModal = {
  isOpen: false,
  reward: null,
};

export const useRewardsSettings = () => {
  const [rewards, setRewards] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loadingRewards, setLoadingRewards] = useState(false);

  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState(null);

  const [rewardDetailsModal, setRewardDetailsModal] = useState(
    emptyRewardDetailsModal
  );

  const {
    appModal,
    closeAppModal,
    setAppModalLoading,
    showAppAlert,
    showAppConfirm,
  } = useAppModal();

  const {
    canSavePointsRule,
    examplePoints,
    handlePointsAmountChange,
    handleSavePointsRule,
    hasPointsRuleChanges,
    loadPointsRule,
    loadingPointsRule,
    pointsAmountPerPoint,
    savingPointsRule,
  } = useRewardsPointsRule({ showAppAlert });

  const loadRewards = async () => {
    try {
      setLoadingRewards(true);

      setRewards(sortRewards(await fetchRewardsCatalog()));
    } catch (err) {
      console.error("Error cargando recompensas:", err);
      setRewards([]);

      showAppAlert({
        type: "danger",
        title: "No se pudieron cargar recompensas",
        message: "No se pudieron cargar las recompensas.",
        confirmText: "Entendido",
      });
    } finally {
      setLoadingRewards(false);
    }
  };

  const filteredRewards = useMemo(() => {
    return filterAndSortRewards({ rewards, searchTerm, statusFilter });
  }, [rewards, searchTerm, statusFilter]);

  const handleNewReward = () => {
    setEditingReward(null);
    setIsRewardModalOpen(true);
  };

  const handleEditReward = (reward) => {
    setEditingReward({
      ...reward,
      reward_type: normalizeRewardType(reward.reward_type),
    });
    setIsRewardModalOpen(true);
  };

  const handleCloseRewardModal = () => {
    setIsRewardModalOpen(false);
    setEditingReward(null);
  };

  const handleConfirmToggleStatus = async (reward, nextStatus) => {
    if (!reward?.id) return;

    try {
      setAppModalLoading(true);

      await updateRewardStatus({ rewardId: reward.id, nextStatus });

      await loadRewards();

      showAppAlert({
        type: "success",
        title: nextStatus ? "Recompensa activada" : "Recompensa desactivada",
        message: `La recompensa "${
          reward.name || "SIN NOMBRE"
        }" se ${nextStatus ? "activó" : "desactivó"} correctamente.`,
        confirmText: "Aceptar",
      });
    } catch (err) {
      console.error("Error actualizando recompensa:", err);

      showAppAlert({
        type: "danger",
        title: "No se pudo actualizar",
        message: "No se pudo actualizar el estado de la recompensa.",
        confirmText: "Entendido",
      });
    }
  };

  const handleOpenStatusConfirmModal = (reward) => {
    const confirmation = buildRewardStatusConfirmation(reward);

    showAppConfirm({
      type: confirmation.type,
      title: confirmation.title,
      message: confirmation.message,
      confirmText: confirmation.confirmText,
      cancelText: confirmation.cancelText,
      onConfirm: () =>
        handleConfirmToggleStatus(reward, confirmation.nextStatus),
    });
  };

  const handleOpenRewardDetailsModal = (reward) => {
    setRewardDetailsModal({
      isOpen: true,
      reward,
    });
  };

  const handleCloseRewardDetailsModal = () => {
    setRewardDetailsModal(emptyRewardDetailsModal);
  };

  const handleRefresh = () => {
    loadRewards();
    loadPointsRule();
  };

  useEffect(() => {
    // Cargas iniciales; deuda heredada de `set-state-in-effect` registrada en
    // `KNOWN_ISSUES.md` #56.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRewards();
    loadPointsRule();
    // La carga inicial corre una sola vez; los cambios posteriores llegan por las
    // suscripciones en vivo de recompensas y ajustes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const unsubscribeRewards = subscribeToTableChanges({
      channelName: "rewards-settings-rewards-realtime",
      tables: ["rewards"],
      onChange: loadRewards,
    });

    const unsubscribeRewardProducts = subscribeToTableChanges({
      channelName: "rewards-settings-reward-products-realtime",
      tables: ["reward_products"],
      onChange: loadRewards,
    });

    const unsubscribeSettings = subscribeToTableChanges({
      channelName: "rewards-settings-system-settings-realtime",
      tables: ["system_settings"],
      rowFilter: `setting_key=eq.${POINTS_AMOUNT_SETTING_KEY}`,
      onChange: loadPointsRule,
    });

    return () => {
      unsubscribeRewards();
      unsubscribeRewardProducts();
      unsubscribeSettings();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!rewardDetailsModal.isOpen) return;

    const handleModalKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleCloseRewardDetailsModal();
      }
    };

    window.addEventListener("keydown", handleModalKeyDown);

    return () => {
      window.removeEventListener("keydown", handleModalKeyDown);
    };
  }, [rewardDetailsModal.isOpen]);

  return {
    appModal,
    canSavePointsRule,
    closeAppModal,
    editingReward,
    examplePoints,
    filteredRewards,
    handleCloseRewardDetailsModal,
    handleCloseRewardModal,
    handleEditReward,
    handleNewReward,
    handleOpenRewardDetailsModal,
    handleOpenStatusConfirmModal,
    handlePointsAmountChange,
    handleRefresh,
    handleSavePointsRule,
    hasPointsRuleChanges,
    isRewardModalOpen,
    loadRewards,
    loadingPointsRule,
    loadingRewards,
    pointsAmountPerPoint,
    rewardDetailsModal,
    savingPointsRule,
    searchTerm,
    setSearchTerm,
    setStatusFilter,
    statusFilter,
  };
};
