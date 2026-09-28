import React, { useEffect, useMemo, useState } from "react";
import styles from "./RewardsSettings.module.css";
import { useAppModal } from "../../../../hooks/useAppModal";
import { subscribeToTableChanges } from "../services/customersRealtimeService";
import {
  DEFAULT_POINTS_AMOUNT,
  fetchOrCreatePointsAmountRule,
  fetchRewardsCatalog,
  savePointsAmountRule,
  updateRewardStatus,
} from "./services/rewardsSettingsService";
import {
  EXAMPLE_SALE_AMOUNT,
  buildRewardStatusConfirmation,
  calculateExamplePoints,
  canSavePointsRule as canSavePointsRuleRule,
  filterAndSortRewards,
  getLinkedProductsLabel,
  getRewardBenefitLabel,
  getRewardTypeLabel as getRewardTypeLabelValue,
  hasPointsRuleChanges as hasPointsRuleChangesRule,
  normalizeRewardType as normalizeRewardTypeValue,
  sanitizePointsAmountInput,
  sortRewards,
} from "./services/rewardsSettingsCalculationService";
import RewardModal from "../../../../components/CustomersComponents/Modals/RewardModal/RewardModal";
import AppModal from "../../../AppModal/AppModal";

const emptyRewardDetailsModal = {
  isOpen: false,
  reward: null,
};

