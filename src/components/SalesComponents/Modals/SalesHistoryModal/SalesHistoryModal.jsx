import React, { memo } from "react";
import styles from "./SalesHistoryModal.module.css";
import PartialReturnModal from "../PartialReturnModal/PartialReturnModal";
import AppModal from "../../../AppModal/AppModal";
import { useAuth } from "../../../../contexts/AuthContext";
import { useBranch } from "../../../../contexts/BranchContext";
import { useSalesHistory } from "./useSalesHistory";
import { formatCurrency, formatDateTime, getDerivedStatus, hasPartialReturns, getPaymentSummary } from "../../services/salesHistoryService";

// IMPORTAMOS LA LIBRERÍA DE CALENDARIO QUE USAS EN MOVIMIENTOS
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import es from "date-fns/locale/es"; 

import SearchIcon from "../../../../assets/icons/searchIcon.svg";
import CalendarIcon from "../../../../assets/icons/calendar-days-solid-full.svg";
import ClockIcon from "../../../../assets/icons/clock-solid-full.svg";
import ReceiptIcon from "../../../../assets/icons/receipt-solid-full.svg";
import XmarkIcon from "../../../../assets/icons/xmark-solid-full.svg";
import DeleteIcon from "../../../../assets/icons/deleteIcon.svg";
import ChangeIcon from "../../../../assets/icons/changeIcon.svg";
import InvoiceIcon from "../../../../assets/icons/file-invoice-dollar-solid-full.svg";
import NotesIcon from "../../../../assets/icons/pen-solid-full.svg";
import UserIcon from "../../../../assets/icons/user-solid.svg";
import BoxesIcon from "../../../../assets/icons/boxes-stacked-solid-full.svg";

// Registramos el idioma español para el calendario
registerLocale("es", es);

