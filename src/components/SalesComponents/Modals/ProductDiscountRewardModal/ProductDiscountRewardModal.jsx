import React, { useEffect, useRef, memo, useMemo } from "react";
import styles from "./ProductDiscountRewardModal.module.css";
import AppModal from "../../../AppModal/AppModal";
import { 
  useProductDiscountReward, formatCurrency, getRewardDiscountLabel, 
  calculateRewardDiscount, toNumber, MIN_SEARCH_LENGTH 
} from "./useProductDiscountReward";

const ProductDiscountRewardModal = memo(({ isOpen, reward, branchId, cartProducts, onClose, onConfirm }) => {
  const searchInputRef = useRef(null);

  const {
    searchTerm, setSearchTerm, inventoryByProduct, loadingProducts, saving, setSaving, error, setError, appModal, closeAppModal, showAppWarning,
    rewardQuantity, rewardRedeemQuantity, totalUnitsToApply, selectedProductsCount, selectedProducts, filteredProducts,
    getInventoryStatus, handleAddProduct, handleSubtractProduct, productUsesInventory
  } = useProductDiscountReward({ isOpen, reward, branchId, cartProducts });

  const canConfirm = selectedProductsCount === totalUnitsToApply && selectedProducts.length > 0 && selectedProducts.every(i => i.discount.discountAmount > 0) && !saving && !loadingProducts;

  // ========================================================================
  // NUEVA LÓGICA: Ordenamiento Alfabético + Menor a Mayor en KG/G
  // ========================================================================
  const sortedFilteredProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      const nameA = (a.name || "").toUpperCase();
      const nameB = (b.name || "").toUpperCase();

      // Extrae matemáticamente el peso en Kilos (convierte gramos a kilos si es necesario)
      const extractWeightInKg = (name) => {
        let match = name.match(/(\d+(?:\.\d+)?)\s*KG\b/i);
        if (match) return parseFloat(match[1]);
        
        match = name.match(/(\d+(?:\.\d+)?)\s*(G|GR|GRS)\b/i);
        if (match) return parseFloat(match[1]) / 1000;
        
        return 0; // Si no trae peso, se asume 0
      };

      // Obtiene el nombre puro sin la parte del peso
      const getBaseName = (name) => {
        return name.replace(/(\d+(?:\.\d+)?)\s*(KG|G|GR|GRS)\b/i, '').trim();
      };

      const baseA = getBaseName(nameA);
      const baseB = getBaseName(nameB);

      // 1. Primero ordena alfabéticamente por el nombre base (ej. "NUPEC KITTEN")
      const nameComparison = baseA.localeCompare(baseB, 'es');
      if (nameComparison !== 0) return nameComparison;

      // 2. Si son el mismo producto, ordena por peso (de menor a mayor)
      return extractWeightInKg(nameA) - extractWeightInKg(nameB);
    });
  }, [filteredProducts]);
  // ========================================================================

  const handleConfirm = async () => {
    if (!canConfirm) return;
    const selections = [];

    for (const item of selectedProducts) {
      const { product, quantity, discount } = item;
      if (!getInventoryStatus(product).available) return showAppWarning("Un producto ya no está disponible.");
      if (discount.discountAmount <= 0) return showAppWarning("Descuento inválido.");

      const invRow = inventoryByProduct[product.id];
      selections.push({
        reward,
        product: { ...product, sale_price: discount.price, cost_price: invRow?.cost_price ?? toNumber(product.cost_price), tracks_inventory: productUsesInventory(product) },
        quantity, originalUnitPrice: discount.price, discountAmount: discount.discountAmount, finalUnitPrice: discount.finalPrice, discountType: reward?.discount_type || null, discountValue: toNumber(reward?.discount_value),
        totalPoints: toNumber(reward?.points_required) * Math.max(quantity / Math.max(rewardQuantity, 1), 1),
      });
    }

    try {
      setSaving(true);
      await onConfirm?.({ reward, selections, quantity: totalUnitsToApply, totalPoints: toNumber(reward?.points_required) * Math.max(rewardRedeemQuantity, 1) });
    } finally { setSaving(false); }
  };

  useEffect(() => { if (isOpen) setTimeout(() => searchInputRef.current?.focus(), 80); }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (appModal.isOpen) return;
      if (e.key === "Escape" && !saving) { e.preventDefault(); e.stopPropagation(); onClose?.(); }
      if (e.key === "Enter" && canConfirm) { e.preventDefault(); e.stopPropagation(); handleConfirm(); }
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, saving, canConfirm, appModal.isOpen, onClose, handleConfirm]);

  if (!isOpen || !reward) return null;

  return (
    <div className={styles.overlay} onClick={(e) => !saving && !appModal.isOpen && e.target === e.currentTarget && onClose?.()}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div><h2>Aplicar descuento</h2><p>Selecciona los productos a los que se les aplicará la recompensa.</p></div>
          <button type="button" className={styles.closeButton} onClick={onClose} disabled={saving || appModal.isOpen}>×</button>
        </div>

        <div className={styles.body}>
          <section className={styles.rewardBox}>
            <div>
              <span>Recompensa seleccionada</span><strong>{reward.name || "RECOMPENSA"}</strong>
              <p>{getRewardDiscountLabel(reward)} en {totalUnitsToApply} producto{totalUnitsToApply !== 1 ? "s" : ""}. Seleccionados: {selectedProductsCount} de {totalUnitsToApply}.</p>
            </div>
            <div className={styles.pointsBox}><strong>{toNumber(reward.points_required) * rewardRedeemQuantity}</strong><span>PTS</span></div>
          </section>

          <section className={styles.searchBox}>
            <label>Buscar producto</label>
            <div className={styles.searchRow}>
              <input ref={searchInputRef} type="text" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setError(""); }} disabled={saving || appModal.isOpen} placeholder="Buscar por nombre, código o precio..." />
              {searchTerm && <button type="button" onClick={() => { setSearchTerm(""); setError(""); searchInputRef.current?.focus(); }} disabled={saving || appModal.isOpen}>Limpiar</button>}
            </div>
            <p>Escribe mínimo {MIN_SEARCH_LENGTH} caracteres para buscar productos.</p>
          </section>

          {error && <div className={styles.errorMessage}>{error}</div>}

          {loadingProducts ? <div className={styles.emptyMessage}>Cargando productos...</div> 
            : searchTerm.trim().length > 0 && searchTerm.trim().length < MIN_SEARCH_LENGTH ? <div className={styles.emptyMessage}>Escribe al menos {MIN_SEARCH_LENGTH} caracteres.</div>
            : searchTerm.trim().length >= MIN_SEARCH_LENGTH && filteredProducts.length === 0 ? <div className={styles.emptyMessage}>No hay productos disponibles.</div> 
            : filteredProducts.length > 0 && (
              <div className={styles.productList}>
                {/* AHORA ITERAMOS SOBRE LA LISTA ORDENADA */}
                {sortedFilteredProducts.map((p) => {
                  const status = getInventoryStatus(p);
                  const discount = calculateRewardDiscount(p, reward, inventoryByProduct);
                  
                  const selectedItem = selectedProducts.find(item => item.product.id === p.id);
                  const selectedQty = selectedItem ? selectedItem.quantity : 0;
                  
                  const canAdd = status.available && !saving && selectedProductsCount < totalUnitsToApply && (status.stock === null || selectedQty < status.stock);

                  return (
                    <div key={p.id} className={`${styles.productOption} ${selectedQty > 0 ? styles.productOptionSelected : ""}`} onClick={() => canAdd && handleAddProduct(p)}>
                      <div className={styles.productInfo}>
                        <strong>{p.name || "SIN NOMBRE"}</strong><span>{p.barcode || "SIN CÓDIGO"}</span><small>{status.label}</small>
                      </div>
                      <div className={styles.productAmounts}>
                        <div><span>Precio</span><strong>{formatCurrency(discount.price)}</strong></div>
                        <div className={styles.discountAmount}><span>Desc.</span><strong>-{formatCurrency(discount.discountAmount)}</strong></div>
                        <div className={styles.finalAmount}><span>Final</span><strong>{formatCurrency(discount.finalPrice)}</strong></div>
                        <div className={styles.quantityControls}>
                          <button type="button" onClick={(e) => { e.stopPropagation(); handleSubtractProduct(p); }} disabled={selectedQty <= 0 || saving || appModal.isOpen}>-</button>
                          <strong>{selectedQty}</strong>
                          <button type="button" onClick={(e) => { e.stopPropagation(); handleAddProduct(p); }} disabled={!canAdd || appModal.isOpen}>+</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
          )}

          {selectedProducts.length > 0 && (
            <section className={styles.selectedBox}>
              <div><span>Productos seleccionados</span><strong>{selectedProductsCount} de {totalUnitsToApply}</strong></div>
              <div className={styles.selectedTotals}>
                {selectedProducts.map(({ product, quantity, discount }) => (
                  <div key={product.id}><span>{product.name || "SIN NOMBRE"} x{quantity}</span><strong>{formatCurrency(discount.finalPrice)}</strong></div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelButton} onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="button" className={styles.confirmButton} onClick={handleConfirm} disabled={!canConfirm || appModal.isOpen}>{saving ? "Aplicando..." : "Agregar descuentos"}</button>
        </div>
      </div>
      <AppModal isOpen={appModal.isOpen} type={appModal.type} title={appModal.title} message={appModal.message} confirmText={appModal.confirmText} onClose={closeAppModal} onConfirm={closeAppModal} />
    </div>
  );
});

export default ProductDiscountRewardModal;