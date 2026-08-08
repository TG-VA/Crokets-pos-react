import React, { useEffect, useMemo, useRef, useState, memo, useCallback } from "react";
import styles from "./ClientModal.module.css";
import { supabase } from "../../../../lib/supabaseClient";
import AppModal from "../../../AppModal/AppModal";

import SearchIcon from "../../../../assets/icons/searchIcon.svg";
import XmarkIcon from "../../../../assets/icons/xmark-solid-full.svg";

// --- Funciones Puras Extraídas ---
const normalizeSearch = (value) => String(value || "").trim();
const formatPoints = (value) => Number(value || 0);
const normalizeRewardType = (type) => type === "product_discount" ? "product_discount" : "free_product";

const getRewardTypeLabel = (reward) => 
  normalizeRewardType(reward?.reward_type) === "product_discount" ? "Descuento en producto" : "Producto gratis";

const getRewardBenefitLabel = (reward) => {
  const type = normalizeRewardType(reward?.reward_type);
  const qty = Number(reward?.reward_quantity || 1);
  const discType = reward?.discount_type;
  const discVal = Number(reward?.discount_value || 0);
  const s = qty !== 1 ? "s" : "";
  const es = qty !== 1 ? "es" : "";

  if (type === "free_product") return `${qty} producto${s} gratis por canje`;
  if (type === "product_discount") {
    if (discType === "percent") return `${discVal}% en ${qty} unidad${es} por canje`;
    if (discType === "fixed") return `$${discVal.toFixed(2)} en ${qty} unidad${es} por canje`;
    return `Descuento en ${qty} unidad${es}`;
  }
  return "Beneficio no definido";
};

