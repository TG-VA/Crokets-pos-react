import React, { useState, useEffect, useCallback, memo } from "react";
import styles from "./PaymentModal.module.css";
import NotesModal from "../NotesModal/NotesModal";
import AppModal from "../../../AppModal/AppModal";

import CashIcon from "../../../../assets/icons/money-bill-wave-solid-full.svg";
import DollarsIcon from "../../../../assets/icons/dollar-sign-solid-full.svg";
import MixedIcon from "../../../../assets/icons/coins-solid-full.svg";
import TerminalIcon from "../../../../assets/icons/credit-card-solid-full.svg";
import TransferIcon from "../../../../assets/icons/building-columns-solid-full.svg";
import XmarkIcon from "../../../../assets/icons/xmark-solid-full.svg";
import {
  getPrintMode,
  PRINT_MODE_CONFIRM,
} from "../../../../services/printSettingsService";
import {
  getCashOperationSettings,
  triggerCashDrawerKick,
} from "../../../../services/cashOperationSettingsService";

const toNumber = (val) =>
  !val || String(val).trim() === ""
    ? 0
    : Number.isNaN(parseFloat(val))
      ? 0
      : parseFloat(val);

const PAYMENT_METHODS = [
  { id: "Efectivo", name: "Efectivo", icon: CashIcon },
  { id: "Dolares", name: "Dólares", icon: DollarsIcon },
  { id: "Mixto", name: "Mixto", icon: MixedIcon },
  { id: "Terminal", name: "Terminal", icon: TerminalIcon },
  { id: "Transferencia", name: "Transferencia", icon: TransferIcon },
];

