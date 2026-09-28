import React, { useEffect, useMemo, useState } from "react";
import styles from "./RewardsAvailability.module.css";
import { useAppModal } from "../../../../hooks/useAppModal";
import AppModal from "../../../AppModal/AppModal";
import { subscribeToTableChanges } from "../services/customersRealtimeService";
import { sortCustomersByName } from "../utils/customerFormatters";
import { calculatePointsBalance } from "../services/customerPointsCalculationService";
import {
  fetchActiveRewards,
  searchActivePointsCustomers,
  fetchCustomerPointsMovements,
} from "./services/rewardsAvailabilityService";
import {
  calculateRewardsStats,
  getRewardStatus,
  getRewardTypeLabel,
  isSearchableCustomerTerm,
} from "./services/rewardsAvailabilityCalculationService";

const RewardsAvailability = () => {
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [rewards, setRewards] = useState([]);
  const [customerPoints, setCustomerPoints] = useState(0);

  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingRewards, setLoadingRewards] = useState(false);
  const [loadingPoints, setLoadingPoints] = useState(false);

  const { appModal, closeAppModal, showAppAlert } = useAppModal();

  const hasSelectedCustomer = !!selectedCustomer?.id;

  const rewardsStats = useMemo(() => {
    return calculateRewardsStats({
      rewards,
      customerPoints,
      hasSelectedCustomer,
    });
  }, [hasSelectedCustomer, rewards, customerPoints]);

  const loadRewards = async () => {
    try {
      setLoadingRewards(true);

      setRewards(await fetchActiveRewards());
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

      const movements = await fetchCustomerPointsMovements(customerId);

      setCustomerPoints(calculatePointsBalance(movements));
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
    if (!isSearchableCustomerTerm(searchValue)) {
      setCustomerResults([]);
      return;
    }

    try {
      setLoadingCustomers(true);

      const customersData = await searchActivePointsCustomers(searchValue);

      setCustomerResults(sortCustomersByName(customersData));
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
    return subscribeToTableChanges({
      channelName: "rewards-query-rewards-realtime",
      tables: ["rewards"],
      onChange: loadRewards,
    });
  }, []);

  useEffect(() => {
    if (!selectedCustomer?.id) return;

    return subscribeToTableChanges({
      channelName: `customer-points-query-${selectedCustomer.id}`,
      tables: ["customer_points"],
      rowFilter: `customer_id=eq.${selectedCustomer.id}`,
      onChange: () => loadCustomerPoints(selectedCustomer.id),
    });
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
              const rewardStatus = getRewardStatus({
                reward,
                customerPoints,
                hasSelectedCustomer,
              });

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