// --- Componente Principal ---
const ClientModal = memo(({ isOpen, onClose, onAssignClient, currentSaleClient = null }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(currentSaleClient);
  const [selectedRewards, setSelectedRewards] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [loadingRewards, setLoadingRewards] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const [appModal, setAppModal] = useState({ isOpen: false, type: "warning", title: "Aviso", message: "", confirmText: "Entendido" });

  const hasInitializedOpenRef = useRef(false);
  const lastInitializedClientIdRef = useRef(null);

  const closeAppModal = useCallback(() => setAppModal((prev) => ({ ...prev, isOpen: false })), []);
  const showAppModal = useCallback((config) => setAppModal({ isOpen: true, type: "warning", title: "Aviso", confirmText: "Entendido", ...config }), []);
  const showAppWarning = useCallback((message, title = "Aviso") => showAppModal({ type: "warning", title, message }), [showAppModal]);
  const showAppDanger = useCallback((message, title = "Error") => showAppModal({ type: "danger", title, message }), [showAppModal]);

  const loadCustomerPoints = async (customerIds = []) => {
    if (!customerIds.length) return {};
    const { data, error } = await supabase.from("customer_points").select("customer_id, points").in("customer_id", customerIds);
    if (error) throw error;
    return (data || []).reduce((acc, mov) => ({ ...acc, [mov.customer_id]: Number(acc[mov.customer_id] || 0) + Number(mov.points || 0) }), {});
  };

  const loadRewards = async () => {
    try {
      setLoadingRewards(true);
      const { data, error } = await supabase
        .from("rewards")
        .select(`id, name, description, points_required, is_active, reward_type, reward_quantity, discount_type, discount_value, reward_products (id, product_id)`)
        .eq("is_active", true)
        .order("points_required", { ascending: true })
        .order("name", { ascending: true });
      
      if (error) throw error;
      setRewards(data || []);
    } catch (err) {
      console.error("Error cargando recompensas:", err);
      setRewards([]);
      showAppDanger("No se pudieron cargar las recompensas disponibles.", "Error cargando recompensas");
    } finally {
      setLoadingRewards(false);
    }
  };

  const searchClients = async (term = searchTerm) => {
    const cleanSearch = normalizeSearch(term);
    try {
      setLoadingClients(true);
      if (cleanSearch.length < 2) return setClients(currentSaleClient ? [currentSaleClient] : []);

      const { data, error } = await supabase
        .from("customers")
        .select("id, name, phone, email, status, is_points_customer")
        .eq("is_points_customer", true)
        .neq("status", false)
        .or(`name.ilike.%${cleanSearch}%,phone.ilike.%${cleanSearch}%,email.ilike.%${cleanSearch}%`)
        .order("name", { ascending: true })
        .limit(12);

      if (error) throw error;

      const customers = data || [];
      const pointsByCustomer = await loadCustomerPoints(customers.map((c) => c.id));
      const customersWithPoints = customers.map((c) => ({ ...c, points: formatPoints(pointsByCustomer[c.id]) }));

      if (currentSaleClient?.id && !customersWithPoints.some((c) => c.id === currentSaleClient.id)) {
        setClients([{ ...currentSaleClient, points: formatPoints(currentSaleClient.points) }, ...customersWithPoints]);
      } else {
        setClients(customersWithPoints);
      }
    } catch (err) {
      console.error("Error buscando clientes:", err);
      setClients(currentSaleClient ? [currentSaleClient] : []);
      showAppDanger("No se pudieron cargar los clientes.", "Error buscando clientes");
    } finally {
      setLoadingClients(false);
    }
  };

  const closeModal = useCallback(() => {
    setSearchTerm("");
    setClients(currentSaleClient ? [currentSaleClient] : []);
    setSelectedClient(currentSaleClient);
    setSelectedRewards([]);
    setLoadingClients(false);
    closeAppModal();
    onClose();
  }, [currentSaleClient, closeAppModal, onClose]);

  const handleAssign = useCallback(() => {
    if (!selectedClient) return showAppWarning("Selecciona un cliente para asignarlo a la venta.");
    onAssignClient?.(selectedClient, selectedRewards);
    closeModal();
  }, [selectedClient, selectedRewards, onAssignClient, showAppWarning, closeModal]);

  const handleRemoveClient = useCallback(() => {
    setSelectedClient(null);
    setSelectedRewards([]);
    onAssignClient?.(null, []);
    closeModal();
  }, [onAssignClient, closeModal]);

  useEffect(() => {
    if (!isOpen) {
      hasInitializedOpenRef.current = false;
      lastInitializedClientIdRef.current = null;
      return;
    }
    const currentClientId = currentSaleClient?.id || null;
    if (!hasInitializedOpenRef.current || lastInitializedClientIdRef.current !== currentClientId) {
      hasInitializedOpenRef.current = true;
      lastInitializedClientIdRef.current = currentClientId;
      setSelectedClient(currentSaleClient);
      setSelectedRewards([]);
      setSearchTerm("");
      setClients(currentSaleClient ? [currentSaleClient] : []);
      setLoadingClients(false);
      closeAppModal();
      loadRewards();
    }
  }, [isOpen, currentSaleClient, closeAppModal]);

  useEffect(() => {
    if (!isOpen) return;
    const cleanSearch = normalizeSearch(searchTerm);
    if (cleanSearch.length < 2) {
      setClients(currentSaleClient ? [currentSaleClient] : []);
      setLoadingClients(false);
      return;
    }
    const timeoutId = setTimeout(() => searchClients(cleanSearch), 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event) => {
      if (appModal.isOpen) return;
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeModal(); }
      if (event.key === "Enter" && selectedClient) { event.preventDefault(); event.stopPropagation(); handleAssign(); }
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, selectedClient, appModal.isOpen, closeModal, handleAssign]);

  const clientPoints = Number(selectedClient?.points || 0);
  const activeRewards = useMemo(() => (!selectedClient?.id ? [] : rewards.filter(r => r.is_active !== false && Number(r.points_required || 0) > 0)), [rewards, selectedClient]);
  const selectedRewardsTotalPoints = selectedRewards.reduce((sum, r) => sum + (Number(r.points_required || 0) * Math.max(Number(r.redeemQuantity || 1), 1)), 0);
  const remainingPoints = Math.max(clientPoints - selectedRewardsTotalPoints, 0);
  const selectedRewardsCount = selectedRewards.reduce((sum, r) => sum + Math.max(Number(r.redeemQuantity || 1), 1), 0);
  const selectableRewardsCount = !selectedClient?.id ? 0 : activeRewards.filter(r => Number(r.points_required || 0) <= remainingPoints).length;
  const visibleClients = !selectedClient?.id ? clients : clients.filter(c => c.id !== selectedClient.id);
  const selectedClientLabel = selectedClient ? (selectedClient.name || selectedClient.phone || "CLIENTE SIN NOMBRE") : "";
  const assignButtonLabel = selectedRewardsCount === 0 ? "Asignar cliente" : (selectedRewardsCount === 1 ? "Asignar cliente y recompensa" : "Asignar cliente y recompensas");

  const handleSelectClient = (client) => { setSelectedClient(client); setSelectedRewards([]); };
  
  const handleAddReward = (reward) => {
    if (!reward?.id) return;
    const requiredPoints = Number(reward.points_required || 0);
    if (requiredPoints > remainingPoints) {
      return showAppWarning(`El cliente no tiene puntos suficientes para esta recompensa.\n\nPuntos restantes: ${formatPoints(remainingPoints)}\nPuntos requeridos: ${formatPoints(requiredPoints)}`, "Puntos insuficientes");
    }
    setSelectedRewards(prev => prev.some(r => r.id === reward.id) 
      ? prev.map(r => r.id === reward.id ? { ...r, redeemQuantity: Math.max(Number(r.redeemQuantity || 1) + 1, 1) } : r)
      : [...prev, { ...reward, redeemQuantity: 1 }]);
  };

  const handleSubtractReward = (rewardId) => {
    setSelectedRewards(prev => prev.map(r => r.id === rewardId ? { ...r, redeemQuantity: Math.max(Number(r.redeemQuantity || 1) - 1, 0) } : r).filter(r => Number(r.redeemQuantity || 0) > 0));
  };

  const handleRemoveSelectedReward = (rewardId) => setSelectedRewards(prev => prev.filter(r => r.id !== rewardId));

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={closeModal}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div><h2>Asignar cliente</h2><p>Busca un cliente registrado para asociarlo a la venta.</p></div>
          <button type="button" className={styles.closeButton} onClick={closeModal} aria-label="Cerrar modal">
            <img src={XmarkIcon} alt="" className={styles.closeIcon} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.searchBarContainer}>
            <label>Buscar cliente</label>
            <div className={styles.searchRow}>
              <div className={styles.searchInputContainer}>
                <img src={SearchIcon} alt="" className={styles.searchIcon} aria-hidden="true" />
                <input type="text" className={styles.clientSearchBar} placeholder={selectedClient ? "Buscar otro cliente..." : "Nombre, teléfono o correo..."} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} autoFocus />
                {searchTerm && (
                  <button type="button" className={styles.clearSearchButton} onClick={() => { setSearchTerm(""); setClients(currentSaleClient ? [currentSaleClient] : []); setSelectedClient(currentSaleClient); setSelectedRewards([]); setLoadingClients(false); closeAppModal(); }} aria-label="Limpiar búsqueda">
                    <img src={XmarkIcon} alt="" className={styles.clearSearchIcon} aria-hidden="true" />
                  </button>
                )}
              </div>
              <button type="button" className={styles.searchButton} onClick={() => normalizeSearch(searchTerm).length < 2 ? showAppWarning("Escribe mínimo 2 caracteres para buscar un cliente.") : searchClients(searchTerm)} disabled={loadingClients}>
                {loadingClients ? "Buscando..." : "Buscar"}
              </button>
            </div>
            <span className={styles.searchHelp}>Escribe mínimo 2 caracteres para buscar.</span>
          </div>

          {selectedClient && (
            <div className={styles.selectedClientBox}>
              <div><span>Cliente seleccionado</span><strong>{selectedClientLabel}</strong></div>
              <div className={styles.selectedClientPoints}><strong>{formatPoints(clientPoints)}</strong><span>pts</span></div>
            </div>
          )}

          {(!selectedClient || visibleClients.length > 0 || loadingClients) && (
            <div className={styles.clientList}>
              {loadingClients ? <p className={styles.noClientsMessage}>Buscando clientes...</p> : visibleClients.length > 0 ? (
                visibleClients.map((client) => (
                  <button type="button" key={client.id} className={`${styles.clientItem} ${selectedClient?.id === client.id ? styles.clientItemSelected : ""}`} onClick={() => handleSelectClient(client)}>
                    <div className={styles.clientData}>
                      <div className={styles.clientName}>{client.name || "SIN NOMBRE"}</div>
                      <div className={styles.clientId}>Tel: {client.phone || "SIN TELÉFONO"}</div>
                      <div className={styles.clientEmail}>{client.email || "SIN CORREO"}</div>
                    </div>
                    <div className={styles.clientPoints}><strong>{formatPoints(client.points)}</strong><span>pts</span></div>
                  </button>
                ))
              ) : <p className={styles.noClientsMessage}>No hay clientes para mostrar.</p>}
            </div>
          )}

          {selectedClient && (
            <div className={styles.rewardsSection}>
              <div className={styles.rewardsHeader}>
                <div>
                  <h3>Recompensas disponibles <span className={styles.rewardsCountBadge}>{selectableRewardsCount}</span></h3>
                  <p>Selecciona una o varias recompensas. Las de producto gratis abrirán el selector de producto; las de descuento abrirán el buscador para agregar el producto con descuento.</p>
                </div>
                <button type="button" className={styles.refreshRewardsButton} onClick={loadRewards} disabled={loadingRewards}>{loadingRewards ? "..." : "Actualizar"}</button>
              </div>

              <div className={styles.pointsSummaryBox}>
                <div><span>Puntos actuales</span><strong>{formatPoints(clientPoints)}</strong></div>
                <div><span>Puntos a usar</span><strong>{formatPoints(selectedRewardsTotalPoints)}</strong></div>
                <div><span>Restantes</span><strong>{formatPoints(remainingPoints)}</strong></div>
                <div><span>Seleccionadas</span><strong>{selectedRewardsCount}</strong></div>
              </div>

              {loadingRewards ? <div className={styles.noRewardsMessage}>Cargando recompensas...</div> : activeRewards.length === 0 ? (
                <div className={styles.noRewardsMessage}>No hay recompensas activas para mostrar.</div>
              ) : (
                <div className={styles.rewardsList}>
                  {activeRewards.map((reward) => {
                    const selectedQuantity = Number(selectedRewards.find(r => r.id === reward.id)?.redeemQuantity || 0);
                    const isSelected = selectedQuantity > 0;
                    const requiredPoints = Number(reward.points_required || 0);
                    const canAddMore = requiredPoints <= remainingPoints;
                    const doesNotReach = !isSelected && !canAddMore;

                    return (
                      <div key={reward.id} className={`${styles.rewardItem} ${isSelected ? styles.rewardItemSelected : ""} ${doesNotReach ? styles.rewardItemDisabled : ""}`}>
                        <button type="button" className={styles.rewardMainButton} onClick={() => handleAddReward(reward)} disabled={doesNotReach}>
                          <div className={styles.rewardInfo}>
                            <div className={styles.rewardTitleRow}>
                              <strong>{reward.name || "SIN NOMBRE"}</strong>
                              {isSelected && <span className={styles.selectedBadge}>{selectedQuantity} seleccionado{selectedQuantity !== 1 ? "s" : ""}</span>}
                              {doesNotReach && <span className={styles.notEnoughBadge}>No alcanza</span>}
                            </div>
                            <span>{getRewardBenefitLabel(reward)}</span>
                            <small>{getRewardTypeLabel(reward)}</small>
                          </div>
                          <div className={styles.rewardPoints}><strong>{requiredPoints}</strong><span>pts</span></div>
                        </button>

                        {isSelected && (
                          <div className={styles.rewardQuantityControls}>
                            <button type="button" className={styles.quantityButton} onClick={() => handleSubtractReward(reward.id)}>-</button>
                            <strong>{selectedQuantity}</strong>
                            <button type="button" className={styles.quantityButton} onClick={() => handleAddReward(reward)} disabled={!canAddMore}>+</button>
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
                    {selectedRewards.map((reward) => (
                      <div key={reward.id} className={styles.selectedRewardItem}>
                        <div>
                          <strong>{reward.name || "SIN NOMBRE"} x{Math.max(Number(reward.redeemQuantity || 1), 1)}</strong>
                          <small>{getRewardTypeLabel(reward)} · {getRewardBenefitLabel(reward)}</small>
                        </div>
                        <button type="button" onClick={() => handleRemoveSelectedReward(reward.id)}>Quitar</button>
                      </div>
                    ))}
                  </div>
                  <small>Los puntos se descontarán al finalizar la venta. Si es una recompensa de descuento, primero se aplicará a un producto del carrito antes de cobrar.</small>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.modalActions}>
          <button type="button" className={styles.cancelButton} onClick={closeModal}>Esc - Cancelar</button>
          <div className={styles.rightActions}>
            {currentSaleClient && <button type="button" className={styles.removeButton} onClick={handleRemoveClient}>Quitar cliente</button>}
            <button type="button" className={styles.saveButton} onClick={handleAssign} disabled={!selectedClient}>{assignButtonLabel}</button>
          </div>
        </div>
      </div>

      <AppModal isOpen={appModal.isOpen} type={appModal.type} title={appModal.title} message={appModal.message} confirmText={appModal.confirmText} onClose={closeAppModal} onConfirm={closeAppModal} />
    </div>
  );
});

export default ClientModal;