const PaymentModal = memo(
  ({ isOpen, onClose, total, onProcessPayment, processingSale }) => {
    const [selectedPaymentMethod, setSelectedPaymentMethod] =
      useState("Efectivo");
    const [paidAmount, setPaidAmount] = useState("");
    const [dollarAmount, setDollarAmount] = useState("");
    const [exchangeRate, setExchangeRate] = useState(() => {
      const cashOps = getCashOperationSettings();
      return cashOps.defaultExchangeRate
        ? String(cashOps.defaultExchangeRate)
        : "18.50";
    });
    const [mixedPayments, setMixedPayments] = useState({
      efectivo: "",
      tarjeta: "",
      dolares: "",
    });
    const [trackingCode, setTrackingCode] = useState("");
    const [isNotesModalOpen, setNotesModalOpen] = useState(false);
    const [saleNotes, setSaleNotes] = useState("");
    const [processing, setProcessing] = useState(false);
    const [cashOpSettings, setCashOpSettings] = useState(() =>
      getCashOperationSettings()
    );
    const [appModal, setAppModal] = useState({
      isOpen: false,
      type: "warning",
      title: "Aviso",
      message: "",
      confirmText: "Entendido",
    });

    const effectiveProcessing = processing || processingSale;
    const safeTotal = Number(total || 0);
    const isZeroTotalSale = safeTotal <= 0;
    const numericExchangeRate = toNumber(exchangeRate);

    const closeAppModal = useCallback(
      () =>
        setAppModal((prev) => ({
          ...prev,
          isOpen: false,
          onConfirmAction: undefined,
        })),
      []
    );
    const showAppWarning = useCallback(
      (message) =>
        setAppModal({
          isOpen: true,
          type: "warning",
          title: "Aviso",
          message: String(message),
          confirmText: "Entendido",
        }),
      []
    );
    const showAppDanger = useCallback(
      (message) =>
        setAppModal({
          isOpen: true,
          type: "danger",
          title: "Error",
          message: String(message),
          confirmText: "Entendido",
        }),
      []
    );

    const getPaidTotalInMxn = useCallback(() => {
      if (isZeroTotalSale) return 0;
      switch (selectedPaymentMethod) {
        case "Efectivo":
          return toNumber(paidAmount);
        case "Dolares":
          return toNumber(dollarAmount) * numericExchangeRate;
        case "Mixto":
          return (
            toNumber(mixedPayments.efectivo) +
            toNumber(mixedPayments.tarjeta) +
            toNumber(mixedPayments.dolares) * numericExchangeRate
          );
        case "Terminal":
        case "Transferencia":
          return safeTotal;
        default:
          return 0;
      }
    }, [
      isZeroTotalSale,
      selectedPaymentMethod,
      paidAmount,
      dollarAmount,
      mixedPayments,
      numericExchangeRate,
      safeTotal,
    ]);

    // Permitimos que el cambio sea negativo para mostrar "Faltante"
    const change = getPaidTotalInMxn() - safeTotal;

    // Variables dinámicas para la UI del cambio/faltante
    const formattedChange =
      change < 0 ? `-$${Math.abs(change).toFixed(2)}` : `$${change.toFixed(2)}`;
    const changeLabel =
      change < 0
        ? "Faltante:"
        : ["Dolares", "Mixto"].includes(selectedPaymentMethod)
          ? "Su Cambio (MXN):"
          : "Su Cambio:";

    // En Mixto el cajón solo debe abrirse si entra dinero fisico; un cobro
    // 100% con tarjeta no lo dispara bajo la politica `cash_only`.
    const hasPhysicalCash =
      selectedPaymentMethod === "Efectivo" ||
      selectedPaymentMethod === "Dolares" ||
      (selectedPaymentMethod === "Mixto" &&
        (toNumber(mixedPayments.efectivo) > 0 ||
          toNumber(mixedPayments.dolares) > 0));

    const resetModalState = useCallback(() => {
      const cashOps = getCashOperationSettings();
      setPaidAmount("");
      setDollarAmount("");
      setExchangeRate(
        cashOps.defaultExchangeRate
          ? String(cashOps.defaultExchangeRate)
          : "18.50"
      );
      setCashOpSettings(cashOps);
      setMixedPayments({ efectivo: "", tarjeta: "", dolares: "" });
      setTrackingCode("");
      setSaleNotes("");
      setSelectedPaymentMethod("Efectivo");
      setNotesModalOpen(false);
      setProcessing(false);
      closeAppModal();
    }, [closeAppModal]);

    const closePaymentModal = useCallback(() => {
      if (!effectiveProcessing) {
        resetModalState();
        onClose();
      }
    }, [effectiveProcessing, resetModalState, onClose]);

    const processPayment = useCallback(
      async (shouldPrint = false) => {
        if (effectiveProcessing) return;

        if (!isZeroTotalSale) {
          const paidTotalMxn = getPaidTotalInMxn();
          if (
            ["Dolares", "Mixto"].includes(selectedPaymentMethod) &&
            numericExchangeRate <= 0
          )
            return showAppWarning("Ingresa un tipo de cambio válido.");
          if (selectedPaymentMethod === "Efectivo" && toNumber(paidAmount) <= 0)
            return showAppWarning("Ingrese el monto pagado en efectivo.");
          if (
            selectedPaymentMethod === "Dolares" &&
            toNumber(dollarAmount) <= 0
          )
            return showAppWarning("Ingrese el monto pagado en dólares.");
          if (
            selectedPaymentMethod === "Mixto" &&
            !toNumber(mixedPayments.efectivo) &&
            !toNumber(mixedPayments.tarjeta) &&
            !toNumber(mixedPayments.dolares)
          )
            return showAppWarning(
              "Ingrese al menos un monto en el pago mixto."
            );
          if (
            ["Efectivo", "Dolares", "Mixto"].includes(selectedPaymentMethod) &&
            paidTotalMxn < safeTotal
          )
            return showAppWarning(
              `El monto pagado no cubre el total de la venta.`
            );
          if (selectedPaymentMethod === "Transferencia" && !trackingCode.trim())
            return showAppWarning("Ingrese la referencia o clave de rastreo.");
        }

        const paymentData = isZeroTotalSale
          ? {
              method: "Terminal",
              total: 0,
              change: 0,
              shouldPrint,
              notes: saleNotes,
              isZeroTotalSale: true,
              isRewardRedemptionOnly: true,
              details: { paidAmount: 0, zeroTotalReason: "reward_redemption" },
            }
          : {
              method: selectedPaymentMethod,
              total: safeTotal,
              change: Math.max(0, change), // Evitamos que un faltante negativo se guarde en la BD accidentalmente
              shouldPrint,
              notes: saleNotes,
              isZeroTotalSale: false,
              isRewardRedemptionOnly: false,
              details:
                selectedPaymentMethod === "Efectivo"
                  ? { paidAmount: toNumber(paidAmount) }
                  : selectedPaymentMethod === "Dolares"
                    ? {
                        dollarAmount: toNumber(dollarAmount),
                        exchangeRate: numericExchangeRate,
                        equivalentMXN:
                          toNumber(dollarAmount) * numericExchangeRate,
                      }
                    : selectedPaymentMethod === "Mixto"
                      ? {
                          efectivo: toNumber(mixedPayments.efectivo),
                          tarjeta: toNumber(mixedPayments.tarjeta),
                          dolares: toNumber(mixedPayments.dolares),
                          exchangeRate: numericExchangeRate,
                        }
                      : selectedPaymentMethod === "Transferencia"
                        ? { trackingCode: trackingCode.trim() }
                        : {},
            };

        try {
          setProcessing(true);
          if (onProcessPayment ? await onProcessPayment(paymentData) : true) {
            try {
              const settings = cashOpSettings || getCashOperationSettings();
              const enabled = settings.cashDrawerEnabled;
              const trigger = settings.cashDrawerTrigger || "cash_only";
              let shouldTrigger = false;
              if (enabled) {
                if (trigger === "all_sales") {
                  shouldTrigger = true;
                } else if (trigger === "cash_only") {
                  shouldTrigger = hasPhysicalCash;
                }
              }
              if (shouldTrigger) {
                triggerCashDrawerKick().catch(() => {});
              }
            } catch (error) {
              console.error("Error al disparar apertura de cajon:", error);
            }
            resetModalState();
            onClose();
          }
        } catch (error) {
          showAppDanger("Ocurrió un error al procesar el pago.");
        } finally {
          setProcessing(false);
        }
      },
      [
        effectiveProcessing,
        isZeroTotalSale,
        getPaidTotalInMxn,
        selectedPaymentMethod,
        numericExchangeRate,
        paidAmount,
        dollarAmount,
        mixedPayments,
        hasPhysicalCash,
        safeTotal,
        trackingCode,
        change,
        saleNotes,
        onProcessPayment,
        resetModalState,
        onClose,
        showAppWarning,
        showAppDanger,
      ]
    );

    // Segun la preferencia de impresion guardada en Configuracion, el cobro con
    // impresion puede pedir una confirmacion previa antes de enviar el ticket.
    // Se lee en el momento del cobro para reflejar cambios hechos en Settings.
    const startPaymentWithPrint = useCallback(() => {
      if (getPrintMode() !== PRINT_MODE_CONFIRM) {
        processPayment(true);
        return;
      }

      setAppModal({
        isOpen: true,
        type: "info",
        title: "Confirmar impresión",
        message: "¿Cobrar la venta e imprimir el ticket?",
        confirmText: "Cobrar e imprimir",
        cancelText: "Cancelar",
        showCancel: true,
        onConfirmAction: () => processPayment(true),
      });
    }, [processPayment]);

    useEffect(() => {
      if (!isOpen) return;
      const handleKeyDown = (e) => {
        if (appModal.isOpen || isNotesModalOpen || effectiveProcessing) return;
        const stop = () => {
          e.preventDefault();
          e.stopPropagation();
        };
        if (e.key === "Escape") {
          stop();
          closePaymentModal();
        } else if (e.key === "F4") {
          stop();
          setNotesModalOpen(true);
        } else if (e.key === "F1") {
          stop();
          startPaymentWithPrint();
        } else if (e.key === "F2") {
          stop();
          processPayment(false);
        }
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }, [
      isOpen,
      appModal.isOpen,
      isNotesModalOpen,
      effectiveProcessing,
      closePaymentModal,
      processPayment,
      startPaymentWithPrint,
    ]);

    useEffect(() => {
      if (!isOpen) resetModalState();
    }, [isOpen, resetModalState]);

    // Refresca la configuracion de caja en cada apertura para reflejar de
    // inmediato cualquier cambio hecho en SettingsCash.
    useEffect(() => {
      if (isOpen) {
        const freshOps = getCashOperationSettings();
        setCashOpSettings(freshOps);
        setExchangeRate(
          freshOps.defaultExchangeRate
            ? String(freshOps.defaultExchangeRate)
            : "18.50"
        );
      }
    }, [isOpen]);

    // EFECTO DE AUTORELLENADO DE PAGO
    useEffect(() => {
      if (!isOpen) return;
      if (isZeroTotalSale) {
        setSelectedPaymentMethod("Terminal");
        setPaidAmount("");
        setDollarAmount("");
        setMixedPayments({ efectivo: "", tarjeta: "", dolares: "" });
        setTrackingCode("");
      } else {
        setSelectedPaymentMethod("Efectivo");
        setPaidAmount(safeTotal > 0 ? safeTotal.toString() : ""); // Rellenamos el input con el total de la venta
      }
    }, [isOpen, isZeroTotalSale, safeTotal]);

    const onDecimalInput = (setter) => (e) => {
      const val = e.target.value;
      if (/^\d*\.?\d*$/.test(val) && val.split(".").length - 1 <= 1)
        setter(val === "." ? "0." : val);
    };
    const onMixedInput = (key) => (e) => {
      const val = e.target.value;
      if (/^\d*\.?\d*$/.test(val) && val.split(".").length - 1 <= 1)
        setMixedPayments((p) => ({ ...p, [key]: val === "." ? "0." : val }));
    };

    if (!isOpen) return null;

    return (
      <div className={styles.modalOverlay} onClick={closePaymentModal}>
        <div
          className={styles.paymentModal}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.modalHeader}>
            <h2>{isZeroTotalSale ? "FINALIZAR CANJE" : "COBRAR"}</h2>
            <button
              type="button"
              className={styles.closeButton}
              onClick={closePaymentModal}
              disabled={effectiveProcessing}
              aria-label="Cerrar modal"
            >
              <img
                src={XmarkIcon}
                alt=""
                className={styles.closeIcon}
                aria-hidden="true"
              />
            </button>
          </div>

          <div className={styles.totalDisplay}>${safeTotal.toFixed(2)}</div>

          {!isZeroTotalSale && (
            <div className={styles.paymentMethods}>
              {PAYMENT_METHODS.filter(
                (m) =>
                  !(
                    m.id === "Dolares" &&
                    cashOpSettings.acceptUsdPayments === false
                  )
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`${styles.paymentMethod} ${selectedPaymentMethod === m.id ? styles.paymentMethodSelected : ""}`}
                  onClick={() =>
                    !effectiveProcessing && setSelectedPaymentMethod(m.id)
                  }
                  disabled={effectiveProcessing}
                >
                  <img
                    src={m.icon}
                    alt=""
                    className={styles.methodIcon}
                    aria-hidden="true"
                  />
                  <div className={styles.methodName}>{m.name}</div>
                </button>
              ))}
            </div>
          )}

          <div className={styles.paymentInfo}>
            {isZeroTotalSale ? (
              <div className={styles.terminalSection}>
                <div className={styles.paymentRow}>
                  <span>Tipo de operación:</span>
                  <span className={styles.totalAmount}>
                    Canje de recompensa
                  </span>
                </div>
                <div className={styles.paymentRow}>
                  <span>Total a cobrar:</span>
                  <span className={styles.totalAmount}>$0.00</span>
                </div>
                <div className={styles.paymentRow}>
                  <span>Pago requerido:</span>
                  <span className={styles.changeAmount}>
                    No se requiere pago
                  </span>
                </div>
              </div>
            ) : selectedPaymentMethod === "Efectivo" ? (
              <>
                <div className={styles.paymentRow}>
                  <label htmlFor="payment-cash-amount">Pagó Con:</label>
                  <div className={styles.inputWithSymbol}>
                    <span className={styles.currencySymbol}>$</span>
                    <input
                      id="payment-cash-amount"
                      type="text"
                      className={styles.paymentInput}
                      value={paidAmount}
                      onChange={onDecimalInput(setPaidAmount)}
                      placeholder="0.00"
                      autoFocus
                      disabled={effectiveProcessing}
                    />
                  </div>
                </div>
                <div className={styles.paymentRow}>
                  <span>{changeLabel}</span>
                  <span className={styles.changeAmount}>{formattedChange}</span>
                </div>
              </>
            ) : selectedPaymentMethod === "Dolares" ? (
              <>
                {cashOpSettings.acceptUsdPayments !== false ? (
                  <div className={styles.paymentRow}>
                    <span>Tipo de cambio:</span>
                    <span className={styles.exchangeRateBadge}>
                      ${numericExchangeRate.toFixed(2)} MXN
                    </span>
                  </div>
                ) : null}
                <div className={styles.paymentRow}>
                  <label htmlFor="payment-usd-amount">Pagó Con (USD):</label>
                  <div className={styles.inputWithSymbol}>
                    <span className={styles.currencySymbol}>$</span>
                    <input
                      id="payment-usd-amount"
                      type="text"
                      className={styles.paymentInput}
                      value={dollarAmount}
                      onChange={onDecimalInput(setDollarAmount)}
                      placeholder="0.00"
                      autoFocus
                      disabled={effectiveProcessing}
                    />
                  </div>
                </div>
                <div className={styles.paymentRow}>
                  <span>Equivalente en MXN:</span>
                  <span className={styles.equivalentAmount}>
                    ${(toNumber(dollarAmount) * numericExchangeRate).toFixed(2)}
                  </span>
                </div>
                <div className={styles.paymentRow}>
                  <span>{changeLabel}</span>
                  <span className={styles.changeAmount}>{formattedChange}</span>
                </div>
              </>
            ) : selectedPaymentMethod === "Mixto" ? (
              <div className={styles.mixedPaymentSection}>
                <h3>Desglose de Pago</h3>
                <div className={styles.paymentRow}>
                  <label htmlFor="payment-mixed-cash">Efectivo:</label>
                  <div className={styles.inputWithSymbol}>
                    <span className={styles.currencySymbol}>$</span>
                    <input
                      id="payment-mixed-cash"
                      type="text"
                      className={styles.paymentInput}
                      value={mixedPayments.efectivo}
                      onChange={onMixedInput("efectivo")}
                      placeholder="0.00"
                      autoFocus
                      disabled={effectiveProcessing}
                    />
                  </div>
                </div>
                <div className={styles.paymentRow}>
                  <label htmlFor="payment-mixed-card">Tarjeta:</label>
                  <div className={styles.inputWithSymbol}>
                    <span className={styles.currencySymbol}>$</span>
                    <input
                      id="payment-mixed-card"
                      type="text"
                      className={styles.paymentInput}
                      value={mixedPayments.tarjeta}
                      onChange={onMixedInput("tarjeta")}
                      placeholder="0.00"
                      disabled={effectiveProcessing}
                    />
                  </div>
                </div>
                {cashOpSettings.acceptUsdPayments !== false ? (
                  <>
                    <div className={styles.paymentRow}>
                      <label htmlFor="payment-mixed-usd">Dólares (USD):</label>
                      <div className={styles.inputWithSymbol}>
                        <span className={styles.currencySymbol}>$</span>
                        <input
                          id="payment-mixed-usd"
                          type="text"
                          className={styles.paymentInput}
                          value={mixedPayments.dolares}
                          onChange={onMixedInput("dolares")}
                          placeholder="0.00"
                          disabled={effectiveProcessing}
                        />
                      </div>
                    </div>
                    <p className={styles.exchangeRateHint}>
                      (T.C. ${numericExchangeRate.toFixed(2)} MXN)
                    </p>
                  </>
                ) : null}
                <div className={styles.totalMixedRow}>
                  <span>Total Pagado:</span>
                  <span className={styles.totalMixedAmount}>
                    ${getPaidTotalInMxn().toFixed(2)}
                  </span>
                </div>
                <div className={styles.paymentRow}>
                  <span>{changeLabel}</span>
                  <span className={styles.changeAmount}>{formattedChange}</span>
                </div>
              </div>
            ) : selectedPaymentMethod === "Terminal" ? (
              <div className={styles.terminalSection}>
                <div className={styles.paymentRow}>
                  <span>Total a Cobrar:</span>
                  <span className={styles.totalAmount}>
                    ${safeTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            ) : selectedPaymentMethod === "Transferencia" ? (
              <div className={styles.transferSection}>
                <div className={styles.paymentRow}>
                  <label htmlFor="payment-tracking-code">
                    Información de Transferencia:
                  </label>
                  <input
                    id="payment-tracking-code"
                    type="text"
                    className={styles.trackingInput}
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value)}
                    placeholder="Clave de rastreo, referencia, etc."
                    aria-describedby="payment-tracking-hint"
                    disabled={effectiveProcessing}
                  />
                </div>
                <p id="payment-tracking-hint" className={styles.trackingHint}>
                  Se guardará como referencia de la transferencia.
                </p>
                <div className={styles.paymentRow}>
                  <span>Total a Cobrar:</span>
                  <span className={styles.totalAmount}>
                    ${safeTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.modalActionBtn}
              onClick={startPaymentWithPrint}
              disabled={effectiveProcessing}
            >
              {effectiveProcessing
                ? "Procesando..."
                : isZeroTotalSale
                  ? "F1 - Finalizar canje e imprimir"
                  : "F1 - Cobrar e Imprimir"}
            </button>
            <button
              type="button"
              className={styles.modalActionBtn}
              onClick={() => processPayment(false)}
              disabled={effectiveProcessing}
            >
              {effectiveProcessing
                ? "Procesando..."
                : isZeroTotalSale
                  ? "F2 - Finalizar canje sin imprimir"
                  : "F2 - Cobrar sin imprimir"}
            </button>
            <button
              type="button"
              className={styles.modalActionBtn}
              onClick={closePaymentModal}
              disabled={effectiveProcessing}
            >
              {effectiveProcessing ? "Procesando..." : "ESC - Cancelar"}
            </button>
            <button
              type="button"
              className={styles.modalActionBtn}
              onClick={() => setNotesModalOpen(true)}
              disabled={effectiveProcessing}
            >
              {effectiveProcessing ? "Procesando..." : "F4 - Ingresar notas"}
            </button>
          </div>
        </div>

        <NotesModal
          isOpen={isNotesModalOpen}
          onClose={() => setNotesModalOpen(false)}
          onSave={setSaleNotes}
          initialNotes={saleNotes}
        />
        <AppModal
          isOpen={appModal.isOpen}
          type={appModal.type}
          title={appModal.title}
          message={appModal.message}
          confirmText={appModal.confirmText}
          cancelText={appModal.cancelText || "Cancelar"}
          showCancel={Boolean(appModal.showCancel)}
          onClose={closeAppModal}
          onConfirm={() => {
            const action = appModal.onConfirmAction;
            closeAppModal();
            if (typeof action === "function") action();
          }}
          onCancel={closeAppModal}
        />
      </div>
    );
  }
);

export default PaymentModal;