const RewardsSettings = () => {
  const [rewards, setRewards] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loadingRewards, setLoadingRewards] = useState(false);

  const [pointsAmountPerPoint, setPointsAmountPerPoint] = useState("");
  const [originalPointsAmountPerPoint, setOriginalPointsAmountPerPoint] =
    useState("");
  const [loadingPointsRule, setLoadingPointsRule] = useState(false);
  const [savingPointsRule, setSavingPointsRule] = useState(false);

  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState(null);

  const [rewardDetailsModal, setRewardDetailsModal] = useState(
    emptyRewardDetailsModal
  );

  const numericPointsAmountPerPoint = Number(pointsAmountPerPoint || 0);

  const {
    appModal,
    closeAppModal,
    setAppModalLoading,
    showAppAlert,
    showAppConfirm,
  } = useAppModal();

  const examplePoints = useMemo(() => {
    return calculateExamplePoints(numericPointsAmountPerPoint);
  }, [numericPointsAmountPerPoint]);

  const hasPointsRuleChanges = useMemo(() => {
    return hasPointsRuleChangesRule({
      pointsAmountPerPoint,
      originalPointsAmountPerPoint,
    });
  }, [pointsAmountPerPoint, originalPointsAmountPerPoint]);

  const canSavePointsRule = canSavePointsRuleRule({
    numericPointsAmountPerPoint,
    hasChanges: hasPointsRuleChanges,
    savingPointsRule,
    loadingPointsRule,
  });

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

  const loadPointsRule = async () => {
    try {
      setLoadingPointsRule(true);

      const settingValue = await fetchOrCreatePointsAmountRule();

      setPointsAmountPerPoint(settingValue);
      setOriginalPointsAmountPerPoint(settingValue);
    } catch (err) {
      console.error("Error cargando regla de puntos:", err);

      const defaultValue = String(DEFAULT_POINTS_AMOUNT);
      setPointsAmountPerPoint(defaultValue);
      setOriginalPointsAmountPerPoint(defaultValue);

      showAppAlert({
        type: "danger",
        title: "No se pudo cargar la regla",
        message:
          "No se pudo cargar la regla de acumulación de puntos. Se usará el valor predeterminado temporalmente.",
        confirmText: "Entendido",
      });
    } finally {
      setLoadingPointsRule(false);
    }
  };

  const handlePointsAmountChange = (value) => {
    setPointsAmountPerPoint(sanitizePointsAmountInput(value));
  };

  const handleSavePointsRule = async () => {
    try {
      setSavingPointsRule(true);

      const amount = Number(pointsAmountPerPoint || 0);

      if (!amount || amount <= 0) {
        showAppAlert({
          type: "warning",
          title: "Monto inválido",
          message: "El monto para generar 1 punto debe ser mayor a 0.",
          confirmText: "Entendido",
        });
        return;
      }

      await savePointsAmountRule(String(amount));

      setPointsAmountPerPoint(String(amount));
      setOriginalPointsAmountPerPoint(String(amount));

      showAppAlert({
        type: "success",
        title: "Regla guardada",
        message: "La regla de acumulación de puntos se guardó correctamente.",
        confirmText: "Aceptar",
      });
    } catch (err) {
      console.error("Error guardando regla de puntos:", err);

      showAppAlert({
        type: "danger",
        title: "No se pudo guardar",
        message: "No se pudo guardar la regla de acumulación.",
        confirmText: "Entendido",
      });
    } finally {
      setSavingPointsRule(false);
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
      reward_type: normalizeRewardTypeValue(reward.reward_type),
    });
    setIsRewardModalOpen(true);
  };

  const handleCloseRewardModal = () => {
    setIsRewardModalOpen(false);
    setEditingReward(null);
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
    loadRewards();
    loadPointsRule();
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
      onChange: loadPointsRule,
    });

    return () => {
      unsubscribeRewards();
      unsubscribeRewardProducts();
      unsubscribeSettings();
    };
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

  return (
    <div className={styles.content}>
      <div className={styles.header}>
        <div>
          <h1>CONFIGURAR RECOMPENSAS</h1>
          <p>
            Administra las recompensas disponibles, los puntos requeridos y la
            regla de acumulación para clientes.
          </p>
        </div>

        <button
          type="button"
          className={styles.newButton}
          onClick={handleNewReward}
        >
          + Nueva recompensa
        </button>
      </div>

      <div className={styles.pointsRuleCard}>
        <div className={styles.pointsRuleInfo}>
          <h2>Regla de acumulación de puntos</h2>
          <p>
            Define cuántos pesos debe comprar un cliente para ganar 1 punto. El
            sistema no maneja puntos fraccionarios y siempre redondea hacia
            abajo.
          </p>

          <div className={styles.pointsRuleExample}>
            Ejemplo: una venta de ${EXAMPLE_SALE_AMOUNT.toFixed(2)} genera{" "}
            <strong>{examplePoints}</strong> punto
            {examplePoints !== 1 ? "s" : ""}.
          </div>
        </div>

        <div className={styles.pointsRuleForm}>
          <label>El cliente gana 1 punto por cada</label>

          <div className={styles.pointsRuleInputRow}>
            <span>$</span>
            <input
              type="text"
              inputMode="decimal"
              value={pointsAmountPerPoint}
              onChange={(e) => handlePointsAmountChange(e.target.value)}
              placeholder="50"
              disabled={loadingPointsRule || savingPointsRule}
            />
            <strong>MXN</strong>
          </div>

          <button
            type="button"
            className={styles.savePointsRuleButton}
            onClick={handleSavePointsRule}
            disabled={!canSavePointsRule}
          >
            {savingPointsRule
              ? "Guardando..."
              : hasPointsRuleChanges
                ? "Guardar regla"
                : "Regla guardada"}
          </button>
        </div>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchContainer}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Buscar por nombre, descripción, puntos, tipo o beneficio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          {searchTerm && (
            <button
              type="button"
              className={styles.clearSearchButton}
              onClick={() => setSearchTerm("")}
            >
              ×
            </button>
          )}
        </div>

        <select
          className={styles.statusFilter}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Todas</option>
          <option value="active">Activas</option>
          <option value="inactive">Inactivas</option>
        </select>

        <button
          type="button"
          className={styles.refreshButton}
          onClick={handleRefresh}
          disabled={loadingRewards || loadingPointsRule}
        >
          {loadingRewards || loadingPointsRule
            ? "Actualizando..."
            : "Actualizar"}
        </button>
      </div>

      <div className={styles.resultsInfo}>
        {loadingRewards
          ? "Cargando recompensas..."
          : `Mostrando ${filteredRewards.length} recompensa${
              filteredRewards.length !== 1 ? "s" : ""
            }`}
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.rewardsTable}>
          <thead>
            <tr>
              <th>Recompensa</th>
              <th>Tipo</th>
              <th>Beneficio</th>
              <th>Productos</th>
              <th>Puntos</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {loadingRewards ? (
              <tr>
                <td colSpan="7" className={styles.textCenter}>
                  Cargando recompensas...
                </td>
              </tr>
            ) : filteredRewards.length === 0 ? (
              <tr>
                <td colSpan="7" className={styles.textCenter}>
                  No hay recompensas registradas con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              filteredRewards.map((reward) => (
                <tr key={reward.id}>
                  <td>
                    <button
                      type="button"
                      className={styles.rewardInfoButton}
                      onClick={() => handleOpenRewardDetailsModal(reward)}
                      title="Ver detalle de la recompensa"
                    >
                      <div className={styles.rewardName}>
                        {reward.name || "SIN NOMBRE"}
                      </div>

                      <span className={styles.descriptionText}>
                        {reward.description || "SIN DESCRIPCIÓN"}
                      </span>

                      <span className={styles.viewDetailText}>Ver detalle</span>
                    </button>
                  </td>

                  <td>
                    <span className={styles.descriptionText}>
                      {getRewardTypeLabelValue(reward)}
                    </span>
                  </td>

                  <td>
                    <span className={styles.descriptionText}>
                      {getRewardBenefitLabel(reward)}
                    </span>
                  </td>

                  <td>
                    <span className={styles.descriptionText}>
                      {getLinkedProductsLabel(reward)}
                    </span>
                  </td>

                  <td>
                    <span className={styles.pointsBadge}>
                      {Number(reward.points_required || 0)}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`${styles.statusBadge} ${
                        reward.is_active === false
                          ? styles.statusInactive
                          : styles.statusActive
                      }`}
                    >
                      {reward.is_active === false ? "INACTIVA" : "ACTIVA"}
                    </span>
                  </td>

                  <td>
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={`${styles.actionButton} ${styles.editButton}`}
                        onClick={() => handleEditReward(reward)}
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        className={`${styles.actionButton} ${
                          reward.is_active === false
                            ? styles.activateButton
                            : styles.deactivateButton
                        }`}
                        onClick={() => handleOpenStatusConfirmModal(reward)}
                      >
                        {reward.is_active === false ? "Activar" : "Desactivar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <RewardModal
        isOpen={isRewardModalOpen}
        onClose={handleCloseRewardModal}
        onSaved={loadRewards}
        rewardToEdit={editingReward}
      />

      {rewardDetailsModal.isOpen && rewardDetailsModal.reward && (
        <div
          className={styles.modalOverlay}
          onClick={handleCloseRewardDetailsModal}
        >
          <div
            className={styles.detailsModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reward-details-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.detailsHeader}>
              <div>
                <h3 id="reward-details-title">Detalle de recompensa</h3>
                <p>{rewardDetailsModal.reward.name || "SIN NOMBRE"}</p>
              </div>

              <button
                type="button"
                className={styles.detailsCloseButton}
                onClick={handleCloseRewardDetailsModal}
                aria-label="Cerrar modal"
              >
                ×
              </button>
            </div>

            <div className={styles.detailsBody}>
              <div className={styles.detailItem}>
                <span>Descripción</span>
                <strong>
                  {rewardDetailsModal.reward.description || "SIN DESCRIPCIÓN"}
                </strong>
              </div>

              <div className={styles.detailsGrid}>
                <div className={styles.detailItem}>
                  <span>Tipo</span>
                  <strong>
                    {getRewardTypeLabelValue(
                      rewardDetailsModal.reward.reward_type
                    )}
                  </strong>
                </div>

                <div className={styles.detailItem}>
                  <span>Beneficio</span>
                  <strong>
                    {getRewardBenefitLabel(rewardDetailsModal.reward)}
                  </strong>
                </div>

                <div className={styles.detailItem}>
                  <span>Productos aplicables</span>
                  <strong>
                    {getLinkedProductsLabel(rewardDetailsModal.reward)}
                  </strong>
                </div>

                <div className={styles.detailItem}>
                  <span>Puntos requeridos</span>
                  <strong>
                    {Number(rewardDetailsModal.reward.points_required || 0)}
                  </strong>
                </div>

                <div className={styles.detailItem}>
                  <span>Estado</span>
                  <strong>
                    {rewardDetailsModal.reward.is_active === false
                      ? "INACTIVA"
                      : "ACTIVA"}
                  </strong>
                </div>
              </div>
            </div>

            <div className={styles.detailsActions}>
              <button
                type="button"
                className={styles.detailsPrimaryButton}
                onClick={handleCloseRewardDetailsModal}
                autoFocus
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <AppModal
        isOpen={appModal.isOpen}
        type={appModal.type}
        title={appModal.title}
        message={appModal.message}
        confirmText={appModal.confirmText}
        cancelText={appModal.cancelText}
        showCancel={appModal.showCancel}
        loading={appModal.loading}
        onConfirm={appModal.onConfirm || closeAppModal}
        onCancel={appModal.onCancel || closeAppModal}
        onClose={closeAppModal}
      />
    </div>
  );
};

export default RewardsSettings;
