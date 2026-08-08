import React, { useEffect, useMemo, memo } from "react";
import styles from "./RewardProductSelectionModal.module.css";
import AppModal from "../../../AppModal/AppModal";
import { useRewardProductSelection, INITIAL_VISIBLE_PRODUCTS } from "./useRewardProductSelection";

const RewardProductSelectionModal = memo(({ isOpen, onClose, onConfirm, rewards = [], branchId = null, cartProducts = [] }) => {
  const {
    rewardProducts, selectedProductsByReward, searchByReward, setSearchByReward, expandedRewards, setExpandedRewards,
    loadingProducts, saving, setSaving, error, appModal, closeAppModal, freeProductRewards, getInventoryStatus, 
    getSelectedQuantityForReward, getSelectedQuantityForProduct, getFilteredOptionsForReward, handleAddProduct, handleSubtractProduct, svc
  } = useRewardProductSelection({ isOpen, rewards, branchId, cartProducts });

  const totalRequiredProducts = useMemo(() => freeProductRewards.reduce((s, r) => s + svc.getRewardQuantity(r), 0), [freeProductRewards, svc]);
  const completedProducts = useMemo(() => freeProductRewards.reduce((s, r) => s + getSelectedQuantityForReward(r.id), 0), [freeProductRewards, getSelectedQuantityForReward]);
  const canConfirm = freeProductRewards.length > 0 && totalRequiredProducts > 0 && completedProducts === totalRequiredProducts && !loadingProducts && !saving;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    const selections = [];
    for (const reward of freeProductRewards) {
      const selectedMap = selectedProductsByReward[reward.id] || {};
      const options = rewardProducts.filter(r => r.reward_id === reward.id);
      Object.entries(selectedMap).forEach(([productId, quantity]) => {
        if (Number(quantity) > 0) {
          const opt = options.find(r => r.product?.id === productId);
          if (opt?.product) selections.push({ reward, product: opt.product, quantity: Number(quantity) });
        }
      });
    }
    try { setSaving(true); await onConfirm(selections); } 
    finally { setSaving(false); }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (appModal.isOpen) return;
      if (e.key === "Escape" && !saving) { e.preventDefault(); e.stopPropagation(); onClose(); }
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, saving, onClose, appModal.isOpen]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={saving || appModal.isOpen ? undefined : onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div><h2>Aplicar recompensas</h2><p>Selecciona cómo se repartirán los productos gratis.</p></div>
          <button type="button" className={styles.closeButton} onClick={onClose} disabled={saving || appModal.isOpen}>×</button>
        </div>

        <div className={styles.body}>
          <div className={styles.summaryBox}>
            <div><span>Productos a entregar</span><strong>{totalRequiredProducts}</strong></div>
            <div><span>Seleccionados</span><strong>{completedProducts}</strong></div>
          </div>

          {error && <div className={styles.errorMessage}>{error}</div>}

          {loadingProducts ? <div className={styles.emptyMessage}>Cargando productos aplicables...</div> : freeProductRewards.length === 0 ? <div className={styles.emptyMessage}>No hay recompensas de producto gratis para aplicar.</div> : (
            <div className={styles.rewardBlocks}>
              {freeProductRewards.map((reward) => {
                const options = rewardProducts.filter(r => r.reward_id === reward.id);
                const filteredOptions = getFilteredOptionsForReward(reward.id);
                const isExpanded = Boolean(expandedRewards[reward.id]);
                const search = String(searchByReward[reward.id] || "").trim();
                const visibleOptions = search || isExpanded ? filteredOptions : filteredOptions.slice(0, INITIAL_VISIBLE_PRODUCTS);
                const hasManyProducts = options.length > INITIAL_VISIBLE_PRODUCTS;
                
                const requiredQty = svc.getRewardQuantity(reward);
                const selectedQty = getSelectedQuantityForReward(reward.id);
                const remainingQty = Math.max(requiredQty - selectedQty, 0);

                return (
                  <section key={reward.id} className={styles.rewardBlock}>
                    <div className={styles.rewardHeader}>
                      <div>
                        <h3>{reward.name || "RECOMPENSA"}</h3>
                        <p>Selecciona {requiredQty} producto{requiredQty !== 1 ? "s" : ""} gratis. {svc.getRewardRedeemQuantity(reward) > 1 && ` ${svc.getRewardRedeemQuantity(reward)} canjes de ${svc.getRewardProductsPerRedemption(reward)} producto${svc.getRewardProductsPerRedemption(reward) !== 1 ? "s" : ""}.`}</p>
                        <div className={styles.rewardProgress}><span>{selectedQty} de {requiredQty} seleccionados</span><strong>{remainingQty} pendiente{remainingQty !== 1 ? "s" : ""}</strong></div>
                      </div>
                      <span>{Number(reward.points_required || 0) * svc.getRewardRedeemQuantity(reward)} pts</span>
                    </div>

                    {options.length === 0 ? <div className={styles.emptyRewardProducts}>Esta recompensa no tiene productos vinculados.</div> : (
                      <>
                        {hasManyProducts && (
                          <div className={styles.rewardSearchBox}>
                            <input type="text" value={search} onChange={e => { setSearchByReward(p => ({ ...p, [reward.id]: e.target.value })); setExpandedRewards(p => ({ ...p, [reward.id]: false })); }} disabled={saving} placeholder="Buscar producto dentro de esta recompensa..." />
                            {search && <button type="button" onClick={() => setSearchByReward(p => ({ ...p, [reward.id]: "" }))} disabled={saving}>Limpiar</button>}
                          </div>
                        )}

                        {filteredOptions.length === 0 ? <div className={styles.emptyRewardProducts}>No hay productos con esa búsqueda.</div> : (
                          <div className={styles.productList}>
                            {visibleOptions.map(({ product }) => {
                              const status = getInventoryStatus(product);
                              const qty = getSelectedQuantityForProduct(reward.id, product.id);
                              const isSelected = qty > 0;
                              const canAdd = status.available && !saving && selectedQty < requiredQty && (status.stock === null || qty < status.stock);

                              return (
                                <div key={`${reward.id}-${product.id}`} className={`${styles.productOption} ${isSelected ? styles.productOptionSelected : ""} ${!status.available ? styles.productOptionDisabled : ""}`} onClick={() => canAdd && handleAddProduct(reward, product)}>
                                  <div className={styles.productInfo}>
                                    <strong>{product.name || "SIN NOMBRE"}</strong><span>{product.barcode || "SIN CÓDIGO"}</span><small>{status.label}</small>
                                  </div>
                                  <div className={styles.productSide}>
                                    <div className={styles.productPrice}>
                                      <strong>${Number(product.sale_price || 0).toFixed(2)}</strong>
                                      {isSelected && <span>{qty} seleccionado{qty !== 1 ? "s" : ""}</span>}
                                      {!status.available && <span>No disponible</span>}
                                      {status.stock !== null && qty >= status.stock && status.available && <span>Máximo stock</span>}
                                    </div>
                                    <div className={styles.quantityControls}>
                                      <button type="button" onClick={(e) => { e.stopPropagation(); handleSubtractProduct(reward, product); }} disabled={!isSelected || saving}>-</button>
                                      <strong>{qty}</strong>
                                      <button type="button" onClick={(e) => { e.stopPropagation(); handleAddProduct(reward, product); }} disabled={!canAdd}>+</button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {hasManyProducts && !search && (
                          <button type="button" className={styles.showMoreButton} onClick={() => setExpandedRewards(p => ({ ...p, [reward.id]: !p[reward.id] }))} disabled={saving}>
                            {isExpanded ? "Ver menos productos" : `Ver ${options.length - INITIAL_VISIBLE_PRODUCTS} producto${options.length - INITIAL_VISIBLE_PRODUCTS !== 1 ? "s" : ""} más`}
                          </button>
                        )}
                      </>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelButton} onClick={onClose} disabled={saving || appModal.isOpen}>Cancelar</button>
          <button type="button" className={styles.confirmButton} onClick={handleConfirm} disabled={!canConfirm || appModal.isOpen}>{saving ? "Aplicando..." : "Aplicar recompensas"}</button>
        </div>
      </div>
      <AppModal isOpen={appModal.isOpen} type={appModal.type} title={appModal.title} message={appModal.message} confirmText={appModal.confirmText} onClose={closeAppModal} onConfirm={closeAppModal} />
    </div>
  );
});

export default RewardProductSelectionModal;