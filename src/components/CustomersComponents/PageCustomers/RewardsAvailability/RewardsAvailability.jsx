import React, { useEffect, useMemo, useState } from "react";
import styles from "./RewardsAvailability.module.css";
import { supabase } from "../../../../lib/supabaseClient";
import AppModal from "../../../AppModal/AppModal";

const RewardsAvailability = () => {
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [rewards, setRewards] = useState([]);
  const [customerPoints, setCustomerPoints] = useState(0);

  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingRewards, setLoadingRewards] = useState(false);
  const [loadingPoints, setLoadingPoints] = useState(false);

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

  const hasSelectedCustomer = !!selectedCustomer?.id;

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

  const getCustomerSortName = (customer) => {
    return String(
      customer.name || customer.phone || customer.email || "SIN NOMBRE"
    ).trim();
  };

  const sortCustomersByName = (customersList = []) => {
    return [...customersList].sort((a, b) => {
      return getCustomerSortName(a).localeCompare(getCustomerSortName(b), "es", {
        sensitivity: "base",
        numeric: true,
      });
    });
  };

  const rewardsStats = useMemo(() => {
    if (!hasSelectedCustomer) {
      return {
        available: 0,
        unavailable: 0,
        total: rewards.length,
      };
    }

    return rewards.reduce(
      (acc, reward) => {
        const requiredPoints = Number(reward.points_required || 0);

        if (customerPoints >= requiredPoints) {
          acc.available += 1;
        } else {
          acc.unavailable += 1;
        }

        acc.total += 1;
        return acc;
      },
      {
        available: 0,
        unavailable: 0,
        total: 0,
      }
    );
  }, [hasSelectedCustomer, rewards, customerPoints]);

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
          discount_type,
          discount_value
        `)
        .eq("is_active", true)
        .order("points_required", { ascending: true })
        .order("name", { ascending: true, nullsFirst: false });

      if (rewardsError) throw rewardsError;

      setRewards(data || []);
    } catch (err) {
      console.error("Error cargando recompensas:", err);
      setRewards([]);

      showAppAlert({
        type: "danger",
        title: "No se pudieron cargar recompensas",
        message: "No se pudieron cargar las recompensas activas.",
        confirmText: "Entendido",
      });
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
      setCustomerPoints(0);

      showAppAlert({
        type: "danger",
        title: "No se pudieron cargar puntos",
        message: "No se pudieron cargar los puntos del cliente.",
        confirmText: "Entendido",
      });
    } finally {
      setLoadingPoints(false);
    }
  };

  const searchCustomers = async (searchValue = customerSearch) => {
    const cleanSearch = String(searchValue || "").trim().toLowerCase();

    if (!cleanSearch || cleanSearch.length < 2) {
      setCustomerResults([]);
      return;
    }

    try {
      setLoadingCustomers(true);

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
        .eq("status", true)
        .eq("is_points_customer", true)
        .or(`name.ilike.${like},phone.ilike.${like},email.ilike.${like}`)
        .order("name", { ascending: true, nullsFirst: false })
        .limit(20);

      if (customersError) throw customersError;

      setCustomerResults(sortCustomersByName(data || []));
    } catch (err) {
      console.error("Error buscando clientes:", err);
      setCustomerResults([]);

      showAppAlert({
        type: "danger",
        title: "No se pudieron buscar clientes",
        message: "Ocurrió un error al buscar clientes.",
        confirmText: "Entendido",
      });
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleSelectCustomer = async (customer) => {
    if (customer.status === false) {
      showAppAlert({
        type: "warning",
        title: "Cliente inactivo",
        message:
          "No se pueden consultar recompensas para clientes inactivos. Activa el cliente antes de continuar.",
        confirmText: "Entendido",
      });
      return;
    }

    if (customer.is_points_customer !== true) {
      showAppAlert({
        type: "warning",
        title: "Cliente no válido",
        message:
          "Este cliente no está registrado como cliente de puntos. Activa el programa de puntos antes de consultar recompensas.",
        confirmText: "Entendido",
      });
      return;
    }

    setSelectedCustomer(customer);
    setCustomerSearch("");
    setCustomerResults([]);

    await loadCustomerPoints(customer.id);
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerPoints(0);
    setCustomerResults([]);
    setCustomerSearch("");
  };

  const handleManualSearch = () => {
    if (!customerSearch.trim()) {
      showAppAlert({
        type: "warning",
        title: "Búsqueda requerida",
        message: "Ingresa nombre, teléfono o correo para buscar cliente.",
        confirmText: "Entendido",
      });
      return;
    }

    if (customerSearch.trim().length < 2) {
      showAppAlert({
        type: "warning",
        title: "Búsqueda muy corta",
        message: "Ingresa al menos 2 caracteres para buscar cliente.",
        confirmText: "Entendido",
      });
      return;
    }

    searchCustomers(customerSearch);
  };

  const getRewardTypeLabel = (reward) => {
    const type = String(reward?.reward_type || "").trim();

    if (type === "free_product") {
      return "Producto gratis";
    }

    if (type === "product_discount") {
      if (reward?.discount_type === "percent") {
        return `Descuento ${Number(reward.discount_value || 0)}%`;
      }

      if (reward?.discount_type === "fixed") {
        return `Descuento $${Number(reward.discount_value || 0).toFixed(2)}`;
      }

      return "Descuento en producto";
    }

    return "Recompensa";
  };

  const getRewardStatus = (reward) => {
    const requiredPoints = Number(reward.points_required || 0);

    if (!hasSelectedCustomer) {
      return {
        label: "Selecciona un cliente",
        status: "neutral",
      };
    }

    if (customerPoints >= requiredPoints) {
      return {
        label: "Disponible para canje en ventas",
        status: "available",
      };
    }

    return {
      label: `Faltan ${requiredPoints - customerPoints} puntos`,
      status: "unavailable",
    };
  };

  useEffect(() => {
    loadRewards();
  }, []);

  useEffect(() => {
    const searchValue = customerSearch.trim();

    if (!searchValue || searchValue.length < 2) {
      setCustomerResults([]);
      setLoadingCustomers(false);
      return;
    }

    const searchTimeout = setTimeout(() => {
      setSelectedCustomer(null);
      setCustomerPoints(0);
      searchCustomers(searchValue);
    }, 350);

    return () => clearTimeout(searchTimeout);
  }, [customerSearch]);

  useEffect(() => {
    const rewardsChannel = supabase
      .channel("rewards-query-rewards-realtime")
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
      .channel(`customer-points-query-${selectedCustomer.id}`)
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
          <h1>CONSULTA DE RECOMPENSAS</h1>
          <p>
            Busca un cliente para consultar sus puntos y revisar qué recompensas
            tiene disponibles. Los canjes se realizan únicamente desde el módulo
            de ventas.
          </p>
        </div>
      </div>

      <div className={styles.mainGrid}>
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Buscar cliente</h2>
            <p>
              Busca por nombre, teléfono o correo. Solo se muestran clientes
              activos.
            </p>
          </div>

          <div className={styles.searchRow}>
            <div className={styles.searchContainer}>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Buscar cliente activo..."
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setSelectedCustomer(null);
                  setCustomerPoints(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleManualSearch();
                  }
                }}
              />

              {customerSearch && (
                <button
                  type="button"
                  className={styles.clearSearchButton}
                  onClick={handleClearCustomer}
                >
                  ×
                </button>
              )}
            </div>

            <button
              type="button"
              className={styles.searchButton}
              onClick={handleManualSearch}
              disabled={loadingCustomers}
            >
              {loadingCustomers ? "Buscando..." : "Buscar"}
            </button>
          </div>

          {(loadingCustomers || customerSearch.trim().length >= 2) && (
            <div className={styles.customerResults}>
              {loadingCustomers ? (
                <div className={styles.emptyState}>Buscando clientes...</div>
              ) : customerResults.length === 0 ? (
                <div className={styles.emptyState}>
                  No hay clientes activos para mostrar.
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
          )}
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Cliente seleccionado</h2>
            <p>Puntos disponibles y resumen de recompensas.</p>
          </div>

          {!selectedCustomer ? (
            <div className={styles.emptyCustomer}>
              Selecciona un cliente para ver sus puntos.
            </div>
          ) : (
            <>
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

              <div className={styles.customerStats}>
                <div className={styles.statBox}>
                  <span>Puede canjear</span>
                  <strong>{rewardsStats.available}</strong>
                </div>

                <div className={styles.statBox}>
                  <span>No alcanza</span>
                  <strong>{rewardsStats.unavailable}</strong>
                </div>

                <div className={styles.statBox}>
                  <span>Recompensas activas</span>
                  <strong>{rewardsStats.total}</strong>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <section className={styles.rewardsSection}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>Recompensas activas</h2>
            <p>
              Consulta qué recompensas están disponibles según los puntos del
              cliente seleccionado.
            </p>
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
              const rewardStatus = getRewardStatus(reward);

              return (
                <article
                  key={reward.id}
                  className={`${styles.rewardCard} ${
                    rewardStatus.status === "available"
                      ? styles.rewardCardAvailable
                      : ""
                  } ${
                    rewardStatus.status === "unavailable"
                      ? styles.rewardCardUnavailable
                      : ""
                  } ${
                    rewardStatus.status === "neutral"
                      ? styles.rewardCardNeutral
                      : ""
                  }`}
                >
                  <div className={styles.rewardCardTop}>
                    <h3>{reward.name}</h3>
                    <span>{requiredPoints} pts</span>
                  </div>

                  <div className={styles.rewardType}>
                    {getRewardTypeLabel(reward)}
                  </div>

                  <p>{reward.description || "SIN DESCRIPCIÓN"}</p>

                  <div
                    className={`${styles.rewardStatus} ${
                      rewardStatus.status === "available"
                        ? styles.rewardStatusAvailable
                        : ""
                    } ${
                      rewardStatus.status === "unavailable"
                        ? styles.rewardStatusUnavailable
                        : ""
                    }`}
                  >
                    {rewardStatus.label}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

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

export default RewardsAvailability;