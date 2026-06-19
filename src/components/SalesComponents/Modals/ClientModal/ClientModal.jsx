import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./ClientModal.module.css";
import { supabase } from "../../../../lib/supabaseClient";

const ClientModal = ({
  isOpen,
  onClose,
  onAssignClient,
  currentSaleClient = null,
  currentSaleReward = null,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(currentSaleClient);
  const [selectedRewards, setSelectedRewards] = useState([]);

  const [rewards, setRewards] = useState([]);
  const [loadingRewards, setLoadingRewards] = useState(false);

  const [loadingClients, setLoadingClients] = useState(false);
  const [error, setError] = useState("");

  const hasInitializedOpenRef = useRef(false);
  const lastInitializedClientIdRef = useRef(null);

  const normalizeSearch = (value) => {
    return String(value || "").trim();
  };

  const formatPoints = (value) => {
    return Number(value || 0);
  };

  const normalizeRewardType = (type) => {
    if (type === "product_discount") return "product_discount";
    return "free_product";
  };

  const normalizeSelectedRewards = (value) => {
    if (!value) return [];

    if (Array.isArray(value)) {
      return value
        .filter(Boolean)
        .map((item) => {
          if (item.reward?.id) {
            return {
              ...item.reward,
              redeemQuantity: Math.max(Number(item.redeemQuantity || 1), 1),
            };
          }

          return {
            ...item,
            redeemQuantity: Math.max(Number(item.redeemQuantity || 1), 1),
          };
        });
    }

    if (value?.reward?.id) {
      return [
        {
          ...value.reward,
          redeemQuantity: Math.max(Number(value.redeemQuantity || 1), 1),
        },
      ];
    }

    if (value?.id) {
      return [
        {
          ...value,
          redeemQuantity: Math.max(Number(value.redeemQuantity || 1), 1),
        },
      ];
    }

    return [];
  };

  const getRewardTypeLabel = (reward) => {
    const type = normalizeRewardType(reward?.reward_type);

    if (type === "free_product") return "Producto gratis";
    if (type === "product_discount") return "Descuento en producto";

    return "Producto gratis";
  };

  const getRewardBenefitLabel = (reward) => {
    const type = normalizeRewardType(reward?.reward_type);
    const quantity = Number(reward?.reward_quantity || 1);
    const discountType = reward?.discount_type;
    const discountValue = Number(reward?.discount_value || 0);

    if (type === "free_product") {
      return `${quantity} producto${quantity !== 1 ? "s" : ""} gratis por canje`;
    }

    if (type === "product_discount") {
      if (discountType === "percent") {
        return `${discountValue}% en ${quantity} unidad${
          quantity !== 1 ? "es" : ""
        } por canje`;
      }

      if (discountType === "fixed") {
        return `$${discountValue.toFixed(2)} en ${quantity} unidad${
          quantity !== 1 ? "es" : ""
        } por canje`;
      }

      return `Descuento en ${quantity} unidad${quantity !== 1 ? "es" : ""}`;
    }

    return "Beneficio no definido";
  };

  const getSelectedRewardQuantity = (rewardId) => {
    const selectedReward = selectedRewards.find((reward) => reward.id === rewardId);
    return Number(selectedReward?.redeemQuantity || 0);
  };

  const isRewardSelected = (rewardId) => {
    return selectedRewards.some((reward) => reward.id === rewardId);
  };

  const loadCustomerPoints = async (customerIds = []) => {
    if (!customerIds.length) return {};

    const { data, error: pointsError } = await supabase
      .from("customer_points")
      .select("customer_id, points")
      .in("customer_id", customerIds);

    if (pointsError) throw pointsError;

    return (data || []).reduce((acc, movement) => {
      const customerId = movement.customer_id;

      acc[customerId] =
        Number(acc[customerId] || 0) + Number(movement.points || 0);

      return acc;
    }, {});
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
          reward_products (
            id,
            product_id
          )
        `)
        .eq("is_active", true)
        .order("points_required", { ascending: true })
        .order("name", { ascending: true });

      if (rewardsError) throw rewardsError;

      setRewards(data || []);
    } catch (err) {
      console.error("Error cargando recompensas:", err);
      setRewards([]);
      setError("No se pudieron cargar las recompensas disponibles.");
    } finally {
      setLoadingRewards(false);
    }
  };

  const searchClients = async (term = searchTerm) => {
    const cleanSearch = normalizeSearch(term);

    try {
      setLoadingClients(true);
      setError("");

      if (cleanSearch.length < 2) {
        setClients(currentSaleClient ? [currentSaleClient] : []);
        return;
      }

      const { data, error: customersError } = await supabase
        .from("customers")
        .select("id, name, phone, email, status, is_points_customer")
        .eq("is_points_customer", true)
        .neq("status", false)
        .or(
          `name.ilike.%${cleanSearch}%,phone.ilike.%${cleanSearch}%,email.ilike.%${cleanSearch}%`
        )
        .order("name", { ascending: true })
        .limit(12);

      if (customersError) throw customersError;

      const customers = data || [];
      const customerIds = customers.map((customer) => customer.id);
      const pointsByCustomer = await loadCustomerPoints(customerIds);

      const customersWithPoints = customers.map((customer) => ({
        ...customer,
        points: formatPoints(pointsByCustomer[customer.id]),
      }));

      if (currentSaleClient?.id) {
        const alreadyIncluded = customersWithPoints.some(
          (customer) => customer.id === currentSaleClient.id
        );

        setClients(
          alreadyIncluded
            ? customersWithPoints
            : [
                {
                  ...currentSaleClient,
                  points: formatPoints(currentSaleClient.points),
                },
                ...customersWithPoints,
              ]
        );

        return;
      }

      setClients(customersWithPoints);
    } catch (err) {
      console.error("Error buscando clientes:", err);
      setError("No se pudieron cargar los clientes.");
      setClients(currentSaleClient ? [currentSaleClient] : []);
    } finally {
      setLoadingClients(false);
    }
  };

  const clientPoints = useMemo(() => {
    return Number(selectedClient?.points || 0);
  }, [selectedClient]);

  const activeRewards = useMemo(() => {
    if (!selectedClient?.id) return [];

    return rewards.filter((reward) => {
      const requiredPoints = Number(reward.points_required || 0);
      return reward.is_active !== false && requiredPoints > 0;
    });
  }, [rewards, selectedClient]);

  const selectedRewardsTotalPoints = useMemo(() => {
    return selectedRewards.reduce((sum, reward) => {
      const requiredPoints = Number(reward.points_required || 0);
      const redeemQuantity = Math.max(Number(reward.redeemQuantity || 1), 1);

      return sum + requiredPoints * redeemQuantity;
    }, 0);
  }, [selectedRewards]);

  const remainingPoints = useMemo(() => {
    return Math.max(clientPoints - selectedRewardsTotalPoints, 0);
  }, [clientPoints, selectedRewardsTotalPoints]);

  const selectedRewardsCount = useMemo(() => {
    return selectedRewards.reduce((sum, reward) => {
      return sum + Math.max(Number(reward.redeemQuantity || 1), 1);
    }, 0);
  }, [selectedRewards]);

  const selectableRewardsCount = useMemo(() => {
    if (!selectedClient?.id) return 0;

    return activeRewards.filter((reward) => {
      const requiredPoints = Number(reward.points_required || 0);
      return requiredPoints <= remainingPoints;
    }).length;
  }, [activeRewards, selectedClient, remainingPoints]);

  const visibleClients = useMemo(() => {
    if (!selectedClient?.id) return clients;

    return clients.filter((client) => client.id !== selectedClient.id);
  }, [clients, selectedClient]);

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    setSelectedRewards([]);
    setError("");
  };

  const handleAddReward = (reward) => {
    if (!reward?.id) return;

    const requiredPoints = Number(reward.points_required || 0);

    if (requiredPoints > remainingPoints) {
      return;
    }

    setSelectedRewards((prev) => {
      const alreadySelected = prev.some(
        (selectedReward) => selectedReward.id === reward.id
      );

      if (alreadySelected) {
        return prev.map((selectedReward) => {
          if (selectedReward.id !== reward.id) return selectedReward;

          return {
            ...selectedReward,
            redeemQuantity: Math.max(
              Number(selectedReward.redeemQuantity || 1) + 1,
              1
            ),
          };
        });
      }

      return [
        ...prev,
        {
          ...reward,
          redeemQuantity: 1,
        },
      ];
    });
  };

  const handleSubtractReward = (rewardId) => {
    if (!rewardId) return;

    setSelectedRewards((prev) =>
      prev
        .map((reward) => {
          if (reward.id !== rewardId) return reward;

          const nextQuantity = Math.max(Number(reward.redeemQuantity || 1) - 1, 0);

          return {
            ...reward,
            redeemQuantity: nextQuantity,
          };
        })
        .filter((reward) => Number(reward.redeemQuantity || 0) > 0)
    );
  };

  const handleRemoveSelectedReward = (rewardId) => {
    setSelectedRewards((prev) =>
      prev.filter((selectedReward) => selectedReward.id !== rewardId)
    );
  };

  const handleAssign = () => {
    if (!selectedClient) return;

    if (onAssignClient) {
      onAssignClient(selectedClient, selectedRewards);
    }

    closeModal();
  };

  const handleRemoveClient = () => {
    setSelectedClient(null);
    setSelectedRewards([]);

    if (onAssignClient) {
      onAssignClient(null, []);
    }

    closeModal();
  };

  const closeModal = () => {
    setSearchTerm("");
    setClients(currentSaleClient ? [currentSaleClient] : []);
    setSelectedClient(currentSaleClient);
    setSelectedRewards([]);
    setLoadingClients(false);
    setError("");
    onClose();
  };

  useEffect(() => {
    if (!isOpen) {
      hasInitializedOpenRef.current = false;
      lastInitializedClientIdRef.current = null;
      return;
    }

    const currentClientId = currentSaleClient?.id || null;
    const shouldInitialize =
      !hasInitializedOpenRef.current ||
      lastInitializedClientIdRef.current !== currentClientId;

    if (!shouldInitialize) return;

    hasInitializedOpenRef.current = true;
    lastInitializedClientIdRef.current = currentClientId;

    setSelectedClient(currentSaleClient);
    setSelectedRewards([]);
    setSearchTerm("");
    setClients(currentSaleClient ? [currentSaleClient] : []);
    setLoadingClients(false);
    setError("");
    loadRewards();
  }, [isOpen, currentSaleClient?.id]);

  useEffect(() => {
    if (!isOpen) return;

    const cleanSearch = normalizeSearch(searchTerm);

    if (cleanSearch.length < 2) {
      setClients(currentSaleClient ? [currentSaleClient] : []);
      setLoadingClients(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      searchClients(cleanSearch);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
      }

      if (event.key === "Enter" && selectedClient) {
        event.preventDefault();
        handleAssign();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, selectedClient, selectedRewards]);

  const selectedClientLabel = useMemo(() => {
    if (!selectedClient) return "";

    return selectedClient.name || selectedClient.phone || "CLIENTE SIN NOMBRE";
  }, [selectedClient]);

  const assignButtonLabel = useMemo(() => {
    if (selectedRewardsCount === 0) return "Asignar cliente";
    if (selectedRewardsCount === 1) return "Asignar cliente y recompensa";
    return "Asignar cliente y recompensas";
  }, [selectedRewardsCount]);

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={closeModal}>
      <div
        className={styles.modalContainer}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div>
            <h2>Asignar cliente</h2>
            <p>Busca un cliente registrado para asociarlo a la venta.</p>
          </div>

          <button
            type="button"
            className={styles.closeButton}
            onClick={closeModal}
          >
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.searchBarContainer}>
            <label>Buscar cliente</label>

            <div className={styles.searchRow}>
              <input
                type="text"
                className={styles.clientSearchBar}
                placeholder={
                  selectedClient
                    ? "Buscar otro cliente..."
                    : "Nombre, teléfono o correo..."
                }
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setError("");
                }}
                autoFocus
              />

              {searchTerm && (
                <button
                  type="button"
                  className={styles.clearSearchButton}
                  onClick={() => {
                    setSearchTerm("");
                    setClients(currentSaleClient ? [currentSaleClient] : []);
                    setSelectedClient(currentSaleClient);
                    setSelectedRewards([]);
                    setLoadingClients(false);
                    setError("");
                  }}
                >
                  ×
                </button>
              )}

              <button
                type="button"
                className={styles.searchButton}
                onClick={() => searchClients(searchTerm)}
                disabled={loadingClients}
              >
                {loadingClients ? "Buscando..." : "Buscar"}
              </button>
            </div>

            <span className={styles.searchHelp}>
              Escribe mínimo 2 caracteres para buscar.
            </span>
          </div>

          {selectedClient && (
            <div className={styles.selectedClientBox}>
              <div>
                <span>Cliente seleccionado</span>
                <strong>{selectedClientLabel}</strong>
              </div>

              <div className={styles.selectedClientPoints}>
                <strong>{formatPoints(clientPoints)}</strong>
                <span>pts</span>
              </div>
            </div>
          )}

          {error && <div className={styles.errorMessage}>{error}</div>}

          {(!selectedClient || visibleClients.length > 0 || loadingClients) && (
            <div className={styles.clientList}>
              {loadingClients ? (
                <p className={styles.noClientsMessage}>Buscando clientes...</p>
              ) : visibleClients.length > 0 ? (
                visibleClients.map((client) => (
                  <button
                    type="button"
                    key={client.id}
                    className={`${styles.clientItem} ${
                      selectedClient?.id === client.id
                        ? styles.clientItemSelected
                        : ""
                    }`}
                    onClick={() => handleSelectClient(client)}
                  >
                    <div className={styles.clientData}>
                      <div className={styles.clientName}>
                        {client.name || "SIN NOMBRE"}
                      </div>

                      <div className={styles.clientId}>
                        Tel: {client.phone || "SIN TELÉFONO"}
                      </div>

                      <div className={styles.clientEmail}>
                        {client.email || "SIN CORREO"}
                      </div>
                    </div>

                    <div className={styles.clientPoints}>
                      <strong>{formatPoints(client.points)}</strong>
                      <span>pts</span>
                    </div>
                  </button>
                ))
              ) : (
                <p className={styles.noClientsMessage}>
                  No hay clientes para mostrar.
                </p>
              )}
            </div>
          )}

          {selectedClient && (
            <div className={styles.rewardsSection}>
              <div className={styles.rewardsHeader}>
                <div>
                  <h3>
                    Recompensas disponibles
                    <span className={styles.rewardsCountBadge}>
                      {selectableRewardsCount}
                    </span>
                  </h3>

                  <p>
                    Selecciona una o varias recompensas. Las de producto gratis
                    abrirán el selector de producto; las de descuento abrirán
                    el buscador para agregar el producto con descuento.
                  </p>
                </div>

                <button
                  type="button"
                  className={styles.refreshRewardsButton}
                  onClick={loadRewards}
                  disabled={loadingRewards}
                >
                  {loadingRewards ? "..." : "Actualizar"}
                </button>
              </div>

              <div className={styles.pointsSummaryBox}>
                <div>
                  <span>Puntos actuales</span>
                  <strong>{formatPoints(clientPoints)}</strong>
                </div>

                <div>
                  <span>Puntos a usar</span>
                  <strong>{formatPoints(selectedRewardsTotalPoints)}</strong>
                </div>

                <div>
                  <span>Restantes</span>
                  <strong>{formatPoints(remainingPoints)}</strong>
                </div>

                <div>
                  <span>Seleccionadas</span>
                  <strong>{selectedRewardsCount}</strong>
                </div>
              </div>

              {loadingRewards ? (
                <div className={styles.noRewardsMessage}>
                  Cargando recompensas...
                </div>
              ) : activeRewards.length === 0 ? (
                <div className={styles.noRewardsMessage}>
                  No hay recompensas activas para mostrar.
                </div>
              ) : (
                <div className={styles.rewardsList}>
                  {activeRewards.map((reward) => {
                    const selectedQuantity = getSelectedRewardQuantity(
                      reward.id
                    );
                    const isSelected = selectedQuantity > 0;
                    const requiredPoints = Number(reward.points_required || 0);
                    const canAddMore = requiredPoints <= remainingPoints;
                    const doesNotReach = !isSelected && !canAddMore;

                    return (
                      <div
                        key={reward.id}
                        className={`${styles.rewardItem} ${
                          isSelected ? styles.rewardItemSelected : ""
                        } ${doesNotReach ? styles.rewardItemDisabled : ""}`}
                      >
                        <button
                          type="button"
                          className={styles.rewardMainButton}
                          onClick={() => handleAddReward(reward)}
                          disabled={doesNotReach}
                        >
                          <div className={styles.rewardInfo}>
                            <div className={styles.rewardTitleRow}>
                              <strong>{reward.name || "SIN NOMBRE"}</strong>

                              {isSelected && (
                                <span className={styles.selectedBadge}>
                                  {selectedQuantity} seleccionado
                                  {selectedQuantity !== 1 ? "s" : ""}
                                </span>
                              )}

                              {doesNotReach && (
                                <span className={styles.notEnoughBadge}>
                                  No alcanza
                                </span>
                              )}
                            </div>

                            <span>{getRewardBenefitLabel(reward)}</span>
                            <small>{getRewardTypeLabel(reward)}</small>
                          </div>

                          <div className={styles.rewardPoints}>
                            <strong>{requiredPoints}</strong>
                            <span>pts</span>
                          </div>
                        </button>

                        {isSelected && (
                          <div className={styles.rewardQuantityControls}>
                            <button
                              type="button"
                              className={styles.quantityButton}
                              onClick={() => handleSubtractReward(reward.id)}
                            >
                              -
                            </button>

                            <strong>{selectedQuantity}</strong>

                            <button
                              type="button"
                              className={styles.quantityButton}
                              onClick={() => handleAddReward(reward)}
                              disabled={!canAddMore}
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedRewards.length > 0 && (
                <div className={styles.selectedRewardBox}>
                  <span>Recompensas seleccionadas</span>

                  <div className={styles.selectedRewardsList}>
                    {selectedRewards.map((reward) => {
                      const redeemQuantity = Math.max(
                        Number(reward.redeemQuantity || 1),
                        1
                      );

                      return (
                        <div
                          key={reward.id}
                          className={styles.selectedRewardItem}
                        >
                          <div>
                            <strong>
                              {reward.name || "SIN NOMBRE"} x{redeemQuantity}
                            </strong>
                            <small>
                              {getRewardTypeLabel(reward)} · {getRewardBenefitLabel(reward)}
                            </small>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveSelectedReward(reward.id)
                            }
                          >
                            Quitar
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <small>
                    Los puntos se descontarán al finalizar la venta. Si es una
                    recompensa de descuento, primero se aplicará a un producto
                    del carrito antes de cobrar.
                  </small>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.modalActions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={closeModal}
          >
            Esc - Cancelar
          </button>

          <div className={styles.rightActions}>
            {currentSaleClient && (
              <button
                type="button"
                className={styles.removeButton}
                onClick={handleRemoveClient}
              >
                Quitar cliente
              </button>
            )}

            <button
              type="button"
              className={styles.saveButton}
              onClick={handleAssign}
              disabled={!selectedClient}
            >
              {assignButtonLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientModal;