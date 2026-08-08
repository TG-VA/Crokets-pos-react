import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../../../../contexts/AuthContext";
import { useBranch } from "../../../../contexts/BranchContext";
import { executePartialReturnTransaction, formatCurrency } from "../../services/returnsService";

// Re-exportamos para que el JSX lo pueda seguir usando
export { formatCurrency };

const isRewardLine = (i = {}) => Boolean(i.isRewardItem || i.is_reward_item || i.rewardItem || i.reward_item || i.isRewardDiscountItem || i.is_reward_discount_item || i.rewardDiscountItem || i.reward_discount_item || i.saleRewardRedemptionId || i.sale_reward_redemption_id || i.rewardId || i.reward_id);
const isRewardDiscountLine = (i = {}) => Boolean(i.isRewardDiscountItem || i.is_reward_discount_item || i.rewardDiscountItem || i.reward_discount_item);

export const usePartialReturn = ({ isOpen, onClose, selectedTicket, paymentMethods, onReturnCreated }) => {
  const { user } = useAuth();
  const { branch } = useBranch();

  const [items, setItems] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [returnReason, setReturnReason] = useState("");
  const [refundMethodId, setRefundMethodId] = useState("");
  const [processing, setProcessing] = useState(false);
  const [appModal, setAppModal] = useState({ isOpen: false, type: "warning", title: "Aviso", message: "", confirmText: "Entendido", cancelText: "Cancelar", showCancel: false, onConfirm: null, onCancel: null });

  const closeAppModal = useCallback(() => setAppModal(prev => ({ ...prev, isOpen: false, showCancel: false, onConfirm: null, onCancel: null })), []);
  const showAppAlert = useCallback((cfg) => setAppModal({ isOpen: true, type: cfg.type || "warning", title: cfg.title || "Aviso", message: String(cfg.message || ""), confirmText: cfg.confirmText || "Entendido", cancelText: "Cancelar", showCancel: false, onConfirm: closeAppModal, onCancel: closeAppModal }), [closeAppModal]);
  const showAppWarning = useCallback((m, t = "Aviso") => showAppAlert({ type: "warning", title: t, message: m }), [showAppAlert]);
  const showAppDanger = useCallback((m, t = "Error") => showAppAlert({ type: "danger", title: t, message: m }), [showAppAlert]);
  const showAppConfirm = useCallback((cfg) => setAppModal({ isOpen: true, type: cfg.type || "warning", title: cfg.title || "Confirmar acción", message: String(cfg.message || ""), confirmText: cfg.confirmText || "Confirmar", cancelText: cfg.cancelText || "Cancelar", showCancel: true, onConfirm: async () => { closeAppModal(); if (cfg.onConfirm) await cfg.onConfirm(); }, onCancel: closeAppModal }), [closeAppModal]);

  useEffect(() => {
    if (!isOpen || !selectedTicket) {
      setItems([]); setQuantities({}); setReturnReason(""); setRefundMethodId(""); setProcessing(false); closeAppModal(); return;
    }

    const mappedItems = (selectedTicket.items || []).map(item => {
      const returnedQty = (selectedTicket.returns || []).reduce((acc, ret) => acc + (ret.items || []).filter(ri => ri.saleDetailId === item.id).reduce((sum, ri) => sum + Number(ri.quantity || 0), 0), 0);
      return {
        saleDetailId: item.id, productId: item.productId || null, description: item.description, soldQty: Number(item.cant || 0), returnedQty, availableQty: Math.max(Number(item.cant || 0) - returnedQty, 0), unitPrice: Number(item.finalUnitPrice || item.unitPrice || 0), isKit: !!(item.isKit || item.is_kit), isRewardItem: isRewardLine(item), isRewardDiscountItem: isRewardDiscountLine(item), components: item.components || []
      };
    });

    setItems(mappedItems);
    setQuantities(mappedItems.reduce((acc, item) => ({ ...acc, [item.saleDetailId]: "" }), {}));
    setReturnReason(""); setRefundMethodId(""); setProcessing(false);
  }, [isOpen, selectedTicket, closeAppModal]);

  const totalUnitsStillInSale = useMemo(() => items.reduce((acc, item) => acc + Number(item.availableQty || 0), 0), [items]);
  const maxUnitsAllowedInOperation = useMemo(() => Math.max(totalUnitsStillInSale - 1, 0), [totalUnitsStillInSale]);

  const itemsWithLimits = useMemo(() => items.map(item => {
    const isBlockedByReward = Boolean(item.isRewardItem);
    const maxReturnAllowed = isBlockedByReward ? 0 : Math.max(Math.min(Number(item.availableQty || 0), maxUnitsAllowedInOperation), 0);
    return { ...item, maxReturnAllowed, isBlockedByReward, isFullyReturned: Number(item.availableQty || 0) === 0, isBlockedByRule: !isBlockedByReward && Number(item.availableQty || 0) > 0 && maxReturnAllowed === 0 };
  }), [items, maxUnitsAllowedInOperation]);

  const summary = useMemo(() => {
    let selectedProducts = 0, totalUnitsToReturn = 0, totalRefund = 0;
    for (const item of itemsWithLimits) {
      const qty = Number(quantities[item.saleDetailId] || 0);
      if (qty > 0) { selectedProducts++; totalUnitsToReturn += qty; totalRefund += qty * Number(item.unitPrice || 0); }
    }
    return { selectedProducts, totalUnitsToReturn, totalUnitsAfterReturn: totalUnitsStillInSale - totalUnitsToReturn, totalRefund, refundMethodName: paymentMethods.find(m => m.id === refundMethodId)?.name || "" };
  }, [itemsWithLimits, quantities, totalUnitsStillInSale, paymentMethods, refundMethodId]);

  const setQty = useCallback((saleDetailId, nextValue, max) => {
    const numValue = Math.max(Math.min(Number(nextValue || 0), max), 0);
    setQuantities(prev => ({ ...prev, [saleDetailId]: numValue > 0 ? String(numValue) : "" }));
  }, []);

  const handleQtyChange = (saleDetailId, rawValue, max) => {
    const value = rawValue.replace(/[^\d]/g, "");
    if (value === "") return setQuantities(prev => ({ ...prev, [saleDetailId]: "" }));
    setQty(saleDetailId, Number(value), max);
  };

  const handleDecreaseQty = (id, max) => setQty(id, Number(quantities[id] || 0) - 1, max);
  const handleIncreaseQty = (id, max) => setQty(id, Number(quantities[id] || 0) + 1, max);

  const executePartialReturn = async () => {
    try {
      setProcessing(true);
      const selectedItems = itemsWithLimits.map(item => ({ sale_detail_id: item.saleDetailId, quantity: Number(quantities[item.saleDetailId] || 0), isKit: item.isKit, isRewardItem: item.isRewardItem, description: item.description })).filter(i => i.quantity > 0);

      // Usando la función exportada directamente del servicio
      const { pointsResult } = await executePartialReturnTransaction({
        selectedTicket, user, branch, returnReason, refundMethodId, selectedItems, totalRefund: summary.totalRefund
      });

      const msg = `Devolución parcial registrada correctamente.\n\nFolio: ${selectedTicket?.folio || "—"}\nTotal devuelto: ${formatCurrency(summary.totalRefund)}\nMétodo de devolución: ${summary.refundMethodName || "SIN SELECCIONAR"}${pointsResult?.registered ? `\nPuntos descontados: -${pointsResult.points}` : ""}`;
      
      if (typeof onReturnCreated === "function") await onReturnCreated();

      setAppModal({ isOpen: true, type: "success", title: "Devolución parcial", message: msg, confirmText: "Entendido", showCancel: false, onConfirm: () => { closeAppModal(); onClose(); }, onCancel: () => { closeAppModal(); onClose(); } });
    } catch (error) {
      showAppDanger(error.message || "No se pudo registrar.", "Error en devolución");
    } finally { setProcessing(false); }
  };

  const handleSave = async () => {
    if (!selectedTicket?.id || !user?.id || !branch?.id) return showAppWarning("Faltan datos requeridos.");
    if (!returnReason.trim()) return showAppWarning("Debes ingresar el motivo de devolución.", "Motivo requerido");
    if (!refundMethodId) return showAppWarning("Debes seleccionar el método de devolución.", "Método requerido");

    const selectedItems = itemsWithLimits.map(item => ({ quantity: Number(quantities[item.saleDetailId] || 0), isRewardItem: item.isRewardItem })).filter(i => i.quantity > 0);
    
    if (selectedItems.some(i => i.isRewardItem)) return showAppWarning("No se puede devolver parcialmente un producto de recompensa.", "Producto no devolvible");
    if (selectedItems.length === 0) return showAppWarning("Selecciona al menos un producto para devolución.", "Producto requerido");
    if (summary.totalUnitsAfterReturn < 1) return showAppWarning("Debe quedar al menos 1 unidad en la venta.", "Devolución bloqueada");

    showAppConfirm({
      type: "warning", title: "Confirmar devolución parcial", confirmText: "Sí, registrar", cancelText: "No, regresar",
      message: `¿Confirmas la devolución parcial por ${formatCurrency(summary.totalRefund)}?\n\nMétodo: ${summary.refundMethodName || "SIN SELECCIONAR"}`,
      onConfirm: executePartialReturn,
    });
  };

  return {
    itemsWithLimits, quantities, returnReason, setReturnReason, refundMethodId, setRefundMethodId,
    processing, summary, appModal, closeAppModal, handleQtyChange, handleDecreaseQty, handleIncreaseQty, handleSave
  };
};