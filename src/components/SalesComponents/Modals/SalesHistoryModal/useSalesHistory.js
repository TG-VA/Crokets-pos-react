import { useState, useEffect, useCallback } from "react";
import {
  formatTime, getDisplayFolio, getPaymentMethodLabel, getPaymentSummary, fetchPaymentMethods, fetchCashiers, 
  buildCustomerPointsMaps, loadRewardRedemptionsForSale, fetchTicketsBatch, fetchSalesRelatedData, 
  fetchTicketDetailsData, fetchProductsByIds, fetchSaleReturnsData, fetchCanceledSaleData,
  formatCurrency, executeCancelSaleTransaction
} from "../../services/salesHistoryService";

// IMPORTAMOS LAS UTILIDADES DE IMPRESIÓN AQUÍ
import { printTicket } from "../../../../utils/ticketPrinter";
import { buildTicketText } from "../../../../utils/ticketBuilder";

export const useSalesHistory = ({ isOpen, branchId, user, branch, onSaleCancelled }) => {
  const [searchFolio, setSearchFolio] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [dateFilter, setDateFilter] = useState(() => new Date().toISOString().split("T")[0]);
  const [cashierFilter, setCashierFilter] = useState("all");
  const [tickets, setTickets] = useState([]);
  const [cashiers, setCashiers] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [cancelProcessing, setCancelProcessing] = useState(false);
  const [printProcessing, setPrintProcessing] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [refundMethodId, setRefundMethodId] = useState("");
  const [returnHistory, setReturnHistory] = useState([]);
  const [totalReturned, setTotalReturned] = useState(0);
  const [appModal, setAppModal] = useState({ isOpen: false, type: "info", title: "", message: "", confirmText: "Aceptar", showCancel: false });
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [isPartialReturnOpen, setIsPartialReturnOpen] = useState(false);

  const closeAppModal = useCallback(() => setAppModal(p => ({ ...p, isOpen: false })), []);
  const showAppAlert = useCallback((c) => setAppModal({ isOpen: true, type: c.type || "info", title: c.title || "Aviso", message: c.message, confirmText: c.confirmText || "Aceptar", showCancel: false, onConfirm: closeAppModal, onCancel: closeAppModal }), [closeAppModal]);
  const showAppConfirm = useCallback((c) => setAppModal({ isOpen: true, type: c.type || "warning", title: c.title || "Confirmar", message: c.message, confirmText: c.confirmText || "Confirmar", cancelText: c.cancelText || "Cancelar", showCancel: true, onConfirm: async () => { closeAppModal(); if (c.onConfirm) await c.onConfirm(); }, onCancel: closeAppModal }), [closeAppModal]);

  // Esta función vive aquí porque usa el estado de paymentMethods
  const getPaymentMethodNameById = useCallback((id) => paymentMethods.find(m => m.id === id)?.name?.toUpperCase() || "", [paymentMethods]);

  const loadBaseData = useCallback(async () => {
    try {
      const [methods, users] = await Promise.all([fetchPaymentMethods(), fetchCashiers()]);
      setPaymentMethods(methods); setCashiers(users);
    } catch (e) { console.error(e); }
  }, []);

  const loadTickets = useCallback(async () => {
    if (!branchId || !isOpen) return;
    try {
      setLoadingTickets(true);
      const start = new Date(`${dateFilter}T00:00:00-05:00`).toISOString();
      const end = new Date(`${dateFilter}T23:59:59.999-05:00`).toISOString();
      
      const sales = await fetchTicketsBatch(branchId, start, end, cashierFilter);
      if (!sales.length) return setTickets([]);

      const saleIds = sales.map(s => s.id);
      const userIds = [...new Set(sales.map(s => s.user_id).filter(Boolean))];
      const customerIds = [...new Set(sales.map(s => s.customer_id).filter(Boolean))];

      const related = await fetchSalesRelatedData(saleIds, userIds, customerIds);
      const getMethod = (id) => paymentMethods.find(m => m.id === id)?.name || "DESCONOCIDO";

      const pointsMaps = await buildCustomerPointsMaps({ saleIds, customerIds });

      const uMap = related.users.reduce((a, u) => ({ ...a, [u.id]: (u.username || u.email || "SIN NOMBRE").toUpperCase() }), {});
      const cMap = related.customers.reduce((a, c) => ({ ...a, [c.id]: { name: c.name, phone: c.phone } }), {});
      const detCount = related.details.reduce((a, d) => ({ ...a, [d.sale_id]: (a[d.sale_id] || 0) + Number(d.quantity || 0) }), {});
      
      const pBySale = related.payments.reduce((a, p) => { a[p.sale_id] = [...(a[p.sale_id] || []), { ...p, payment_method_name: getMethod(p.payment_method_id) }]; return a; }, {});
      const retBySale = related.returns.reduce((a, r) => { a[r.sale_id] = [...(a[r.sale_id] || []), { ...r, totalRefund: Number(r.total_refund), refundMethodName: getMethod(r.refund_method_id) }]; return a; }, {});
      const canMap = related.canceled.reduce((a, c) => ({ ...a, [c.sale_id]: { cancelReason: c.cancel_reason, refundMethodId: c.refund_method_id, refundMethodName: getMethod(c.refund_method_id), cancelledAt: c.created_at } }), {});

      const mapped = await Promise.all(sales.map(async sale => {
        const canInfo = canMap[sale.id] || {};
        const rets = retBySale[sale.id] || [];
        const totRet = rets.reduce((acc, i) => acc + i.totalRefund, 0);
        const pays = pBySale[sale.id] || [];
        const redemptions = await loadRewardRedemptionsForSale(sale.id);

        return {
          id: sale.id, folio: getDisplayFolio(sale), articles: detCount[sale.id] || 0, time: formatTime(sale.sale_date), total: Number(sale.total), subtotal: Number(sale.subtotal), tax: Number(sale.tax), discountTotal: Number(sale.discount_total), cashier: uMap[sale.user_id] || "SIN CAJERO", customerId: sale.customer_id, client: cMap[sale.customer_id]?.name || "PÚBLICO EN GENERAL", pointsEarned: pointsMaps.pointsBySale[sale.id] || 0, pointsReturned: pointsMaps.returnedPointsBySale[sale.id] || 0, rewardPointsUsed: pointsMaps.rewardPointsBySale[sale.id] || 0, pointsBalance: sale.customer_id ? pointsMaps.balanceByCustomer[sale.customer_id] || 0 : null, date: sale.sale_date, paymentMethod: getPaymentMethodLabel(pays), status: sale.status, payments: pays, notes: sale.notes || "", cancelReason: canInfo.cancelReason || "", refundMethodId: canInfo.refundMethodId || "", refundMethodName: canInfo.refundMethodName || "", cancelledAt: canInfo.cancelledAt || null, returns: rets, totalReturned: totRet, netTotal: Math.max(Number(sale.total) - totRet, 0), rewardsCount: redemptions.reduce((a, r) => a + Number(r.quantity), 0), hasRewardRedemptions: redemptions.length > 0, rewardRedemptions: redemptions, ...getPaymentSummary(pays, sale.total)
        };
      }));
      setTickets(mapped.filter(t => t.folio.toLowerCase().includes(searchFolio.trim().toLowerCase())));
    } catch (e) { console.error(e); setTickets([]); } finally { setLoadingTickets(false); }
  }, [branchId, isOpen, dateFilter, cashierFilter, searchFolio, paymentMethods]);

  useEffect(() => { if (isOpen && branchId) loadBaseData(); }, [isOpen, branchId, loadBaseData]);
  useEffect(() => { loadTickets(); }, [loadTickets]);

  const loadTicketDetail = async (ticket, updateState = true) => {
    if (!ticket?.id) return null;
    if (updateState) setLoadingDetail(true);
    try {
      const { details, kits } = await fetchTicketDetailsData(ticket.id);
      const pIds = [...new Set([...details.map(d => d.product_id), ...kits.map(k => k.component_product_id), ...(ticket.rewardRedemptions || []).map(r => r.product_id)])].filter(Boolean);
      
      const pData = await fetchProductsByIds(pIds);
      const pMap = pData.reduce((a, p) => ({ ...a, [p.id]: p }), {});
      
      const kitsByDet = kits.reduce((a, k) => { a[k.sale_detail_id] = [...(a[k.sale_detail_id] || []), { productId: k.component_product_id, quantity: Number(k.quantity), description: pMap[k.component_product_id]?.name || "PRODUCTO" }]; return a; }, {});
      const rewByDet = (ticket.rewardRedemptions || []).reduce((a, r) => { if(r.sale_detail_id) a[r.sale_detail_id] = r; return a; }, {});
      
      const items = details.map(item => {
        const rewInfo = rewByDet[item.id];
        const isRew = Boolean(rewInfo);
        const prod = pMap[item.product_id] || {};
        return {
          id: item.id, productId: item.product_id, cant: Number(item.quantity), description: prod.name || prod.barcode || "PRODUCTO", amount: Number(item.total_price), unitPrice: isRew ? 0 : Number(item.unit_price), originalUnitPrice: Number(item.original_unit_price || prod.sale_price || item.unit_price), finalUnitPrice: isRew ? 0 : Number(item.final_unit_price || item.unit_price), discountAmount: isRew ? 0 : Number(item.discount_amount), isKit: !!prod.is_kit || !!kitsByDet[item.id]?.length, components: kitsByDet[item.id] || [], isRewardItem: isRew, rewardReversedAt: rewInfo?.reversed_at || null
        };
      });

      const detailData = { items, paymentMethod: getPaymentMethodLabel(ticket.payments) };
      if (updateState) setSelectedTicket(p => p?.id === ticket.id ? { ...p, ...detailData } : p);
      return detailData;
    } catch (e) { console.error(e); return null; } finally { if(updateState) setLoadingDetail(false); }
  };

  const loadReturnData = async (saleId) => {
    try {
      const { returns, returnItems } = await fetchSaleReturnsData(saleId);
      if (!returns?.length) return;
      
      const pIds = [...new Set(returnItems.map(i => i.product_id).filter(Boolean))];
      const pData = await fetchProductsByIds(pIds);
      const pMap = pData.reduce((a, p) => ({ ...a, [p.id]: p.name }), {});
      
      const itemsByRet = returnItems.reduce((a, i) => { a[i.return_id] = [...(a[i.return_id] || []), { quantity: Number(i.quantity), description: pMap[i.product_id] || "PRODUCTO", totalPrice: Number(i.total_price) }]; return a; }, {});
      
      const mapped = returns.map(r => ({ id: r.id, totalRefund: Number(r.total_refund), refundMethodName: getPaymentMethodNameById(r.refund_method_id), returnReason: r.return_reason, createdAt: r.created_at, items: itemsByRet[r.id] || [] }));
      const totRet = mapped.reduce((a, r) => a + r.totalRefund, 0);
      
      setReturnHistory(mapped); setTotalReturned(totRet);
      setSelectedTicket(p => p?.id === saleId ? { ...p, returns: mapped, totalReturned: totRet, netTotal: Math.max(Number(p.total) - totRet, 0) } : p);
    } catch (e) { console.error(e); }
  };

  const handleSelectTicket = async (t) => {
    setSelectedTicket(t); setIsNotesModalOpen(false);
    if (t.status?.toLowerCase() === "cancelled") {
      const data = await fetchCanceledSaleData(t.id);
      setCancelReason(data?.cancel_reason || ""); setRefundMethodId(data?.refund_method_id || "");
    } else { setCancelReason(""); setRefundMethodId(""); }
    await loadTicketDetail(t); await loadReturnData(t.id);
  };

  const executeCancelSale = async () => {
    const ticketBeforeCancel = { ...selectedTicket };
    try {
      setCancelProcessing(true);
      await executeCancelSaleTransaction(selectedTicket.id, user.id, branchId, cancelReason.trim(), refundMethodId);
      await loadTickets();
      
      const det = await loadTicketDetail(selectedTicket, false);
      await loadReturnData(selectedTicket.id);

      if (onSaleCancelled) onSaleCancelled();

      const baseTicket = det || ticketBeforeCancel || {};
      const pEarned = Number(ticketBeforeCancel?.pointsEarned || baseTicket?.pointsEarned || 0);
      const rPointsUsed = Number(ticketBeforeCancel?.rewardPointsUsed || baseTicket?.rewardPointsUsed || 0);
      const rCount = Number(ticketBeforeCancel?.rewardsCount || baseTicket?.rewardsCount || 0);
      const rName = getPaymentMethodNameById(refundMethodId) || baseTicket?.refundMethodName || ticketBeforeCancel?.refundMethodName || "SIN MÉTODO";

      const pointsLines = [];
      if (pEarned > 0) pointsLines.push(`Puntos ganados descontados: -${pEarned}`);
      if (rPointsUsed > 0) pointsLines.push(`Puntos de recompensa devueltos: +${rPointsUsed}`);
      if (pointsLines.length === 0) pointsLines.push("Puntos revertidos: 0");

      const successMessage = [
        `Folio: ${baseTicket?.folio || ticketBeforeCancel?.folio || "SIN FOLIO"}`,
        `Cliente: ${baseTicket?.client || ticketBeforeCancel?.client || "PÚBLICO EN GENERAL"}`,
        `Total cancelado: ${formatCurrency(baseTicket?.total || ticketBeforeCancel?.total || 0)}`,
        `Método de reembolso: ${rName}`,
        "", ...pointsLines, `Recompensas revertidas: ${rCount}`, "",
        "Inventario, puntos y recompensas actualizados correctamente.",
      ].join("\n");

      showAppAlert({ type: "success", title: "Venta cancelada correctamente", message: successMessage, confirmText: "Entendido" });
    } catch (error) {
      showAppAlert({ type: "danger", title: "No se pudo cancelar la venta", message: error.message || "Ocurrió un error al cancelar la venta.", confirmText: "Entendido" });
    } finally { setCancelProcessing(false); }
  };

  const handleCancelSale = () => {
    if (!selectedTicket?.id) return showAppAlert({ type: "warning", title: "Selecciona una venta", message: "Selecciona una venta primero." });
    if (selectedTicket.status?.toLowerCase() !== "completed") return showAppAlert({ type: "warning", title: "Venta no cancelable", message: "Solo se pueden cancelar ventas en estado COMPLETADA." });
    if (Number(selectedTicket.totalReturned || 0) > 0) return showAppAlert({ type: "warning", title: "Cancelación bloqueada", message: "Esta venta ya tiene devoluciones parciales registradas y ya no puede cancelarse." });
    if (!cancelReason.trim()) return showAppAlert({ type: "warning", title: "Motivo requerido", message: "Ingresa el motivo de cancelación." });
    if (!refundMethodId) return showAppAlert({ type: "warning", title: "Método requerido", message: "Selecciona el método con el que se canceló/reembolsó." });

    showAppConfirm({
      type: "danger", title: "Confirmar cancelación", confirmText: "Sí, cancelar venta", cancelText: "No, regresar",
      message: `¿Seguro que deseas cancelar la venta ${selectedTicket.folio}?\n\nEsta acción revertirá inventario, puntos y recompensas aplicadas cuando corresponda.`,
      onConfirm: executeCancelSale,
    });
  };

  const handlePartialReturnCreated = async () => {
    if (!selectedTicket?.id) return;
    try {
      await loadTickets(); await loadTicketDetail(selectedTicket); await loadReturnData(selectedTicket.id);
    } catch (error) {
      showAppAlert({ type: "warning", title: "Historial no actualizado", message: "La devolución se guardó, pero no se pudo refrescar el historial." });
    }
  };

  const handlePrintCopy = async () => {
    if (!selectedTicket?.id) return showAppAlert({ type: "warning", title: "Selecciona una venta", message: "Selecciona una venta primero." });
    try {
      setPrintProcessing(true);
      const detailData = (await loadTicketDetail(selectedTicket, false)) || {};
      const pointsMapsForPrint = await buildCustomerPointsMaps({ saleIds: [selectedTicket.id], customerIds: selectedTicket.customerId ? [selectedTicket.customerId] : [] });

      const ticketForPrint = {
        ...selectedTicket, ...detailData, items: detailData.items || selectedTicket.items || [], payments: detailData.payments || selectedTicket.payments || [],
        rewardRedemptions: detailData.rewardRedemptions || selectedTicket.rewardRedemptions || [], hasRewardRedemptions: Boolean(detailData.hasRewardRedemptions || selectedTicket.hasRewardRedemptions),
        pointsEarned: Number(selectedTicket.pointsEarned || pointsMapsForPrint.pointsBySale?.[selectedTicket.id] || 0), pointsReturned: Number(selectedTicket.pointsReturned || pointsMapsForPrint.returnedPointsBySale?.[selectedTicket.id] || 0),
        rewardPointsUsed: Number(detailData.rewardPointsUsed || selectedTicket.rewardPointsUsed || pointsMapsForPrint.rewardPointsBySale?.[selectedTicket.id] || 0),
        rewardsCount: Number(detailData.rewardsCount || selectedTicket.rewardsCount || 0),
        pointsBalance: selectedTicket.pointsBalance === null || selectedTicket.pointsBalance === undefined ? (selectedTicket.customerId ? Number(pointsMapsForPrint.balanceByCustomer?.[selectedTicket.customerId] || 0) : null) : selectedTicket.pointsBalance,
      };

      const refundMethodName = ticketForPrint.refundMethodName || getPaymentMethodNameById(refundMethodId) || "";
      const paymentSummary = getPaymentSummary(ticketForPrint.payments || [], ticketForPrint.total);
      const rewardRedemptions = ticketForPrint.rewardRedemptions || [];
      const rewardPointsUsed = Number(ticketForPrint.rewardPointsUsed || 0) || rewardRedemptions.reduce((acc, r) => acc + Number(r.total_points || 0), 0);
      const rewardsCount = Number(ticketForPrint.rewardsCount || 0) || rewardRedemptions.reduce((acc, r) => acc + Number(r.quantity || 0), 0);

      const itemsForPrint = (ticketForPrint.items || []).map((item) => ({
        quantity: item.cant, description: item.description, unit_price: item.isRewardItem ? 0 : item.finalUnitPrice || item.unitPrice,
        original_unit_price: item.originalUnitPrice || item.unitPrice, discount_amount: item.isRewardItem ? 0 : item.discountAmount || 0,
        line_total: item.amount, is_kit: !!item.isKit, components: (item.components || []).map((c) => ({ quantity: c.quantity, description: c.description })),
        is_reward_item: !!item.isRewardItem, isRewardItem: !!item.isRewardItem, reward_id: item.rewardId || null, rewardId: item.rewardId || null,
        reward_name: item.rewardName || "", rewardName: item.rewardName || "", reward_points: item.rewardPoints || 0, rewardPoints: item.rewardPoints || 0,
        total_points: item.totalRewardPoints || 0, totalPoints: item.totalRewardPoints || 0, sale_reward_redemption_id: item.saleRewardRedemptionId || null,
        saleRewardRedemptionId: item.saleRewardRedemptionId || null, reversed_at: item.rewardReversedAt || null, reversedAt: item.rewardReversedAt || null,
        reversal_reason: item.rewardReversalReason || "", reversalReason: item.rewardReversalReason || "",
      }));

      const paymentsForPrint = (ticketForPrint.payments || []).map((p) => ({ payment_method_name: p.paymentMethod, amount: p.amount, currency: p.currency, exchange_rate: p.exchangeRate, reference: p.reference || "" }));

      const ticketText = buildTicketText({
        branch: { name: branch?.name || "SUCURSAL", phone: branch?.phone || "", address: branch?.address || "", city: branch?.city || "", state: branch?.state || "", postal_code: branch?.postal_code || branch?.zip_code || "" },
        sale: {
          folio: ticketForPrint.folio, created_at: ticketForPrint.date, subtotal: ticketForPrint.subtotal, tax: ticketForPrint.tax, discount_total: ticketForPrint.discountTotal || 0, total: ticketForPrint.total,
          amount_received: paymentSummary.amountReceived, change_amount: paymentSummary.changeAmount, payment_method: ticketForPrint.paymentMethod, payments: paymentsForPrint, status: ticketForPrint.status,
          notes: ticketForPrint.notes || "", customer_name: ticketForPrint.client !== "PÚBLICO EN GENERAL" ? ticketForPrint.client : "", customer_phone: ticketForPrint.customerPhone || "", points_earned: Number(ticketForPrint.pointsEarned || 0),
          points_returned: Number(ticketForPrint.pointsReturned || 0), reward_points_used: rewardPointsUsed, rewards_count: rewardsCount, has_reward_redemptions: rewardRedemptions.length > 0, reward_redemptions: rewardRedemptions,
          customer_points_balance: ticketForPrint.pointsBalance === null || ticketForPrint.pointsBalance === undefined ? null : Number(ticketForPrint.pointsBalance || 0),
          cancelled_at: ticketForPrint.cancelledAt, cancellation_reason: ticketForPrint.cancelReason || cancelReason || "SIN MOTIVO REGISTRADO", refund_method: refundMethodName, cashier_name: ticketForPrint.cashier, total_returned: ticketForPrint.totalReturned || 0,
          net_total: ticketForPrint.netTotal === null || ticketForPrint.netTotal === undefined ? ticketForPrint.total : Number(ticketForPrint.netTotal || 0),
          returns: (ticketForPrint.returns || []).map((ret) => ({ total_refund: ret.totalRefund || 0, refund_method: ret.refundMethodName || "", return_reason: ret.returnReason || "", created_at: ret.createdAt || null, items: (ret.items || []).map((item) => ({ quantity: item.quantity || 0, description: item.description || "PRODUCTO", total_price: item.totalPrice || 0 })) })),
        },
        items: itemsForPrint, cashierName: ticketForPrint.cashier,
        footer: { line1: "Gracias por su compra", line2: "Agenda tu cita de baño", phone: "998 117 5387", returnPolicy: "Para cambios o devoluciones presentar ticket de compra" },
        isReprint: true, reprintedAt: new Date(),
      });

      const result = await printTicket(ticketText);
      if (!result?.success) throw new Error(result?.message || "No se pudo imprimir la copia.");
      showAppAlert({ type: "success", title: "Copia generada", message: "Copia del ticket generada correctamente." });
    } catch (error) { showAppAlert({ type: "danger", title: "No se pudo imprimir", message: error.message || "No se pudo imprimir la copia del ticket." }); } 
    finally { setPrintProcessing(false); }
  };

  const resetAll = () => { setSelectedTicket(null); setSearchFolio(""); setCashierFilter("all"); setCancelReason(""); setRefundMethodId(""); setIsNotesModalOpen(false); setPrintProcessing(false); setReturnHistory([]); setTotalReturned(0); setIsPartialReturnOpen(false); closeAppModal(); };
  useEffect(() => { if (!isOpen) resetAll(); }, [isOpen]);

  return {
    searchFolio, setSearchFolio, selectedTicket, dateFilter, setDateFilter, cashierFilter, setCashierFilter, tickets, cashiers, paymentMethods,
    loadingTickets, loadingDetail, cancelProcessing, printProcessing, cancelReason, setCancelReason, refundMethodId, setRefundMethodId,
    isPartialReturnOpen, setIsPartialReturnOpen, appModal, isNotesModalOpen, setIsNotesModalOpen, closeAppModal, handleSelectTicket,
    handleCancelSale, handlePartialReturnCreated, handlePrintCopy, getPaymentMethodNameById // Lo devolvemos por si la vista lo usa
  };
};