const SalesHistoryModal = memo(({ isOpen, onClose, onSaleCancelled }) => {
  const { user } = useAuth();
  const { branch } = useBranch();

  const {
    searchFolio, setSearchFolio, selectedTicket, dateFilter, setDateFilter, cashierFilter, setCashierFilter, tickets, cashiers, paymentMethods,
    loadingTickets, loadingDetail, cancelProcessing, printProcessing, cancelReason, setCancelReason, refundMethodId, setRefundMethodId,
    isPartialReturnOpen, setIsPartialReturnOpen, appModal, isNotesModalOpen, setIsNotesModalOpen, closeAppModal, handleSelectTicket,
    handleCancelSale, handlePartialReturnCreated, handlePrintCopy
  } = useSalesHistory({ isOpen, branchId: branch?.id, user, branch, onSaleCancelled });

  if (!isOpen) return null;

  // Adaptador para el DatePicker
  const [year, month, day] = (dateFilter || "").split("-");
  const selectedDateObj = year && month && day ? new Date(year, month - 1, day) : new Date();

  const handleDateChange = (date) => {
    if (!date) return;
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    setDateFilter(`${yyyy}-${mm}-${dd}`);
  };

  // --- Lógica de presentación ---
  const getStatusConfig = (ticket) => {
    const derivedStatus = getDerivedStatus(ticket);
    const map = {
      completed: { label: "COMPLETADA", className: styles.statusCompleted },
      cancelled: { label: "CANCELADA", className: styles.statusCancelled },
      partial_return: { label: "DEVOLUCIÓN PARCIAL", className: styles.statusRefunded },
      pending: { label: "PENDIENTE", className: styles.statusPending },
    };
    return map[derivedStatus] || { label: "SIN ESTADO", className: styles.statusDefault };
  };

  const getTicketRowStatusClass = (ticket) => {
    const derivedStatus = getDerivedStatus(ticket);
    if (derivedStatus === "cancelled") return styles.ticketRowCancelled;
    if (derivedStatus === "partial_return") return styles.ticketRowRefunded;
    if (derivedStatus === "pending") return styles.ticketRowPending;
    return "";
  };

  const derivedStatus = getDerivedStatus(selectedTicket);
  const isCancelled = derivedStatus === "cancelled";
  const isCompleted = selectedTicket?.status?.toLowerCase() === "completed" && !isCancelled;
  const ticketHasReturns = hasPartialReturns(selectedTicket);
  const statusConfig = getStatusConfig(selectedTicket);

  const itemRowsWithLimits = (selectedTicket?.items || []).map((item) => {
    const returnedQty = (selectedTicket?.returns || []).reduce((acc, ret) => {
      const matched = (ret.items || []).filter((ri) => ri.saleDetailId === item.id);
      return acc + matched.reduce((sum, ri) => sum + Number(ri.quantity || 0), 0);
    }, 0);
    const remainingQty = Math.max(Number(item.cant || 0) - returnedQty, 0);
    const isRewardReverted = Boolean(item.isRewardItem && (isCancelled || item.rewardReversedAt || item.reward_reversed_at));
    return { ...item, returnedQty, remainingQty, isRewardReverted };
  });

  const totalUnitsStillInSale = itemRowsWithLimits.reduce((acc, item) => acc + Number(item.remainingQty || 0), 0);
  const maxUnitsAllowedInOperation = Math.max(totalUnitsStillInSale - 1, 0);
  
  // LOGICA ESTRICTA: Solo permite devolver si no hay devoluciones previas
  const canOpenPartialReturn = !!selectedTicket && !loadingDetail && !isCancelled && maxUnitsAllowedInOperation > 0 && !ticketHasReturns;

  const paymentSummary = getPaymentSummary(selectedTicket?.payments || [], selectedTicket?.total || 0);

  const rewardRedemptionsForSummary = selectedTicket?.rewardRedemptions || [];
  const rewardSummaryCount = Number(selectedTicket?.rewardsCount || 0) || rewardRedemptionsForSummary.reduce((acc, reward) => acc + Number(reward.quantity || 0), 0);
  const rewardSummaryPoints = Number(selectedTicket?.rewardPointsUsed || 0) || rewardRedemptionsForSummary.reduce((acc, reward) => acc + Number(reward.total_points || 0), 0);
  const shouldShowRewardSummary = Boolean(selectedTicket?.hasRewardRedemptions || rewardRedemptionsForSummary.length > 0 || rewardSummaryCount > 0 || rewardSummaryPoints > 0);

  const customerHasName = Boolean(selectedTicket?.client && selectedTicket.client !== "PÚBLICO EN GENERAL");
  const pointsEarnedSummary = Number(selectedTicket?.pointsEarned || 0);
  const pointsReturnedSummary = Number(selectedTicket?.pointsReturned || 0);
  const customerPointsBalance = selectedTicket?.pointsBalance === null || selectedTicket?.pointsBalance === undefined ? null : Number(selectedTicket.pointsBalance || 0);
  const pointsNetSummary = Math.max(pointsEarnedSummary - pointsReturnedSummary, 0);
  const shouldShowPointsSummary = Boolean(customerHasName && (pointsEarnedSummary > 0 || pointsReturnedSummary > 0 || rewardSummaryPoints > 0 || customerPointsBalance !== null));

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.headerTitle}>HISTORIAL DE VENTAS</h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Cerrar historial de ventas">
            <img src={XmarkIcon} alt="" className={styles.closeIcon} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.leftPanel}>
            
            <div className={styles.filtersContainer}>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Folio de venta:</label>
                <div className={styles.inputWrapper}>
                  <img src={SearchIcon} alt="" className={styles.inputIconLeft} aria-hidden="true" />
                  <input type="text" placeholder="Ingresa el folio del ticket" value={searchFolio} onChange={(e) => setSearchFolio(e.target.value)} className={styles.modernInput} />
                </div>
              </div>
              
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Ventas del día:</label>
                <div className={styles.inputWrapper}>
                  <img src={CalendarIcon} alt="" className={styles.inputIconLeft} aria-hidden="true" style={{zIndex: 10}} />
                  <div className={styles.datePickerContainer}>
                    <DatePicker
                      selected={selectedDateObj}
                      onChange={handleDateChange}
                      maxDate={new Date()}
                      dateFormat="dd/MM/yyyy"
                      locale="es"
                      className={styles.modernInput}
                      popperClassName={styles.datePickerPopper}
                      calendarClassName={styles.datePickerCalendar}
                      portalId="calendar-portal"
                    />
                  </div>
                </div>
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Cajero:</label>
                <div className={styles.inputWrapper}>
                  <img src={UserIcon} alt="" className={styles.inputIconLeft} aria-hidden="true" />
                  <select value={cashierFilter} onChange={(e) => setCashierFilter(e.target.value)} className={`${styles.modernInput} ${styles.modernSelect}`}>
                    <option value="all">Todos los cajeros</option>
                    {cashiers.map((cashier) => (<option key={cashier.id} value={cashier.id}>{cashier.name}</option>))}
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.ticketListContainer}>
              <table className={styles.ticketTable}>
                <thead>
                  <tr>
                    <th className={styles.notesIndicatorHeader}></th>
                    <th><span className={styles.tableHeaderContent}><img src={ReceiptIcon} alt="" aria-hidden="true" />Folio</span></th>
                    <th><span className={styles.tableHeaderContentCenter}><img src={BoxesIcon} alt="" aria-hidden="true" />Artículos</span></th>
                    <th><span className={styles.tableHeaderContentCenter}><img src={ClockIcon} alt="" aria-hidden="true" />Hora</span></th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingTickets ? (<tr><td colSpan="5" className={styles.textCenter}>Cargando ventas...</td></tr>) 
                  : tickets.length === 0 ? (<tr><td colSpan="5" className={styles.textCenter}>No se encontraron ventas</td></tr>) 
                  : (
                    tickets.map((ticket) => {
                      const ticketDerivedStatus = getDerivedStatus(ticket);
                      return (
                        <tr key={ticket.id} onClick={() => handleSelectTicket(ticket)} className={`${styles.ticketRow} ${getTicketRowStatusClass(ticket)} ${selectedTicket?.id === ticket.id ? styles.ticketRowActive : ""}`}>
                          <td className={styles.notesIndicator} title={[
                              ticketDerivedStatus === "cancelled" ? `Cancelada: ${ticket.cancelReason || "Sin motivo registrado"}` : "",
                              ticketDerivedStatus === "partial_return" && ticket.totalReturned > 0 ? `Devolución parcial: ${formatCurrency(ticket.totalReturned)}` : "",
                              ticket.notes?.trim() ? ticket.notes : "",
                              ticket.payments?.some((p) => p.reference?.trim()) ? `Referencia: ${ticket.payments.filter((p) => p.reference?.trim()).map((p) => p.reference).join(" / ")}` : "",
                            ].filter(Boolean).join(" • ")}
                          >
                            <span className={styles.ticketIndicators}>
                              {ticketDerivedStatus === "cancelled" && (<img src={XmarkIcon} alt="Venta cancelada" className={styles.ticketIndicatorIcon} />)}
                              {ticketDerivedStatus === "partial_return" && (<img src={ChangeIcon} alt="Venta con devolución parcial" className={styles.ticketIndicatorIcon} />)}
                              {ticket.notes?.trim() && (<img src={NotesIcon} alt="Venta con notas" className={styles.ticketIndicatorIcon} />)}
                            </span>
                          </td>
                          <td>{ticket.folio}</td>
                          <td className={styles.textCenter}>{ticket.articles}</td>
                          <td className={styles.textCenter}>{ticket.time}</td>
                          <td className={styles.textRight}>{formatCurrency(ticket.total)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.rightPanel}>
            {selectedTicket ? (
              <>
                <div className={styles.ticketDetailContainer}>
                  <div className={styles.ticketHeader}>
                    <div className={styles.ticketInfoRow}><span className={styles.ticketLabel}>Folio:</span><span className={styles.ticketFolio}>{selectedTicket.folio}</span></div>
                    <div className={styles.ticketInfoRow}><span className={styles.ticketLabel}>Cajero:</span><span>{selectedTicket.cashier}</span></div>
                    <div className={styles.ticketInfoRow}><span className={styles.ticketLabel}>Cliente:</span><span>{selectedTicket.client}</span></div>
                    <div className={styles.ticketInfoRow}><span className={styles.ticketLabel}>Estado:</span><span className={`${styles.statusBadge} ${statusConfig.className}`}>{statusConfig.label}</span></div>
                    <div className={styles.ticketDate}>{formatDateTime(selectedTicket.date)}</div>
                  </div>

                  <div className={styles.paymentMethodContainer}>
                    <span className={styles.paymentMethodLabel}>Método de pago:</span>
                    <span className={`${styles.badge} ${styles.badgeSuccess}`}>{selectedTicket.paymentMethod}</span>
                  </div>

                  {selectedTicket?.payments?.some((p) => p.reference?.trim()) && (
                    <div className={styles.paymentMethodContainer}>
                      <span className={styles.paymentMethodLabel}>Referencia:</span>
                      <span className={`${styles.badge} ${styles.badgeInfo}`}>{selectedTicket.payments.filter((p) => p.reference?.trim()).map((p) => p.reference).join(" / ")}</span>
                    </div>
                  )}

                  {getDerivedStatus(selectedTicket) === "partial_return" && (
                    <div className={styles.partialReturnSummaryBox}>
                      <div className={styles.partialReturnSummaryRow}><span>Unidades actualmente en la venta:</span><strong>{totalUnitsStillInSale}</strong></div>
                      <div className={styles.partialReturnSummaryRow}><span>Máximo total que puedes devolver ahora:</span><strong>{maxUnitsAllowedInOperation}</strong></div>
                      <div className={styles.partialReturnSummaryRow}><span>Debe quedar al menos:</span><strong>1 unidad en el ticket</strong></div>
                    </div>
                  )}

                  <table className={styles.itemsTable}>
                    <thead>
                      <tr><th>Cant.</th><th>Descripción</th><th>Importe</th></tr>
                    </thead>
                    <tbody>
                      {loadingDetail ? (<tr><td colSpan="3" className={styles.textCenter}>Cargando detalle...</td></tr>) 
                      : itemRowsWithLimits.length ? (
                        itemRowsWithLimits.map((item) => {
                          const maxReturnAllowed = Math.max(Math.min(Number(item.remainingQty || 0), maxUnitsAllowedInOperation), 0);
                          const isFullyReturned = item.remainingQty === 0 && item.returnedQty > 0;
                          const isBlockedByRule = item.remainingQty > 0 && maxReturnAllowed === 0;
                          const isRewardReverted = Boolean(item.isRewardReverted);
                          const shouldDimItem = isFullyReturned || isBlockedByRule || isRewardReverted;

                          return (
                            <tr key={item.id} className={shouldDimItem ? styles.returnedItemRow : ""}>
                              <td className={styles.textCenter}>
                                {item.cant}
                                {(item.returnedQty > 0 || isBlockedByRule || isRewardReverted) && (
                                  <div className={styles.returnedMeta}>
                                    {isRewardReverted ? (<span className={styles.rewardRevertedText}>RECOMPENSA REVERTIDA</span>) 
                                    : isFullyReturned ? (<span className={styles.fullyReturnedText}>DEVOLUCIÓN COMPLETA</span>) 
                                    : isBlockedByRule ? (<span className={styles.fullyReturnedText}>DEVOLUCIÓN BLOQUEADA</span>) 
                                    : (<span className={styles.availableReturnText}>Puedes devolver hasta {maxReturnAllowed} pieza{maxReturnAllowed !== 1 ? "s" : ""}</span>)}
                                  </div>
                                )}
                              </td>
                              <td className={shouldDimItem ? styles.returnedItemText : ""}>{item.description}</td>
                              <td className={`${styles.textRight} ${shouldDimItem ? styles.returnedItemText : ""}`}>{formatCurrency(item.amount)}</td>
                            </tr>
                          );
                        })
                      ) : (<tr><td colSpan="3" className={styles.textCenter}>Sin detalle disponible</td></tr>)}
                    </tbody>
                  </table>

                  <div className={styles.totalsContainer}>
                    <div className={styles.totalsContent}>
                      {(paymentSummary.cash > 0 || paymentSummary.terminal > 0 || paymentSummary.usd > 0 || paymentSummary.mxnOther > 0) && (
                        <div className={styles.summarySection}>
                          <div className={styles.summarySectionTitle}>Desglose de pago</div>
                          {paymentSummary.cash > 0 && (<div className={styles.totalRow}><span className={styles.totalLabel}>Pago con EFECTIVO:</span><span className={styles.totalAmount}>{formatCurrency(paymentSummary.cash)}</span></div>)}
                          {paymentSummary.terminal > 0 && (<div className={styles.totalRow}><span className={styles.totalLabel}>Pago con TERMINAL:</span><span className={styles.totalAmount}>{formatCurrency(paymentSummary.terminal)}</span></div>)}
                          {paymentSummary.usd > 0 && (<div className={styles.totalRow}><span className={styles.totalLabel}>Pago con DÓLARES:</span><span className={styles.totalAmount}>{formatCurrency(paymentSummary.usd)}</span></div>)}
                          {paymentSummary.mxnOther > 0 && (<div className={styles.totalRow}><span className={styles.totalLabel}>Otros pagos MXN:</span><span className={styles.totalAmount}>{formatCurrency(paymentSummary.mxnOther)}</span></div>)}
                        </div>
                      )}

                      {(paymentSummary.usd > 0 || paymentSummary.amountReceived > 0 || paymentSummary.changeAmount >= 0) && (
                        <div className={styles.summarySection}>
                          <div className={styles.summarySectionTitle}>Conversión y cobro</div>
                          {paymentSummary.usd > 0 && paymentSummary.exchangeRate > 0 && (<div className={styles.totalRow}><span className={styles.totalLabel}>T.C. USD:</span><span className={styles.totalAmount}>{formatCurrency(paymentSummary.exchangeRate)}</span></div>)}
                          {paymentSummary.usd > 0 && paymentSummary.usdToMxn > 0 && (<div className={styles.totalRow}><span className={styles.totalLabel}>Eq. MXN USD:</span><span className={styles.totalAmount}>{formatCurrency(paymentSummary.usdToMxn)}</span></div>)}
                          <div className={`${styles.totalRow} ${styles.highlightRow}`}><span className={styles.totalLabelBold}>Pago con:</span><span className={styles.totalAmountStrong}>{formatCurrency(paymentSummary.amountReceived)}</span></div>
                          <div className={`${styles.totalRow} ${styles.highlightRow}`}><span className={styles.totalLabelBold}>Cambio:</span><span className={styles.totalAmountStrong}>{formatCurrency(paymentSummary.changeAmount)}</span></div>
                        </div>
                      )}

                      {shouldShowPointsSummary && (
                        <div className={`${styles.summarySection} ${isCancelled ? styles.pointsSummaryCancelled : styles.pointsSummaryActive}`}>
                          <div className={styles.pointsSummaryHeader}><span>Puntos del cliente</span><span className={styles.pointsSummaryStatus}>{isCancelled ? "REVERSA" : ticketHasReturns ? "DEVOLUCIÓN" : "ACTIVOS"}</span></div>
                          {pointsEarnedSummary > 0 && (<div className={styles.totalRow}><span className={styles.totalLabel}>{isCancelled ? "Puntos descontados:" : "Puntos ganados:"}</span><span className={`${styles.pointsSummaryValue} ${isCancelled ? styles.pointsNegative : styles.pointsPositive}`}>{isCancelled ? `-${pointsEarnedSummary}` : `+${pointsEarnedSummary}`}</span></div>)}
                          {pointsReturnedSummary > 0 && !isCancelled && (<div className={styles.totalRow}><span className={styles.totalLabel}>Puntos devolución:</span><span className={`${styles.pointsSummaryValue} ${styles.pointsNegative}`}>-{pointsReturnedSummary}</span></div>)}
                          {rewardSummaryPoints > 0 && (<div className={styles.totalRow}><span className={styles.totalLabel}>{isCancelled ? "Puntos devueltos:" : "Puntos canjeados:"}</span><span className={`${styles.pointsSummaryValue} ${isCancelled ? styles.pointsPositive : styles.pointsNegative}`}>{isCancelled ? `+${rewardSummaryPoints}` : `-${rewardSummaryPoints}`}</span></div>)}
                          {ticketHasReturns && !isCancelled && (<div className={`${styles.totalRow} ${styles.pointsSummaryNetRow}`}><span className={styles.totalLabelBold}>Puntos netos:</span><span className={`${styles.pointsSummaryValue} ${pointsNetSummary > 0 ? styles.pointsPositive : styles.pointsNeutral}`}>+{pointsNetSummary}</span></div>)}
                          {customerPointsBalance !== null && !Number.isNaN(customerPointsBalance) && (<div className={`${styles.totalRow} ${styles.pointsSummaryNetRow}`}><span className={styles.totalLabelBold}>Saldo puntos:</span><span className={`${styles.pointsSummaryValue} ${styles.pointsNeutral}`}>{customerPointsBalance} pts</span></div>)}
                        </div>
                      )}

                      {shouldShowRewardSummary && (
                        <div className={`${styles.summarySection} ${isCancelled ? styles.rewardSummaryCancelled : styles.rewardSummaryActive}`}>
                          <div className={styles.rewardSummaryHeader}><span>Recompensas</span><span className={styles.rewardSummaryStatus}>{isCancelled ? "REVERTIDAS" : "APLICADAS"}</span></div>
                          <div className={styles.totalRow}><span className={styles.totalLabel}>{isCancelled ? "Canjes revertidos:" : "Canjes aplicados:"}</span><span className={styles.rewardSummaryValue}>{rewardSummaryCount}</span></div>
                          <div className={styles.totalRow}><span className={styles.totalLabel}>{isCancelled ? "Puntos devueltos:" : "Puntos usados:"}</span><span className={styles.rewardSummaryValue}>{isCancelled ? `+${rewardSummaryPoints}` : `-${rewardSummaryPoints}`}</span></div>
                        </div>
                      )}

                      <div className={styles.summarySection}>
                        <div className={styles.summarySectionTitle}>Resumen de venta</div>
                        <div className={styles.totalRow}><span className={styles.totalLabel}>Subtotal:</span><span className={styles.totalAmount}>{formatCurrency(selectedTicket.subtotal)}</span></div>
                        <div className={styles.totalRow}><span className={styles.totalLabel}>Descuento:</span><span className={styles.totalAmount}>-{formatCurrency(selectedTicket.discountTotal || 0)}</span></div>
                        <div className={styles.totalRow}><span className={styles.totalLabel}>Impuesto:</span><span className={styles.totalAmount}>{formatCurrency(selectedTicket.tax)}</span></div>
                        <div className={`${styles.totalRow} ${styles.finalTotalRow}`}><span className={styles.totalLabelBold}>Total:</span><span className={styles.totalAmountFinal}>{formatCurrency(selectedTicket.total)}</span></div>
                        {selectedTicket.totalReturned > 0 && (
                          <>
                            <div className={styles.totalRow}><span className={styles.totalLabel}>Devuelto acumulado:</span><span className={styles.totalAmount}>-{formatCurrency(selectedTicket.totalReturned)}</span></div>
                            <div className={`${styles.totalRow} ${styles.finalTotalRow}`}><span className={styles.totalLabelBold}>Neto actual:</span><span className={styles.totalAmountFinal}>{formatCurrency(selectedTicket.netTotal)}</span></div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {selectedTicket?.returns?.length > 0 && (
                    <div className={styles.totalsContainer}>
                      <div className={styles.totalsContent}>
                        <div className={styles.summarySection}>
                          <div className={styles.summarySectionTitle}>Devoluciones parciales</div>
                          {selectedTicket.returns.map((ret) => (
                            <div key={ret.id} className={styles.returnBlock}>
                              <div className={styles.totalRow}><span className={styles.totalLabel}>Fecha:</span><span className={styles.totalAmount}>{formatDateTime(ret.createdAt)}</span></div>
                              <div className={styles.totalRow}><span className={styles.totalLabel}>Método devolución:</span><span className={styles.totalAmount}>{ret.refundMethodName || "SIN MÉTODO"}</span></div>
                              <div className={styles.totalRow}><span className={styles.totalLabel}>Motivo:</span><span className={styles.totalAmount}>{ret.returnReason || "Sin motivo"}</span></div>
                              <div className={styles.totalRow}><span className={styles.totalLabel}>Monto devuelto:</span><span className={styles.totalAmount}>{formatCurrency(ret.totalRefund)}</span></div>
                              {ret.items?.length > 0 && (
                                <div className={styles.returnItemsList}>
                                  {ret.items.map((item, index) => (
                                    <div key={item.id || `ret-item-${index}`} className={styles.returnItemRow}>
                                      <span>{item.quantity} x {item.description}</span>
                                      <span>{formatCurrency(item.totalPrice)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className={styles.filtersContainer}>
                    <div className={styles.filterGroup}>
                      <label className={styles.filterLabel}>Motivo de cancelación:</label>
                      <input type="text" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className={styles.modernInput} placeholder="Describe el motivo" disabled={cancelProcessing || !isCompleted || ticketHasReturns} />
                    </div>
                    <div className={styles.filterGroup}>
                      <label className={styles.filterLabel}>Método de reembolso/cancelación:</label>
                      <select value={refundMethodId} onChange={(e) => setRefundMethodId(e.target.value)} className={`${styles.modernInput} ${styles.modernSelect}`} disabled={cancelProcessing || !isCompleted || ticketHasReturns}>
                        <option value="">Selecciona un método</option>
                        {paymentMethods.map((method) => (<option key={method.id} value={method.id}>{method.name}</option>))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className={styles.actionButtons}>
                  <div className={styles.leftActions}>
                    <button type="button" className={`${styles.actionBtn} ${styles.btnCancel}`} onClick={handleCancelSale} disabled={cancelProcessing || !isCompleted || ticketHasReturns} title={ticketHasReturns ? "Esta venta ya tiene devoluciones parciales y ya no puede cancelarse" : ""}>
                      <img src={DeleteIcon} alt="" className={styles.actionIcon} aria-hidden="true" /> Cancelar Venta
                    </button>
                    <button type="button" className={`${styles.actionBtn} ${styles.btnReturn}`} onClick={() => setIsPartialReturnOpen(true)} disabled={!canOpenPartialReturn} title={!selectedTicket ? "" : isCancelled ? "No se puede devolver una venta cancelada" : ticketHasReturns ? "Este ticket ya tiene una devolución parcial aplicada" : maxUnitsAllowedInOperation <= 0 ? "Debe quedar al menos 1 unidad en la venta" : ""}>
                      <img src={ChangeIcon} alt="" className={styles.actionIcon} aria-hidden="true" /> Devolución parcial
                    </button>
                    <button type="button" className={`${styles.actionBtn} ${styles.btnInvoice}`} disabled={!isCompleted}>
                      <img src={InvoiceIcon} alt="" className={styles.actionIcon} aria-hidden="true" /> Facturar
                    </button>
                    <button type="button" className={`${styles.actionBtn} ${styles.btnPrint}`} onClick={handlePrintCopy} disabled={printProcessing || loadingDetail || !selectedTicket} title="Reimprime el ticket de esta venta">
                      {printProcessing ? "Imprimiendo..." : (<><img src={ReceiptIcon} alt="" className={styles.actionIcon} aria-hidden="true" /> Imprimir copia</>)}
                    </button>
                    <button type="button" className={`${styles.actionBtn} ${styles.btnNotes}`} onClick={() => setIsNotesModalOpen(true)} disabled={!selectedTicket?.notes?.trim()}>
                      <img src={NotesIcon} alt="" className={styles.actionIcon} aria-hidden="true" /> Ver Notas
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className={styles.emptyState}>
                <img src={ReceiptIcon} alt="" className={styles.emptyStateIcon} aria-hidden="true" />
                <span>Selecciona un ticket para ver los detalles</span>
              </div>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.closeFooterBtn} onClick={onClose}>
            <img src={XmarkIcon} alt="" className={styles.footerButtonIcon} aria-hidden="true" /> ESC - Cerrar
          </button>
        </div>

        {isNotesModalOpen && selectedTicket && (
          <div className={styles.notesOverlay}>
            <div className={styles.notesModal}>
              <div className={styles.notesHeader}>
                <h3>Notas del ticket {selectedTicket.folio}</h3>
                <button type="button" className={styles.notesClose} onClick={() => setIsNotesModalOpen(false)} aria-label="Cerrar notas"><img src={XmarkIcon} alt="" className={styles.notesCloseIcon} aria-hidden="true" /></button>
              </div>
              <div className={styles.notesContent}>{selectedTicket.notes?.trim() ? selectedTicket.notes : "Esta venta no tiene notas registradas."}</div>
              <div className={styles.notesFooter}><button className={styles.closeFooterBtn} onClick={() => setIsNotesModalOpen(false)}>Cerrar</button></div>
            </div>
          </div>
        )}

        <AppModal isOpen={appModal.isOpen} type={appModal.type} title={appModal.title} message={appModal.message} confirmText={appModal.confirmText} cancelText={appModal.cancelText} showCancel={appModal.showCancel} loading={appModal.loading} onConfirm={appModal.onConfirm} onCancel={appModal.onCancel} onClose={closeAppModal} />

        <PartialReturnModal isOpen={isPartialReturnOpen} onClose={() => setIsPartialReturnOpen(false)} selectedTicket={selectedTicket} paymentMethods={paymentMethods} onReturnCreated={handlePartialReturnCreated} />
      </div>
    </div>
  );
});

export default SalesHistoryModal;