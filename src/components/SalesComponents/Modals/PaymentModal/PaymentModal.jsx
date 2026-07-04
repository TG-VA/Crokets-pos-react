import React, { useState, useEffect } from "react";
import styles from "./PaymentModal.module.css";
import NotesModal from "../NotesModal/NotesModal";
import AppModal from "../../../AppModal/AppModal";

import CashIcon from "../../../../assets/icons/money-bill-wave-solid-full.svg";
import DollarsIcon from "../../../../assets/icons/dollar-sign-solid-full.svg";
import MixedIcon from "../../../../assets/icons/coins-solid-full.svg";
import TerminalIcon from "../../../../assets/icons/credit-card-solid-full.svg";
import TransferIcon from "../../../../assets/icons/building-columns-solid-full.svg";
import XmarkIcon from "../../../../assets/icons/xmark-solid-full.svg";

const PaymentModal = ({
  isOpen,
  onClose,
  total,
  onProcessPayment,
  processingSale,
}) => {
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState("Efectivo");
  const [paidAmount, setPaidAmount] = useState("");
  const [dollarAmount, setDollarAmount] = useState("");
  const [exchangeRate, setExchangeRate] = useState("18.50");
  const [mixedPayments, setMixedPayments] = useState({
    efectivo: "",
    tarjeta: "",
    dolares: "",
  });
  const [trackingCode, setTrackingCode] = useState("");
  const [isNotesModalOpen, setNotesModalOpen] = useState(false);
  const [saleNotes, setSaleNotes] = useState("");
  const [processing, setProcessing] = useState(false);
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

  const toNumber = (value) => {
    if (!value || String(value).trim() === "") return 0;
    const num = parseFloat(value);
    return Number.isNaN(num) ? 0 : num;
  };

  const closeAppModal = () => {
    setAppModal((prev) => ({
      ...prev,
      isOpen: false,
    }));
  };

  const showAppModal = ({
    type = "warning",
    title = "Aviso",
    message = "",
    confirmText = "Entendido",
  }) => {
    setAppModal({
      isOpen: true,
      type,
      title,
      message: String(message || ""),
      confirmText,
    });
  };

  const showAppWarning = (message, title = "Aviso") => {
    showAppModal({
      type: "warning",
      title,
      message,
      confirmText: "Entendido",
    });
  };

  const showAppDanger = (message, title = "Error") => {
    showAppModal({
      type: "danger",
      title,
      message,
      confirmText: "Entendido",
    });
  };

  const numericExchangeRate = toNumber(exchangeRate);

  const calculateChange = () => {
    if (isZeroTotalSale) return 0;

    const numericPaidAmount = toNumber(paidAmount);
    const numericDollarAmount = toNumber(dollarAmount);
    const numericEfectivo = toNumber(mixedPayments.efectivo);
    const numericTarjeta = toNumber(mixedPayments.tarjeta);
    const numericDolares = toNumber(mixedPayments.dolares);

    switch (selectedPaymentMethod) {
      case "Efectivo":
        return Math.max(0, numericPaidAmount - safeTotal);

      case "Dolares":
        return Math.max(
          0,
          numericDollarAmount * numericExchangeRate - safeTotal
        );

      case "Mixto": {
        const totalMixed =
          numericEfectivo +
          numericTarjeta +
          numericDolares * numericExchangeRate;
        return Math.max(0, totalMixed - safeTotal);
      }

      default:
        return 0;
    }
  };

  const getPaidTotalInMxn = () => {
    if (isZeroTotalSale) return 0;

    const numericPaidAmount = toNumber(paidAmount);
    const numericDollarAmount = toNumber(dollarAmount);
    const numericEfectivo = toNumber(mixedPayments.efectivo);
    const numericTarjeta = toNumber(mixedPayments.tarjeta);
    const numericDolares = toNumber(mixedPayments.dolares);

    switch (selectedPaymentMethod) {
      case "Efectivo":
        return numericPaidAmount;

      case "Dolares":
        return numericDollarAmount * numericExchangeRate;

      case "Mixto":
        return (
          numericEfectivo +
          numericTarjeta +
          numericDolares * numericExchangeRate
        );

      case "Terminal":
      case "Transferencia":
        return safeTotal;

      default:
        return 0;
    }
  };

  const change = calculateChange();

  const paymentMethods = [
    {
      id: "Efectivo",
      name: "Efectivo",
      icon: CashIcon,
    },
    {
      id: "Dolares",
      name: "Dólares",
      icon: DollarsIcon,
    },
    {
      id: "Mixto",
      name: "Mixto",
      icon: MixedIcon,
    },
    {
      id: "Terminal",
      name: "Terminal",
      icon: TerminalIcon,
    },
    {
      id: "Transferencia",
      name: "Transferencia",
      icon: TransferIcon,
    },
  ];

  const resetModalState = () => {
    setPaidAmount("");
    setDollarAmount("");
    setExchangeRate("18.50");
    setMixedPayments({ efectivo: "", tarjeta: "", dolares: "" });
    setTrackingCode("");
    setSaleNotes("");
    setSelectedPaymentMethod("Efectivo");
    setNotesModalOpen(false);
    setProcessing(false);
    closeAppModal();
  };

  const closePaymentModal = () => {
    if (effectiveProcessing) return;
    resetModalState();
    onClose();
  };

  const openNotesModal = () => {
    if (effectiveProcessing) return;
    setNotesModalOpen(true);
  };

  const closeNotesModal = () => {
    if (effectiveProcessing) return;
    setNotesModalOpen(false);
  };

  const handleSaveNotes = (notes) => {
    setSaleNotes(notes);
    console.log("Notas de venta guardadas:", notes);
  };

  const validatePayment = () => {
    if (isZeroTotalSale) {
      return true;
    }

    const paidTotalMxn = getPaidTotalInMxn();

    if (
      (selectedPaymentMethod === "Dolares" ||
        selectedPaymentMethod === "Mixto") &&
      numericExchangeRate <= 0
    ) {
      showAppWarning("Ingresa un tipo de cambio válido.");
      return false;
    }

    switch (selectedPaymentMethod) {
      case "Efectivo":
        if (toNumber(paidAmount) <= 0) {
          showAppWarning("Ingrese el monto pagado en efectivo.");
          return false;
        }

        if (paidTotalMxn < safeTotal) {
          showAppWarning("El monto en efectivo no cubre el total de la venta.");
          return false;
        }

        return true;

      case "Dolares":
        if (toNumber(dollarAmount) <= 0) {
          showAppWarning("Ingrese el monto pagado en dólares.");
          return false;
        }

        if (paidTotalMxn < safeTotal) {
          showAppWarning("El monto en dólares no cubre el total de la venta.");
          return false;
        }

        return true;

      case "Mixto": {
        const efectivo = toNumber(mixedPayments.efectivo);
        const tarjeta = toNumber(mixedPayments.tarjeta);
        const dolares = toNumber(mixedPayments.dolares);

        if (efectivo <= 0 && tarjeta <= 0 && dolares <= 0) {
          showAppWarning("Ingrese al menos un monto en el pago mixto.");
          return false;
        }

        if (paidTotalMxn < safeTotal) {
          showAppWarning(
            "La suma del pago mixto no cubre el total de la venta."
          );
          return false;
        }

        return true;
      }

      case "Transferencia":
        if (!trackingCode.trim()) {
          showAppWarning("Ingrese la referencia o clave de rastreo.");
          return false;
        }

        return true;

      case "Terminal":
        return true;

      default:
        showAppWarning("Seleccione un método de pago válido.");
        return false;
    }
  };

  const buildPaymentData = (shouldPrint = false) => {
    if (isZeroTotalSale) {
      return {
        method: "Terminal",
        total: 0,
        change: 0,
        shouldPrint,
        notes: saleNotes,
        isZeroTotalSale: true,
        isRewardRedemptionOnly: true,
        details: {
          paidAmount: 0,
          zeroTotalReason: "reward_redemption",
        },
      };
    }

    const baseData = {
      method: selectedPaymentMethod,
      total: safeTotal,
      change,
      shouldPrint,
      notes: saleNotes,
      isZeroTotalSale: false,
      isRewardRedemptionOnly: false,
      details: {},
    };

    switch (selectedPaymentMethod) {
      case "Efectivo":
        return {
          ...baseData,
          method: "Efectivo",
          details: {
            paidAmount: toNumber(paidAmount),
          },
        };

      case "Dolares":
        return {
          ...baseData,
          method: "Dolares",
          details: {
            dollarAmount: toNumber(dollarAmount),
            exchangeRate: numericExchangeRate,
            equivalentMXN: toNumber(dollarAmount) * numericExchangeRate,
          },
        };

      case "Mixto":
        return {
          ...baseData,
          method: "Mixto",
          details: {
            efectivo: toNumber(mixedPayments.efectivo),
            tarjeta: toNumber(mixedPayments.tarjeta),
            dolares: toNumber(mixedPayments.dolares),
            exchangeRate: numericExchangeRate,
          },
        };

      case "Transferencia":
        return {
          ...baseData,
          method: "Transferencia",
          details: {
            trackingCode: trackingCode.trim(),
          },
        };

      case "Terminal":
      default:
        return {
          ...baseData,
          method: "Terminal",
          details: {},
        };
    }
  };

  const processPayment = async (shouldPrint = false) => {
    if (effectiveProcessing) return;

    const isValid = validatePayment();
    if (!isValid) return;

    const paymentData = buildPaymentData(shouldPrint);

    console.log("selectedPaymentMethod:", selectedPaymentMethod);
    console.log("paymentData construido en PaymentModal:", paymentData);

    try {
      setProcessing(true);

      let success = true;

      if (onProcessPayment) {
        success = await onProcessPayment(paymentData);
      }

      if (success) {
        resetModalState();
        onClose();
      }
    } catch (error) {
      console.error("Error procesando pago:", error);
      showAppDanger(
        "Ocurrió un error al procesar el pago.",
        "No se pudo procesar el pago"
      );
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen || appModal.isOpen) return;

      if (e.key === "Escape") {
        if (!isNotesModalOpen && !effectiveProcessing) {
          e.preventDefault();
          e.stopPropagation();
          closePaymentModal();
        }
      } else if (e.key === "F4" && !isNotesModalOpen && !effectiveProcessing) {
        e.preventDefault();
        e.stopPropagation();
        openNotesModal();
      } else if (e.key === "F1" && !isNotesModalOpen && !effectiveProcessing) {
        e.preventDefault();
        e.stopPropagation();
        processPayment(true);
      } else if (e.key === "F2" && !isNotesModalOpen && !effectiveProcessing) {
        e.preventDefault();
        e.stopPropagation();
        processPayment(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    isOpen,
    isNotesModalOpen,
    effectiveProcessing,
    selectedPaymentMethod,
    mixedPayments,
    paidAmount,
    dollarAmount,
    exchangeRate,
    saleNotes,
    safeTotal,
    change,
    isZeroTotalSale,
    appModal.isOpen,
  ]);

  useEffect(() => {
    if (!isOpen) {
      resetModalState();
    }
  }, [isOpen]);

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
    }
  }, [isOpen, isZeroTotalSale]);

  const renderExchangeRateInput = () => {
    if (
      selectedPaymentMethod !== "Dolares" &&
      selectedPaymentMethod !== "Mixto"
    ) {
      return null;
    }

    return (
      <div className={styles.paymentRow}>
        <span>Tipo de cambio:</span>
        <div className={styles.inputWithSymbol}>
          <span className={styles.currencySymbol}>$</span>
          <input
            type="text"
            className={styles.paymentInput}
            value={exchangeRate}
            onChange={(e) => {
              const val = e.target.value;
              if (/^\d*\.?\d*$/.test(val) && val.split(".").length - 1 <= 1) {
                setExchangeRate(val === "." ? "0." : val);
              }
            }}
            placeholder="0.00"
            disabled={effectiveProcessing}
          />
        </div>
      </div>
    );
  };

  const renderZeroTotalContent = () => {
    return (
      <div className={styles.paymentInfo}>
        <div className={styles.terminalSection}>
          <div className={styles.paymentRow}>
            <span>Tipo de operación:</span>
            <span className={styles.totalAmount}>Canje de recompensa</span>
          </div>

          <div className={styles.paymentRow}>
            <span>Total a cobrar:</span>
            <span className={styles.totalAmount}>$0.00</span>
          </div>

          <div className={styles.paymentRow}>
            <span>Pago requerido:</span>
            <span className={styles.changeAmount}>No se requiere pago</span>
          </div>
        </div>
      </div>
    );
  };

  const renderPaymentContent = () => {
    if (isZeroTotalSale) {
      return renderZeroTotalContent();
    }

    switch (selectedPaymentMethod) {
      case "Efectivo":
        return (
          <div className={styles.paymentInfo}>
            <div className={styles.paymentRow}>
              <span>Pagó Con:</span>
              <div className={styles.inputWithSymbol}>
                <span className={styles.currencySymbol}>$</span>
                <input
                  type="text"
                  className={styles.paymentInput}
                  value={paidAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (
                      /^\d*\.?\d*$/.test(val) &&
                      val.split(".").length - 1 <= 1
                    ) {
                      setPaidAmount(val === "." ? "0." : val);
                    }
                  }}
                  placeholder="0.00"
                  autoFocus
                  disabled={effectiveProcessing}
                />
              </div>
            </div>

            <div className={styles.paymentRow}>
              <span>Su Cambio:</span>
              <span className={styles.changeAmount}>${change.toFixed(2)}</span>
            </div>
          </div>
        );

      case "Dolares":
        return (
          <div className={styles.paymentInfo}>
            {renderExchangeRateInput()}

            <div className={styles.paymentRow}>
              <span>Pagó Con (USD):</span>
              <div className={styles.inputWithSymbol}>
                <span className={styles.currencySymbol}>$</span>
                <input
                  type="text"
                  className={styles.paymentInput}
                  value={dollarAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (
                      /^\d*\.?\d*$/.test(val) &&
                      val.split(".").length - 1 <= 1
                    ) {
                      setDollarAmount(val === "." ? "0." : val);
                    }
                  }}
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
              <span>Su Cambio:</span>
              <span className={styles.changeAmount}>${change.toFixed(2)}</span>
            </div>
          </div>
        );

      case "Mixto":
        return (
          <div className={styles.paymentInfo}>
            <div className={styles.mixedPaymentSection}>
              <h3>Desglose de Pago</h3>

              {renderExchangeRateInput()}

              <div className={styles.paymentRow}>
                <span>Efectivo:</span>
                <div className={styles.inputWithSymbol}>
                  <span className={styles.currencySymbol}>$</span>
                  <input
                    type="text"
                    className={styles.paymentInput}
                    value={mixedPayments.efectivo}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (
                        /^\d*\.?\d*$/.test(val) &&
                        val.split(".").length - 1 <= 1
                      ) {
                        setMixedPayments((prev) => ({
                          ...prev,
                          efectivo: val === "." ? "0." : val,
                        }));
                      }
                    }}
                    placeholder="0.00"
                    autoFocus
                    disabled={effectiveProcessing}
                  />
                </div>
              </div>

              <div className={styles.paymentRow}>
                <span>Tarjeta:</span>
                <div className={styles.inputWithSymbol}>
                  <span className={styles.currencySymbol}>$</span>
                  <input
                    type="text"
                    className={styles.paymentInput}
                    value={mixedPayments.tarjeta}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (
                        /^\d*\.?\d*$/.test(val) &&
                        val.split(".").length - 1 <= 1
                      ) {
                        setMixedPayments((prev) => ({
                          ...prev,
                          tarjeta: val === "." ? "0." : val,
                        }));
                      }
                    }}
                    placeholder="0.00"
                    disabled={effectiveProcessing}
                  />
                </div>
              </div>

              <div className={styles.paymentRow}>
                <span>Dólares (USD):</span>
                <div className={styles.inputWithSymbol}>
                  <span className={styles.currencySymbol}>$</span>
                  <input
                    type="text"
                    className={styles.paymentInput}
                    value={mixedPayments.dolares}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (
                        /^\d*\.?\d*$/.test(val) &&
                        val.split(".").length - 1 <= 1
                      ) {
                        setMixedPayments((prev) => ({
                          ...prev,
                          dolares: val === "." ? "0." : val,
                        }));
                      }
                    }}
                    placeholder="0.00"
                    disabled={effectiveProcessing}
                  />
                </div>
              </div>

              <div className={styles.totalMixedRow}>
                <span>Total Pagado:</span>
                <span className={styles.totalMixedAmount}>
                  $
                  {(
                    toNumber(mixedPayments.efectivo) +
                    toNumber(mixedPayments.tarjeta) +
                    toNumber(mixedPayments.dolares) * numericExchangeRate
                  ).toFixed(2)}
                </span>
              </div>

              <div className={styles.paymentRow}>
                <span>Su Cambio:</span>
                <span className={styles.changeAmount}>${change.toFixed(2)}</span>
              </div>
            </div>
          </div>
        );

      case "Terminal":
        return (
          <div className={styles.paymentInfo}>
            <div className={styles.terminalSection}>
              <div className={styles.paymentRow}>
                <span>Total a Cobrar:</span>
                <span className={styles.totalAmount}>${safeTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        );

      case "Transferencia":
        return (
          <div className={styles.paymentInfo}>
            <div className={styles.transferSection}>
              <div className={styles.paymentRow}>
                <span>Información de Transferencia:</span>
                <input
                  type="text"
                  className={styles.trackingInput}
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  placeholder="Clave de rastreo, referencia, etc."
                  disabled={effectiveProcessing}
                />
              </div>

              <div className={styles.paymentRow}>
                <span>Total a Cobrar:</span>
                <span className={styles.totalAmount}>${safeTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={closePaymentModal}>
      <div className={styles.paymentModal} onClick={(e) => e.stopPropagation()}>
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
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                type="button"
                className={`${styles.paymentMethod} ${
                  selectedPaymentMethod === method.id
                    ? styles.paymentMethodSelected
                    : ""
                }`}
                onClick={() => {
                  if (!effectiveProcessing) {
                    console.log("Método seleccionado:", method.id);
                    setSelectedPaymentMethod(method.id);
                  }
                }}
                disabled={effectiveProcessing}
              >
                <img
                  src={method.icon}
                  alt=""
                  className={styles.methodIcon}
                  aria-hidden="true"
                />

                <div className={styles.methodName}>{method.name}</div>
              </button>
            ))}
          </div>
        )}

        {renderPaymentContent()}

        <div className={styles.modalActions}>
          <button
            type="button"
            className={styles.modalActionBtn}
            onClick={() => processPayment(true)}
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
            onClick={openNotesModal}
            disabled={effectiveProcessing}
          >
            {effectiveProcessing ? "Procesando..." : "F4 - Ingresar notas"}
          </button>
        </div>
      </div>

      <NotesModal
        isOpen={isNotesModalOpen}
        onClose={closeNotesModal}
        onSave={handleSaveNotes}
        initialNotes={saleNotes}
      />

      <AppModal
        isOpen={appModal.isOpen}
        type={appModal.type}
        title={appModal.title}
        message={appModal.message}
        confirmText={appModal.confirmText}
        onClose={closeAppModal}
        onConfirm={closeAppModal}
      />
    </div>
  );
};

export default PaymentModal;