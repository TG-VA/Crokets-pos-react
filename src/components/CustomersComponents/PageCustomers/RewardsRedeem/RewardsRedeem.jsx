import React, { useEffect, useMemo, useState } from "react";
import styles from "./RewardsRedeem.module.css";
import { supabase } from "../../../../lib/supabaseClient";
import { useBranch } from "../../../../contexts/BranchContext";
import RedeemRewardConfirmModal from "../../../../components/CustomersComponents/Modals/RedeemRewardConfirmModal/RedeemRewardConfirmModal";

const RewardsRedeem = () => {
  const { branch } = useBranch();

  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [rewards, setRewards] = useState([]);
  const [selectedReward, setSelectedReward] = useState(null);

  const [customerPoints, setCustomerPoints] = useState(0);

  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingRewards, setLoadingRewards] = useState(false);
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [redeeming, setRedeeming] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pendingRedeemData, setPendingRedeemData] = useState(null);

  const selectedRewardPoints = Number(selectedReward?.points_required || 0);

  const canRedeem =
    !!selectedCustomer?.id &&
    !!selectedReward?.id &&
    selectedRewardPoints > 0 &&
    customerPoints >= selectedRewardPoints &&
    !redeeming;

  const remainingPoints = useMemo(() => {
    if (!selectedReward) return customerPoints;

    return customerPoints - selectedRewardPoints;
  }, [customerPoints, selectedReward, selectedRewardPoints]);

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
          is_active
        `)
        .eq("is_active", true)
        .order("points_required", { ascending: true })
        .order("name", { ascending: true });

      if (rewardsError) throw rewardsError;

      setRewards(data || []);
    } catch (err) {
      console.error("Error cargando recompensas:", err);
      setError("No se pudieron cargar las recompensas activas.");
      setRewards([]);
    } finally {
      setLoadingRewards(false);
    }
  };

  const loadCustomerPoints = async (customerId) => {
    if (!customerId) {
      setCustomerPoints(0);
      return;
    }

    try {
      setLoadingPoints(true);
      setError("");

      const { data, error: pointsError } = await supabase
        .from("customer_points")
        .select("points")
        .eq("customer_id", customerId);

      if (pointsError) throw pointsError;

      const totalPoints = (data || []).reduce((sum, movement) => {
        return sum + Number(movement.points || 0);
      }, 0);

      setCustomerPoints(totalPoints);
    } catch (err) {
      console.error("Error cargando puntos del cliente:", err);
      setError("No se pudieron cargar los puntos del cliente.");
      setCustomerPoints(0);
    } finally {
      setLoadingPoints(false);
    }
  };

  const getLatestCustomer = async (customerId) => {
    const { data, error: customerError } = await supabase
      .from("customers")
      .select(`
        id,
        name,
        phone,
        email,
        status,
        is_points_customer,
        is_billing_customer,
        rfc,
        razon_social
      `)
      .eq("id", customerId)
      .single();

    if (customerError) throw customerError;

    return data;
  };

  const getLatestReward = async (rewardId) => {
    const { data, error: rewardError } = await supabase
      .from("rewards")
      .select(`
        id,
        name,
        description,
        points_required,
        is_active
      `)
      .eq("id", rewardId)
      .single();

    if (rewardError) throw rewardError;

    return data;
  };

  const getLatestCustomerPoints = async (customerId) => {
    const { data, error: pointsError } = await supabase
      .from("customer_points")
      .select("points")
      .eq("customer_id", customerId);

    if (pointsError) throw pointsError;

    return (data || []).reduce((sum, movement) => {
      return sum + Number(movement.points || 0);
    }, 0);
  };

  const getCurrentUserId = async () => {
    const { data, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.warn("No se pudo obtener el usuario autenticado:", authError);
      return null;
    }

    return data?.user?.id || null;
  };

  const getAuditData = async () => {
    const userId = await getCurrentUserId();

    return {
      userId,
      branchId: branch?.id || null,
    };
  };

  const searchCustomers = async (searchValue = customerSearch) => {
    const cleanSearch = String(searchValue || "").trim().toLowerCase();

    if (!cleanSearch) {
      setCustomerResults([]);
      return;
    }

    if (cleanSearch.length < 2) {
      setCustomerResults([]);
      return;
    }

    try {
      setLoadingCustomers(true);
      setError("");
      setSuccessMessage("");

      const like = `%${cleanSearch}%`;

      const { data, error: customersError } = await supabase
        .from("customers")
        .select(`
          id,
          name,
          phone,
          email,
          status,
          is_points_customer,
          is_billing_customer,
          rfc,
          razon_social
        `)
        .or(`name.ilike.${like},phone.ilike.${like},email.ilike.${like}`)
        .eq("status", true)
        .eq("is_points_customer", true)
        .order("name", { ascending: true })
        .limit(20);

      if (customersError) throw customersError;

      setCustomerResults(data || []);
    } catch (err) {
      console.error("Error buscando clientes:", err);
      setError("No se pudieron buscar clientes.");
      setCustomerResults([]);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleSelectCustomer = async (customer) => {
    setSelectedCustomer(customer);
    setSelectedReward(null);
    setSuccessMessage("");
    setError("");
    setCustomerSearch(customer.name || customer.phone || "");
    await loadCustomerPoints(customer.id);
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setSelectedReward(null);
    setCustomerPoints(0);
    setCustomerResults([]);
    setCustomerSearch("");
    setError("");
    setSuccessMessage("");
    setIsConfirmModalOpen(false);
    setPendingRedeemData(null);
  };

  const openRedeemConfirmModal = async () => {
    if (redeeming) return;

    if (!selectedCustomer?.id) {
      setError("Selecciona un cliente antes de canjear.");
      return;
    }

    if (!selectedReward?.id) {
      setError("Selecciona una recompensa para canjear.");
      return;
    }

    if (!branch?.id) {
      setError(
        "No se pudo identificar la sucursal actual. Cierra y vuelve a iniciar sesión."
      );
      return;
    }

    try {
      setRedeeming(true);
      setError("");
      setSuccessMessage("");

      const latestCustomer = await getLatestCustomer(selectedCustomer.id);

      if (!latestCustomer?.id) {
        setError("El cliente ya no existe o no se pudo validar.");
        return;
      }

      if (latestCustomer.status === false) {
        setSelectedCustomer(latestCustomer);
        setSelectedReward(null);
        setCustomerPoints(0);
        setError("No se puede canjear. El cliente está inactivo.");
        return;
      }

      if (latestCustomer.is_points_customer === false) {
        setSelectedCustomer(latestCustomer);
        setSelectedReward(null);
        setCustomerPoints(0);
        setError(
          "No se puede canjear. El cliente no está registrado como cliente de puntos."
        );
        return;
      }

      const latestReward = await getLatestReward(selectedReward.id);

      if (!latestReward?.id) {
        setSelectedReward(null);
        await loadRewards();
        setError("La recompensa ya no existe o no se pudo validar.");
        return;
      }

      if (latestReward.is_active === false) {
        setSelectedReward(null);
        await loadRewards();
        setError("No se puede canjear. La recompensa fue desactivada.");
        return;
      }

      const latestRewardPoints = Number(latestReward.points_required || 0);

      if (!Number.isFinite(latestRewardPoints) || latestRewardPoints <= 0) {
        setSelectedReward(null);
        await loadRewards();
        setError("No se puede canjear. La recompensa tiene puntos inválidos.");
        return;
      }

      const latestPoints = await getLatestCustomerPoints(latestCustomer.id);
      const pointsAfterRedeem = latestPoints - latestRewardPoints;

      setSelectedCustomer(latestCustomer);
      setCustomerPoints(latestPoints);

      if (latestPoints < latestRewardPoints) {
        setError(
          `El cliente no tiene puntos suficientes. Tiene ${latestPoints} puntos y necesita ${latestRewardPoints}.`
        );
        return;
      }

      setPendingRedeemData({
        customer: latestCustomer,
        reward: latestReward,
        currentPoints: latestPoints,
        pointsToUse: latestRewardPoints,
        remainingPoints: pointsAfterRedeem,
      });

      setIsConfirmModalOpen(true);
    } catch (err) {
      console.error("Error preparando canje:", err);
      setError(err?.message || "No se pudo preparar el canje.");
    } finally {
      setRedeeming(false);
    }
  };

  const handleRedeemReward = async () => {
    if (redeeming) return;

    if (!pendingRedeemData?.customer?.id || !pendingRedeemData?.reward?.id) {
      setError("No hay un canje preparado para confirmar.");
      setIsConfirmModalOpen(false);
      setPendingRedeemData(null);
      return;
    }

    try {
      setRedeeming(true);
      setError("");
      setSuccessMessage("");

      const latestCustomer = await getLatestCustomer(
        pendingRedeemData.customer.id
      );
      const latestReward = await getLatestReward(pendingRedeemData.reward.id);
      const latestRewardPoints = Number(latestReward?.points_required || 0);
      const latestPoints = await getLatestCustomerPoints(latestCustomer.id);

      if (!latestCustomer?.id || latestCustomer.status === false) {
        setError("No se puede canjear. El cliente está inactivo o ya no existe.");
        setIsConfirmModalOpen(false);
        setPendingRedeemData(null);
        return;
      }

      if (latestCustomer.is_points_customer === false) {
        setError(
          "No se puede canjear. El cliente no está registrado como cliente de puntos."
        );
        setIsConfirmModalOpen(false);
        setPendingRedeemData(null);
        return;
      }

      if (!latestReward?.id || latestReward.is_active === false) {
        setError(
          "No se puede canjear. La recompensa fue desactivada o ya no existe."
        );
        setSelectedReward(null);
        setIsConfirmModalOpen(false);
        setPendingRedeemData(null);
        await loadRewards();
        return;
      }

      if (!Number.isFinite(latestRewardPoints) || latestRewardPoints <= 0) {
        setError("No se puede canjear. La recompensa tiene puntos inválidos.");
        setSelectedReward(null);
        setIsConfirmModalOpen(false);
        setPendingRedeemData(null);
        await loadRewards();
        return;
      }

      if (latestPoints < latestRewardPoints) {
        setCustomerPoints(latestPoints);
        setError(
          `El cliente ya no tiene puntos suficientes. Tiene ${latestPoints} puntos y necesita ${latestRewardPoints}.`
        );
        setIsConfirmModalOpen(false);
        setPendingRedeemData(null);
        return;
      }

      const now = new Date().toISOString();
      const pointsAfterRedeem = latestPoints - latestRewardPoints;
      const { userId, branchId } = await getAuditData();

      if (!userId) {
        setError("No se pudo identificar al usuario que realiza el canje.");
        return;
      }

      if (!branchId) {
        setError("No se pudo identificar la sucursal donde se realiza el canje.");
        return;
      }

      const { error: rewardInsertError } = await supabase
        .from("customer_rewards")
        .insert([
          {
            id: crypto.randomUUID(),
            customer_id: latestCustomer.id,
            reward_id: latestReward.id,
            points_used: latestRewardPoints,
            redeemed_at: now,
            user_id: userId,
            branch_id: branchId,
          },
        ]);

      if (rewardInsertError) throw rewardInsertError;

      const { error: pointsInsertError } = await supabase
        .from("customer_points")
        .insert([
          {
            id: crypto.randomUUID(),
            customer_id: latestCustomer.id,
            points: latestRewardPoints * -1,
            movement_type: "redeem",
            source: "reward",
            related_sale_id: null,
            reward_id: latestReward.id,
            user_id: userId,
            branch_id: branchId,
            created_at: now,
          },
        ]);

      if (pointsInsertError) throw pointsInsertError;

      setSelectedCustomer(latestCustomer);
      setSelectedReward(null);
      setCustomerPoints(pointsAfterRedeem);
      setPendingRedeemData(null);
      setIsConfirmModalOpen(false);

      setSuccessMessage(
        `Canje realizado correctamente. ${
          latestCustomer.name || "Cliente"
        } usó ${latestRewardPoints} puntos.`
      );

      await loadRewards();
      await loadCustomerPoints(latestCustomer.id);
    } catch (err) {
      console.error("Error realizando canje:", err);
      setError(err?.message || "No se pudo realizar el canje.");
    } finally {
      setRedeeming(false);
    }
  };

  useEffect(() => {
    loadRewards();
  }, []);

  useEffect(() => {
    const searchValue = customerSearch.trim();

    if (!searchValue) {
      setCustomerResults([]);
      setLoadingCustomers(false);
      return;
    }

    if (searchValue.length < 2) {
      setCustomerResults([]);
      setLoadingCustomers(false);
      return;
    }

    const searchTimeout = setTimeout(() => {
      if (
        selectedCustomer &&
        searchValue === (selectedCustomer.name || selectedCustomer.phone || "")
      ) {
        return;
      }

      setSelectedCustomer(null);
      setSelectedReward(null);
      setCustomerPoints(0);
      searchCustomers(searchValue);
    }, 350);

    return () => clearTimeout(searchTimeout);
  }, [customerSearch]);

  useEffect(() => {
    const rewardsChannel = supabase
      .channel("rewards-redeem-rewards-realtime")
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

    return () => {
      supabase.removeChannel(rewardsChannel);
    };
  }, []);

  useEffect(() => {
    if (!selectedCustomer?.id) return;

    const pointsChannel = supabase
      .channel(`customer-points-redeem-${selectedCustomer.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "customer_points",
          filter: `customer_id=eq.${selectedCustomer.id}`,
        },
        () => {
          loadCustomerPoints(selectedCustomer.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(pointsChannel);
    };
  }, [selectedCustomer?.id]);

  return (
    <div className={styles.content}>
      <div className={styles.header}>
        <div>
          <h1>CANJE DE RECOMPENSAS</h1>
          <p>
            Busca al cliente, selecciona una recompensa activa y valida si tiene
            puntos suficientes para canjear.
          </p>
        </div>
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}
      {successMessage && (
        <div className={styles.successMessage}>{successMessage}</div>
      )}

      <div className={styles.mainGrid}>
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Buscar cliente</h2>
            <p>Busca por nombre, teléfono o correo.</p>
          </div>

          <div className={styles.searchRow}>
            <div className={styles.searchContainer}>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Buscar cliente..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();

                    if (!customerSearch.trim()) {
                      setError("Ingresa nombre o teléfono para buscar cliente.");
                      return;
                    }

                    searchCustomers(customerSearch);
                  }
                }}
              />

              {customerSearch && (
                <button
                  type="button"
                  className={styles.clearSearchButton}
                  onClick={handleClearCustomer}
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="button"
              className={styles.searchButton}
              onClick={() => {
                if (!customerSearch.trim()) {
                  setError("Ingresa nombre o teléfono para buscar cliente.");
                  return;
                }

                searchCustomers(customerSearch);
              }}
              disabled={loadingCustomers}
            >
              {loadingCustomers ? "Buscando..." : "Buscar"}
            </button>
          </div>

          <div className={styles.customerResults}>
            {loadingCustomers ? (
              <div className={styles.emptyState}>Buscando clientes...</div>
            ) : customerResults.length === 0 ? (
              <div className={styles.emptyState}>
                No hay clientes para mostrar.
              </div>
            ) : (
              customerResults.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  className={`${styles.customerCard} ${
                    selectedCustomer?.id === customer.id
                      ? styles.customerCardSelected
                      : ""
                  }`}
                  onClick={() => handleSelectCustomer(customer)}
                >
                  <div>
                    <strong>{customer.name || "SIN NOMBRE"}</strong>
                    <span>Tel: {customer.phone || "SIN TELÉFONO"}</span>
                    <span>{customer.email || "SIN CORREO"}</span>
                  </div>

                  {customer.is_billing_customer && (
                    <small className={styles.fiscalBadge}>FISCAL</small>
                  )}
                </button>
              ))
            )}
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Cliente seleccionado</h2>
            <p>Puntos disponibles para canje.</p>
          </div>

          {!selectedCustomer ? (
            <div className={styles.emptyCustomer}>
              Selecciona un cliente para ver sus puntos.
            </div>
          ) : (
            <div className={styles.selectedCustomerCard}>
              <div>
                <h3>{selectedCustomer.name || "SIN NOMBRE"}</h3>
                <p>Teléfono: {selectedCustomer.phone || "SIN TELÉFONO"}</p>
                <p>Correo: {selectedCustomer.email || "SIN CORREO"}</p>

                {selectedCustomer.is_billing_customer && (
                  <p>
                    Datos fiscales:{" "}
                    <strong>
                      {selectedCustomer.razon_social ||
                        selectedCustomer.rfc ||
                        "REGISTRADOS"}
                    </strong>
                  </p>
                )}
              </div>

              <div className={styles.pointsBox}>
                <span>Puntos disponibles</span>
                <strong>
                  {loadingPoints ? "..." : Number(customerPoints || 0)}
                </strong>
              </div>
            </div>
          )}

          {selectedReward && selectedCustomer && (
            <div
              className={`${styles.validationBox} ${
                customerPoints >= selectedRewardPoints
                  ? styles.validationSuccess
                  : styles.validationError
              }`}
            >
              {customerPoints >= selectedRewardPoints ? (
                <>
                  El cliente sí puede canjear esta recompensa. Le quedarían{" "}
                  <strong>{remainingPoints}</strong> puntos.
                </>
              ) : (
                <>
                  El cliente no tiene puntos suficientes. Le faltan{" "}
                  <strong>{selectedRewardPoints - customerPoints}</strong>{" "}
                  puntos.
                </>
              )}
            </div>
          )}
        </section>
      </div>

      <section className={styles.rewardsSection}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>Recompensas disponibles</h2>
            <p>Solo se muestran recompensas activas.</p>
          </div>

          <button
            type="button"
            className={styles.refreshButton}
            onClick={loadRewards}
            disabled={loadingRewards}
          >
            {loadingRewards ? "Actualizando..." : "Actualizar"}
          </button>
        </div>

        <div className={styles.rewardsGrid}>
          {loadingRewards ? (
            <div className={styles.emptyState}>Cargando recompensas...</div>
          ) : rewards.length === 0 ? (
            <div className={styles.emptyState}>
              No hay recompensas activas configuradas.
            </div>
          ) : (
            rewards.map((reward) => {
              const requiredPoints = Number(reward.points_required || 0);
              const isSelected = selectedReward?.id === reward.id;

              const hasSelectedCustomer = !!selectedCustomer?.id;
              const hasEnoughPoints =
                hasSelectedCustomer && customerPoints >= requiredPoints;

              const isDisabled = !hasSelectedCustomer || !hasEnoughPoints;

              return (
                <button
                  key={reward.id}
                  type="button"
                  disabled={isDisabled}
                  className={`${styles.rewardCard} ${
                    isSelected ? styles.rewardCardSelected : ""
                  } ${isDisabled ? styles.rewardCardDisabled : ""}`}
                  onClick={() => {
                    if (isDisabled) return;

                    setSelectedReward(reward);
                    setError("");
                    setSuccessMessage("");
                  }}
                >
                  <div className={styles.rewardCardTop}>
                    <h3>{reward.name}</h3>
                    <span>{requiredPoints} pts</span>
                  </div>

                  <p>{reward.description || "SIN DESCRIPCIÓN"}</p>

                  <small>
                    {!hasSelectedCustomer
                      ? "Selecciona un cliente"
                      : hasEnoughPoints
                        ? "Disponible para canje"
                        : `Faltan ${requiredPoints - customerPoints} puntos`}
                  </small>
                </button>
              );
            })
          )}
        </div>
      </section>

      <div className={styles.footerActions}>
        <button
          type="button"
          className={styles.cancelSelectionButton}
          onClick={() => {
            setSelectedReward(null);
            setError("");
            setSuccessMessage("");
            setPendingRedeemData(null);
            setIsConfirmModalOpen(false);
          }}
          disabled={!selectedReward || redeeming}
        >
          Limpiar recompensa
        </button>

        <button
          type="button"
          className={styles.redeemButton}
          onClick={openRedeemConfirmModal}
          disabled={!canRedeem}
        >
          {redeeming ? "Validando..." : "Canjear recompensa"}
        </button>
      </div>

      <RedeemRewardConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => {
          if (redeeming) return;
          setIsConfirmModalOpen(false);
          setPendingRedeemData(null);
        }}
        onConfirm={handleRedeemReward}
        customer={pendingRedeemData?.customer}
        reward={pendingRedeemData?.reward}
        currentPoints={pendingRedeemData?.currentPoints}
        pointsToUse={pendingRedeemData?.pointsToUse}
        remainingPoints={pendingRedeemData?.remainingPoints}
        saving={redeeming}
      />
    </div>
  );
};

export default RewardsRedeem;