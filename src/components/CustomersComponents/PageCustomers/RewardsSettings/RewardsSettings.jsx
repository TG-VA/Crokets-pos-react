import React, { useEffect, useMemo, useState } from "react";
import styles from "./RewardsSettings.module.css";
import { supabase } from "../../../../lib/supabaseClient";
import RewardModal from "../../../../components/CustomersComponents/Modals/RewardModal/RewardModal";
import AppModal from "../../../AppModal/AppModal";

const POINTS_AMOUNT_SETTING_KEY = "customer_points_amount_per_point";
const DEFAULT_POINTS_AMOUNT = 50;
const EXAMPLE_SALE_AMOUNT = 420;

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

  const [appModal, setAppModal] = useState({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
    confirmText: "Entendido",
    cancelText: "Cancelar",
    showCancel: false,
    loading: false,
    onConfirm: null,
    onCancel: null,
  });

  const numericPointsAmountPerPoint = Number(pointsAmountPerPoint || 0);

  const closeAppModal = () => {
    setAppModal((prev) => ({
      ...prev,
      isOpen: false,
      loading: false,
      onConfirm: null,
      onCancel: null,
    }));
  };

  const showAppAlert = ({
    type = "info",
    title = "Aviso",
    message = "",
    confirmText = "Entendido",
  }) => {
    setAppModal({
      isOpen: true,
      type,
      title,
      message,
      confirmText,
      cancelText: "Cancelar",
      showCancel: false,
      loading: false,
      onConfirm: closeAppModal,
      onCancel: closeAppModal,
    });
  };

  const showAppConfirm = ({
    type = "warning",
    title = "Confirmar acción",
    message = "",
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    onConfirm,
  }) => {
    setAppModal({
      isOpen: true,
      type,
      title,
      message,
      confirmText,
      cancelText,
      showCancel: true,
      loading: false,
      onConfirm,
      onCancel: closeAppModal,
    });
  };

  const setAppModalLoading = (loading) => {
    setAppModal((prev) => ({
      ...prev,
      loading,
    }));
  };

  const examplePoints = useMemo(() => {
    if (!numericPointsAmountPerPoint || numericPointsAmountPerPoint <= 0) {
      return 0;
    }

    return Math.floor(EXAMPLE_SALE_AMOUNT / numericPointsAmountPerPoint);
  }, [numericPointsAmountPerPoint]);

  const hasPointsRuleChanges = useMemo(() => {
    return (
      String(pointsAmountPerPoint || "").trim() !==
      String(originalPointsAmountPerPoint || "").trim()
    );
  }, [pointsAmountPerPoint, originalPointsAmountPerPoint]);

  const canSavePointsRule =
    numericPointsAmountPerPoint > 0 &&
    hasPointsRuleChanges &&
    !savingPointsRule &&
    !loadingPointsRule;

  const normalizeRewardType = (type) => {
    if (type === "product_discount") return "product_discount";
    return "free_product";
  };

  const getRewardTypeLabel = (type) => {
    const rewardType = normalizeRewardType(type);

    if (rewardType === "free_product") return "PRODUCTO GRATIS";
    if (rewardType === "product_discount") return "DESCUENTO EN PRODUCTO";

    return "PRODUCTO GRATIS";
  };

  const getRewardBenefitLabel = (reward) => {
    const rewardType = normalizeRewardType(reward.reward_type);
    const quantity = Number(reward.reward_quantity || 1);
    const discountType = reward.discount_type;
    const discountValue = Number(reward.discount_value || 0);

    if (rewardType === "free_product") {
      return `${quantity} producto${quantity !== 1 ? "s" : ""} gratis`;
    }

    if (rewardType === "product_discount") {
      if (discountType === "percent") {
        return `${discountValue}% en ${quantity} unidad${
          quantity !== 1 ? "es" : ""
        }`;
      }

      if (discountType === "fixed") {
        return `$${discountValue.toFixed(2)} en ${quantity} unidad${
          quantity !== 1 ? "es" : ""
        }`;
      }

      return `Descuento en ${quantity} unidad${quantity !== 1 ? "es" : ""}`;
    }

    return "Sin beneficio";
  };

  const getLinkedProductsLabel = (reward) => {
    const rewardType = normalizeRewardType(reward.reward_type);
    const linkedProductsCount = reward.reward_products?.length || 0;

    if (rewardType === "product_discount") {
      return "TODOS";
    }

    if (linkedProductsCount === 0) {
      return "SIN PRODUCTOS";
    }

    return `${linkedProductsCount} producto${
      linkedProductsCount !== 1 ? "s" : ""
    }`;
  };

  const sortRewards = (rewardsList = []) => {
    return [...rewardsList].sort((a, b) => {
      const statusA = a.is_active === false ? 1 : 0;
      const statusB = b.is_active === false ? 1 : 0;

      if (statusA !== statusB) return statusA - statusB;

      const pointsA = Number(a.points_required || 0);
      const pointsB = Number(b.points_required || 0);

      if (pointsA !== pointsB) return pointsA - pointsB;

      return String(a.name || "").localeCompare(String(b.name || ""), "es", {
        sensitivity: "base",
        numeric: true,
      });
    });
  };

  const loadRewards = async () => {
    try {
      setLoadingRewards(true);

      const { data, error: rewardsError } = await supabase
        .from("rewards")
        .select(`
          id,
          name,
          description,
          points_required,
          is_active,
          reward_type,
          reward_quantity,
          discount_type,
          discount_value,
          created_at,
          updated_at,
          reward_products (
            id,
            product_id
          )
        `)
        .order("is_active", { ascending: false, nullsFirst: false })
        .order("points_required", { ascending: true })
        .order("name", { ascending: true, nullsFirst: false });

      if (rewardsError) throw rewardsError;

      setRewards(sortRewards(data || []));
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

      const { data, error: settingsError } = await supabase
        .from("system_settings")
        .select(`
          id,
          setting_key,
          setting_value,
          value_type,
          description,
          branch_id,
          is_active,
          created_at,
          updated_at
        `)
        .eq("setting_key", POINTS_AMOUNT_SETTING_KEY)
        .is("branch_id", null)
        .maybeSingle();

      if (settingsError) throw settingsError;

      if (!data) {
        const defaultValue = String(DEFAULT_POINTS_AMOUNT);

        const { error: insertError } = await supabase
          .from("system_settings")
          .insert([
            {
              id: crypto.randomUUID(),
              setting_key: POINTS_AMOUNT_SETTING_KEY,
              setting_value: defaultValue,
              value_type: "number",
              description:
                "Monto de venta en MXN necesario para generar 1 punto de cliente. El cálculo redondea hacia abajo.",
              branch_id: null,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]);

        if (insertError) throw insertError;

        setPointsAmountPerPoint(defaultValue);
        setOriginalPointsAmountPerPoint(defaultValue);
        return;
      }

      const settingValue = String(data.setting_value || DEFAULT_POINTS_AMOUNT);

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
    const cleanValue = String(value || "")
      .replace(/[^\d.]/g, "")
      .replace(/^0+(?=\d)/, "");

    const parts = cleanValue.split(".");
    const normalizedValue =
      parts.length > 1
        ? `${parts[0]}.${parts.slice(1).join("").slice(0, 2)}`
        : parts[0];

    setPointsAmountPerPoint(normalizedValue);
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

      const normalizedAmount = String(amount);

      const { data: existingSetting, error: existingError } = await supabase
        .from("system_settings")
        .select("id")
        .eq("setting_key", POINTS_AMOUNT_SETTING_KEY)
        .is("branch_id", null)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existingSetting?.id) {
        const { error: updateError } = await supabase
          .from("system_settings")
          .update({
            setting_value: normalizedAmount,
            value_type: "number",
            description:
              "Monto de venta en MXN necesario para generar 1 punto de cliente. El cálculo redondea hacia abajo.",
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingSetting.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("system_settings")
          .insert([
            {
              id: crypto.randomUUID(),
              setting_key: POINTS_AMOUNT_SETTING_KEY,
              setting_value: normalizedAmount,
              value_type: "number",
              description:
                "Monto de venta en MXN necesario para generar 1 punto de cliente. El cálculo redondea hacia abajo.",
              branch_id: null,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]);

        if (insertError) throw insertError;
      }

      setPointsAmountPerPoint(normalizedAmount);
      setOriginalPointsAmountPerPoint(normalizedAmount);

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
    const search = searchTerm.trim().toLowerCase();

    const filtered = rewards.filter((reward) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && reward.is_active !== false) ||
        (statusFilter === "inactive" && reward.is_active === false);

      if (!matchesStatus) return false;

      if (!search) return true;

      const values = [
        reward.name,
        reward.description,
        reward.points_required,
        normalizeRewardType(reward.reward_type),
        getRewardTypeLabel(reward.reward_type),
        getRewardBenefitLabel(reward),
        getLinkedProductsLabel(reward),
      ];

      return values.some((value) =>
        String(value || "").toLowerCase().includes(search)
      );
    });

    return sortRewards(filtered);
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

  const handleOpenStatusConfirmModal = (reward) => {
    const nextStatus = reward.is_active === false;
    const actionLabel = nextStatus ? "activar" : "desactivar";
    const title = nextStatus ? "Activar recompensa" : "Desactivar recompensa";
    const confirmText = nextStatus ? "Activar" : "Desactivar";

    showAppConfirm({
      type: nextStatus ? "info" : "warning",
      title,
      message: `¿Seguro que deseas ${actionLabel} la recompensa "${
        reward.name || "SIN NOMBRE"
      }"? ${
        nextStatus
          ? "Volverá a estar disponible para canjearse en ventas."
          : "Ya no estará disponible para canjearse en ventas."
      }`,
      confirmText,
      cancelText: "Cancelar",
      onConfirm: () => handleConfirmToggleStatus(reward, nextStatus),
    });
  };

  const handleConfirmToggleStatus = async (reward, nextStatus) => {
    if (!reward?.id) return;

    try {
      setAppModalLoading(true);

      const { error: updateError } = await supabase
        .from("rewards")
        .update({
          is_active: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", reward.id);

      if (updateError) throw updateError;

      await loadRewards();

      setAppModal({
        isOpen: true,
        type: "success",
        title: nextStatus ? "Recompensa activada" : "Recompensa desactivada",
        message: `La recompensa "${
          reward.name || "SIN NOMBRE"
        }" se ${nextStatus ? "activó" : "desactivó"} correctamente.`,
        confirmText: "Aceptar",
        cancelText: "Cancelar",
        showCancel: false,
        loading: false,
        onConfirm: closeAppModal,
        onCancel: closeAppModal,
      });
    } catch (err) {
      console.error("Error actualizando recompensa:", err);

      setAppModal({
        isOpen: true,
        type: "danger",
        title: "No se pudo actualizar",
        message: "No se pudo actualizar el estado de la recompensa.",
        confirmText: "Entendido",
        cancelText: "Cancelar",
        showCancel: false,
        loading: false,
        onConfirm: closeAppModal,
        onCancel: closeAppModal,
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
    const rewardsChannel = supabase
      .channel("rewards-settings-rewards-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rewards",
        },
        () => {
          loadRewards();
        }
      )
      .subscribe();

    const rewardProductsChannel = supabase
      .channel("rewards-settings-reward-products-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reward_products",
        },
        () => {
          loadRewards();
        }
      )
      .subscribe();

    const settingsChannel = supabase
      .channel("points-rule-settings-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "system_settings",
          filter: `setting_key=eq.${POINTS_AMOUNT_SETTING_KEY}`,
        },
        () => {
          loadPointsRule();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(rewardsChannel);
      supabase.removeChannel(rewardProductsChannel);
      supabase.removeChannel(settingsChannel);
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

                      <span className={styles.viewDetailText}>
                        Ver detalle
                      </span>
                    </button>
                  </td>

                  <td>
                    <span className={styles.descriptionText}>
                      {getRewardTypeLabel(reward.reward_type)}
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
                    {getRewardTypeLabel(rewardDetailsModal.reward.reward_type)}
                  </strong>
                </div>

                <div className={styles.detailItem}>
                  <span>Beneficio</span>
                  <strong>{getRewardBenefitLabel(rewardDetailsModal.reward)}</strong>
                </div>

                <div className={styles.detailItem}>
                  <span>Productos aplicables</span>
                  <strong>{getLinkedProductsLabel(rewardDetailsModal.reward)}</strong>
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