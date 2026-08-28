import React, { memo } from "react";
import styles from "./PartialReturnModal.module.css";
import AppModal from "../../../AppModal/AppModal";
import ChangeIcon from "../../../../assets/icons/changeIcon.svg";
import XmarkIcon from "../../../../assets/icons/xmark-solid-full.svg";
import { usePartialReturn, formatCurrency } from "./usePartialReturn";
import { useEscapeKey } from "../../../../hooks/useEscapeKey";

const PartialReturnModal = memo(({ isOpen, onClose, selectedTicket, paymentMethods = [], onReturnCreated }) => {
  const {
    itemsWithLimits, quantities, returnReason, setReturnReason, refundMethodId, setRefundMethodId,
    processing, summary, appModal, closeAppModal, handleQtyChange, handleDecreaseQty, handleIncreaseQty, handleSave
  } = usePartialReturn({ isOpen, onClose, selectedTicket, paymentMethods, onReturnCreated });

  useEscapeKey((e) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent?.stopImmediatePropagation?.();
    e.stopImmediatePropagation?.();
    if (appModal.isOpen) {
      closeAppModal();
    } else if (!processing) {
      onClose();
    }
  }, isOpen);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); } }}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}><span className={styles.titleContent}><img src={ChangeIcon} alt="" className={styles.titleIcon} aria-hidden="true" /> DEVOLUCIÓN PARCIAL</span></h2>
            <div className={styles.headerMeta}>Folio: <strong>{selectedTicket?.folio || "—"}</strong></div>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} disabled={processing} aria-label="Cerrar modal"><img src={XmarkIcon} alt="" className={styles.closeIcon} aria-hidden="true" /></button>
        </div>

        <div className={styles.content}>
          <div className={styles.saleInfo}>
            <div><span>Cliente</span><strong>{selectedTicket?.client || "PÚBLICO EN GENERAL"}</strong></div>
            <div><span>Total original</span><strong>{formatCurrency(selectedTicket?.total || 0)}</strong></div>
            <div><span>Devuelto acumulado</span><strong>{formatCurrency(selectedTicket?.totalReturned || 0)}</strong></div>
            <div><span>Neto actual</span><strong>{formatCurrency(selectedTicket?.netTotal ?? selectedTicket?.total ?? 0)}</strong></div>
          </div>

          <div className={styles.ruleBox}><strong>Regla de devolución:</strong> puedes devolver productos o kits completos, pero debe quedar al menos 1 unidad en el ticket. Si deseas devolver todo, cancela la venta completa. Los productos de recompensa no se devuelven por parcial.</div>

          {itemsWithLimits.some(i => i.isKit) && <div className={styles.warningBox}>Esta venta contiene kits. Si devuelves un kit, se regresará el inventario de todos sus productos internos.</div>}
          {itemsWithLimits.some(i => i.isRewardItem) && <div className={styles.warningBox}>Esta venta contiene productos de recompensa. Para revertir un canje, cancela la venta completa.</div>}

          <div className={styles.section}>
            <div className={styles.sectionTitle}>PRODUCTOS DISPONIBLES PARA DEVOLUCIÓN</div>
            <div className={styles.productCards}>
              {itemsWithLimits.length === 0 ? <div className={styles.emptyCell}>No hay productos disponibles</div> : (
                itemsWithLimits.map((item) => {
                  const qty = Number(quantities[item.saleDetailId] || 0);
                  const disabled = processing || item.isFullyReturned || item.isBlockedByRule || item.isBlockedByReward;

                  return (
                    <div key={item.saleDetailId} className={`${styles.productCard} ${disabled ? styles.productCardDisabled : ""}`}>
                      <div className={styles.productCardHeader}>
                        <div>
                          <div className={styles.productName}>{item.description} {item.isKit ? " (KIT)" : ""}</div>
                          <div className={styles.productMeta}>P.U. {formatCurrency(item.unitPrice)}</div>
                        </div>
                        <div className={styles.productAmount}>{formatCurrency(qty * item.unitPrice)}</div>
                      </div>

                      <div className={styles.productStats}>
                        <div><span>Vendida</span><strong>{item.soldQty}</strong></div>
                        <div><span>Ya devuelta</span><strong>{item.returnedQty}</strong></div>
                        <div><span>Aún en venta</span><strong>{item.availableQty}</strong></div>
                        <div><span>Máximo ahora</span><strong>{item.maxReturnAllowed}</strong></div>
                      </div>

                      {item.components?.length > 0 && (
                        <div className={styles.kitComponents}>
                          <strong>Incluye:</strong>
                          {item.components.map(c => <span key={c.productId || c.description}>{c.description || c.name} x{c.quantity}</span>)}
                        </div>
                      )}

                      <div className={styles.productCardFooter}>
                        <div className={styles.itemStatusRow}>
                          {item.isRewardItem ? <span className={styles.fullyReturnedBadge}>NO SE PUEDE DEVOLVER POR PARCIAL</span>
                          : item.isFullyReturned ? <span className={styles.fullyReturnedBadge}>DEVOLUCIÓN COMPLETA</span>
                          : item.isBlockedByRule ? <span className={styles.fullyReturnedBadge}>DEVOLUCIÓN BLOQUEADA</span>
                          : item.isKit ? <span className={styles.availableBadge}>Kit completo: puedes devolver hasta {item.maxReturnAllowed}</span>
                          : <span className={styles.availableBadge}>Puedes devolver hasta {item.maxReturnAllowed} pieza{item.maxReturnAllowed !== 1 ? "s" : ""}</span>}
                        </div>

                        <div className={styles.qtyStepper}>
                          <button type="button" className={styles.qtyButton} onClick={() => handleDecreaseQty(item.saleDetailId, item.maxReturnAllowed)} disabled={disabled || qty <= 0}>−</button>
                          <input type="text" inputMode="numeric" value={quantities[item.saleDetailId]} onChange={(e) => handleQtyChange(item.saleDetailId, e.target.value, item.maxReturnAllowed)} className={styles.qtyInput} disabled={disabled} placeholder={disabled ? "—" : "0"} />
                          <button type="button" className={styles.qtyButton} onClick={() => handleIncreaseQty(item.saleDetailId, item.maxReturnAllowed)} disabled={disabled || qty >= item.maxReturnAllowed}>+</button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Motivo de devolución</label>
              <input type="text" value={returnReason} onChange={(e) => setReturnReason(e.target.value)} className={styles.input} placeholder="Describe el motivo" disabled={processing} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Método de devolución</label>
              <select value={refundMethodId} onChange={(e) => setRefundMethodId(e.target.value)} className={styles.select} disabled={processing}>
                <option value="">Selecciona un método</option>
                {paymentMethods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
          {summary.totalUnitsAfterReturn < 1 && <div className={styles.warningBox}>Debe quedar al menos 1 unidad en la venta. Si deseas devolver todo, corresponde cancelar la venta.</div>}
        </div>

        <div className={styles.footer}>
          <div className={styles.footerSummary}>
            <div><span>Total a devolver</span><strong>{formatCurrency(summary.totalRefund)}</strong></div>
            <div><span>Método</span><strong>{summary.refundMethodName || "SIN SELECCIONAR"}</strong></div>
            <div><span>Unidades después</span><strong>{summary.totalUnitsAfterReturn}</strong></div>
          </div>
          <div className={styles.footerActions}>
            <button type="button" className={`${styles.actionButton} ${styles.secondaryButton}`} onClick={onClose} disabled={processing}>Cerrar</button>
            <button type="button" className={`${styles.actionButton} ${styles.primaryButton}`} onClick={handleSave} disabled={processing}>{processing ? "Procesando..." : "Guardar devolución"}</button>
          </div>
        </div>
      </div>
      <AppModal isOpen={appModal.isOpen} type={appModal.type} title={appModal.title} message={appModal.message} confirmText={appModal.confirmText} cancelText={appModal.cancelText} showCancel={appModal.showCancel} onConfirm={appModal.onConfirm || closeAppModal} onCancel={appModal.onCancel || closeAppModal} onClose={closeAppModal} />
    </div>
  );
});

export default PartialReturnModal;