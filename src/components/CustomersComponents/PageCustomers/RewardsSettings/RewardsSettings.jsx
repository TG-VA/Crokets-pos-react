import React, { useEffect, useMemo, useState } from "react";
import styles from "./RewardsSettings.module.css";
import { supabase } from "../../../../lib/supabaseClient";
import RewardModal from "../../../../components/CustomersComponents/Modals/RewardModal/RewardModal";

const POINTS_AMOUNT_SETTING_KEY = "customer_points_amount_per_point";
const DEFAULT_POINTS_AMOUNT = 50;
const EXAMPLE_SALE_AMOUNT = 420;

const RewardsSettings = () => {
  const [rewards, setRewards] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loadingRewards, setLoadingRewards] = useState(false);
  const [error, setError] = useState("");

  const [pointsAmountPerPoint, setPointsAmountPerPoint] = useState("");
  const [originalPointsAmountPerPoint, setOriginalPointsAmountPerPoint] =
    useState("");
  const [loadingPointsRule, setLoadingPointsRule] = useState(false);
  const [savingPointsRule, setSavingPointsRule] = useState(false);
  const [pointsRuleMessage, setPointsRuleMessage] = useState("");
  const [pointsRuleError, setPointsRuleError] = useState("");

  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState(null);

  const numericPointsAmountPerPoint = Number(pointsAmountPerPoint || 0);

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

  const loadRewards = async () => {
    try {
      setLoadingRewards(true);
      setError("");

      const { data, error: rewardsError } = await supabase
        .from("rewards")
        .select(`
          id,
          name,
          description,
          points_required,
          is_active,
          created_at,
          updated_at
        `)
        .order("points_required", { ascending: true })
        .order("name", { ascending: true });

      if (rewardsError) throw rewardsError;

      setRewards(data || []);
    } catch (err) {
      console.error("Error cargando recompensas:", err);
      setError("No se pudieron cargar las recompensas.");
      setRewards([]);
    } finally {
      setLoadingRewards(false);
    }
  };

  const loadPointsRule = async () => {
    try {
      setLoadingPointsRule(true);
      setPointsRuleError("");
      setPointsRuleMessage("");

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
      setPointsRuleError(
        "No se pudo cargar la regla de acumulación de puntos."
      );

      const defaultValue = String(DEFAULT_POINTS_AMOUNT);
      setPointsAmountPerPoint(defaultValue);
      setOriginalPointsAmountPerPoint(defaultValue);
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
    setPointsRuleError("");
    setPointsRuleMessage("");
  };

  const handleSavePointsRule = async () => {
    try {
      setSavingPointsRule(true);
      setPointsRuleError("");
      setPointsRuleMessage("");

      const amount = Number(pointsAmountPerPoint || 0);

      if (!amount || amount <= 0) {
        setPointsRuleError("El monto para generar 1 punto debe ser mayor a 0.");
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
      setPointsRuleMessage("Regla de acumulación guardada correctamente.");
    } catch (err) {
      console.error("Error guardando regla de puntos:", err);
      setPointsRuleError("No se pudo guardar la regla de acumulación.");
    } finally {
      setSavingPointsRule(false);
    }
  };

  useEffect(() => {
    loadRewards();
    loadPointsRule();
  }, []);

  useEffect(() => {
    const rewardsChannel = supabase
      .channel("rewards-settings-realtime")
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
      supabase.removeChannel(settingsChannel);
    };
  }, []);

  const filteredRewards = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return rewards.filter((reward) => {
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
      ];

      return values.some((value) =>
        String(value || "").toLowerCase().includes(search)
      );
    });
  }, [rewards, searchTerm, statusFilter]);

  const handleNewReward = () => {
    setEditingReward(null);
    setIsRewardModalOpen(true);
  };

  const handleEditReward = (reward) => {
    setEditingReward(reward);
    setIsRewardModalOpen(true);
  };

  const handleCloseRewardModal = () => {
    setIsRewardModalOpen(false);
    setEditingReward(null);
  };

  const handleToggleStatus = async (reward) => {
    const nextStatus = reward.is_active === false;

    const confirmed = window.confirm(
      `¿Seguro que deseas ${
        nextStatus ? "activar" : "desactivar"
      } la recompensa "${reward.name}"?`
    );

    if (!confirmed) return;

    try {
      const { error: updateError } = await supabase
        .from("rewards")
        .update({
          is_active: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", reward.id);

      if (updateError) throw updateError;

      await loadRewards();
    } catch (err) {
      console.error("Error actualizando recompensa:", err);
      alert("No se pudo actualizar el estado de la recompensa.");
    }
  };

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

      {pointsRuleMessage && (
        <div className={styles.successMessage}>{pointsRuleMessage}</div>
      )}

      {pointsRuleError && (
        <div className={styles.errorMessage}>{pointsRuleError}</div>
      )}

      <div className={styles.filters}>
        <div className={styles.searchContainer}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Buscar por nombre, descripción o puntos..."
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
          onClick={() => {
            loadRewards();
            loadPointsRule();
          }}
          disabled={loadingRewards || loadingPointsRule}
        >
          {loadingRewards || loadingPointsRule
            ? "Actualizando..."
            : "Actualizar"}
        </button>
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}

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
              <th>Descripción</th>
              <th>Puntos requeridos</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {loadingRewards ? (
              <tr>
                <td colSpan="5" className={styles.textCenter}>
                  Cargando recompensas...
                </td>
              </tr>
            ) : filteredRewards.length === 0 ? (
              <tr>
                <td colSpan="5" className={styles.textCenter}>
                  No hay recompensas registradas con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              filteredRewards.map((reward) => (
                <tr key={reward.id}>
                  <td>
                    <div className={styles.rewardName}>
                      {reward.name || "SIN NOMBRE"}
                    </div>
                  </td>

                  <td>
                    <span className={styles.descriptionText}>
                      {reward.description || "SIN DESCRIPCIÓN"}
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
                        onClick={() => handleToggleStatus(reward)}
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
    </div>
  );
};

export default RewardsSettings;