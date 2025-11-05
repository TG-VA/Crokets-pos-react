import React, { useState, useEffect } from "react";
import styles from "./PaymentModal.module.css";
import NotesModal from "../NotesModal/NotesModal";

const PaymentModal = ({ isOpen, onClose, total = 207.0, onProcessPayment }) => {
  // Estados para diferentes métodos de pago
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("Terminal");
  const [paidAmount, setPaidAmount] = useState("");
  const [dollarAmount, setDollarAmount] = useState("");
  const [exchangeRate] = useState(18.5); // Tipo de cambio fijo
  const [mixedPayments, setMixedPayments] = useState({
    efectivo: "",
    tarjeta: "",
    dolares: "",
  });
  const [trackingCode, setTrackingCode] = useState("");

  // Estados para modal de notas
  const [isNotesModalOpen, setNotesModalOpen] = useState(false);
  const [saleNotes, setSaleNotes] = useState("");

  // Función para convertir valores a número, manejando NaN y valores vacíos
  const toNumber = (value) => {
    if (!value || value.trim() === "") return 0;
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  // Calcular cambio según método de pago
  const calculateChange = () => {
    const numericPaidAmount = toNumber(paidAmount);
    const numericDollarAmount = toNumber(dollarAmount);
    const numericEfectivo = toNumber(mixedPayments.efectivo);
    const numericTarjeta = toNumber(mixedPayments.tarjeta);
    const numericDolares = toNumber(mixedPayments.dolares);

    switch (selectedPaymentMethod) {
      case "Efectivo":
        return Math.max(0, numericPaidAmount - total);
      case "Dolares":
        return Math.max(0, numericDollarAmount * exchangeRate - total);
      case "Mixto":
        const totalMixed = numericEfectivo + numericTarjeta + (numericDolares * exchangeRate);
        return Math.max(0, totalMixed - total);
      default:
        return 0;
    }
  };

  const change = calculateChange();

  const paymentMethods = [
    { id: "Efectivo", name: "Efectivo", icon: "💰" },
    { id: "Dolares", name: "Dólares", icon: "💵" },
    { id: "Mixto", name: "Mixto", icon: "🪙" },
    { id: "Terminal", name: "Terminal", icon: "🖥️" },
    { id: "Transferencia", name: "Transferencia", icon: "🏦" },
  ];

  const closePaymentModal = () => {
    // Cerrar modal de notas si está abierto
    if (isNotesModalOpen) {
      setNotesModalOpen(false);
    }
    // Resetear todos los estados
    setPaidAmount("");
    setDollarAmount("");
    setMixedPayments({ efectivo: "", tarjeta: "", dolares: "" });
    setTrackingCode("");
    setSaleNotes("");
    setSelectedPaymentMethod("Terminal");
    onClose();
  };

  // Funciones para modal de notas
  const openNotesModal = () => {
    setNotesModalOpen(true);
  };

  const closeNotesModal = () => {
    setNotesModalOpen(false);
  };

  const handleSaveNotes = (notes) => {
    setSaleNotes(notes);
    console.log("Notas de venta guardadas:", notes);
    // Aquí podrías enviar las notas al backend o almacenarlas localmente
  };

  // useEffect para manejar teclas F4 y ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      
      if (e.key === "Escape") {
        // Solo manejar ESC si el modal de notas NO está abierto
        if (!isNotesModalOpen) {
          e.preventDefault();
          e.stopPropagation();
          closePaymentModal();
        }
        // Si el modal de notas está abierto, dejar que NotesModal maneje el ESC
      } else if (e.key === "F4" && !isNotesModalOpen) {
        e.preventDefault();
        e.stopPropagation();
        openNotesModal();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isNotesModalOpen]);

  const processPayment = () => {
    const paymentData = {
      method: selectedPaymentMethod,
      total: total,
      change: change,
      details: {}
    };

    // Agregar detalles específicos según el método de pago
    switch (selectedPaymentMethod) {
      case "Efectivo":
        paymentData.details = { paidAmount: toNumber(paidAmount) };
        break;
      case "Dolares":
        paymentData.details = { 
          dollarAmount: toNumber(dollarAmount),
          exchangeRate: exchangeRate,
          equivalentMXN: toNumber(dollarAmount) * exchangeRate
        };
        break;
      case "Mixto":
        paymentData.details = {
          efectivo: toNumber(mixedPayments.efectivo),
          tarjeta: toNumber(mixedPayments.tarjeta),
          dolares: toNumber(mixedPayments.dolares),
          exchangeRate: exchangeRate
        };
        break;
      case "Transferencia":
        paymentData.details = { trackingCode: trackingCode };
        break;
    }

    if (onProcessPayment) {
      onProcessPayment(paymentData);
    }
    
    closePaymentModal();
  };

  // Función para renderizar el contenido del método de pago
  const renderPaymentContent = () => {
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
                    if (/^\d*\.?\d*$/.test(val) && val.split(".").length - 1 <= 1) {
                      setPaidAmount(val === "." ? "0." : val);
                    }
                  }}
                  placeholder="0.00"
                  autoFocus
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
            <div className={styles.exchangeRateDisplay}>
              <span>Tipo de cambio: ${exchangeRate.toFixed(2)} MXN por USD</span>
            </div>
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
                    if (/^\d*\.?\d*$/.test(val) && val.split(".").length - 1 <= 1) {
                      setDollarAmount(val === "." ? "0." : val);
                    }
                  }}
                  placeholder="0.00"
                  autoFocus
                />
              </div>
            </div>
            <div className={styles.paymentRow}>
              <span>Equivalente en MXN:</span>
              <span className={styles.equivalentAmount}>
                ${(toNumber(dollarAmount) * exchangeRate).toFixed(2)}
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

              {/* Efectivo */}
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
                      if (/^\d*\.?\d*$/.test(val) && val.split(".").length - 1 <= 1) {
                        setMixedPayments((prev) => ({
                          ...prev,
                          efectivo: val === "." ? "0." : val,
                        }));
                      }
                    }}
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
              </div>

              {/* Tarjeta */}
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
                      if (/^\d*\.?\d*$/.test(val) && val.split(".").length - 1 <= 1) {
                        setMixedPayments((prev) => ({
                          ...prev,
                          tarjeta: val === "." ? "0." : val,
                        }));
                      }
                    }}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Dólares */}
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
                      if (/^\d*\.?\d*$/.test(val) && val.split(".").length - 1 <= 1) {
                        setMixedPayments((prev) => ({
                          ...prev,
                          dolares: val === "." ? "0." : val,
                        }));
                      }
                    }}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Total */}
              <div className={styles.totalMixedRow}>
                <span>Total Pagado:</span>
                <span className={styles.totalMixedAmount}>
                  $
                  {(
                    toNumber(mixedPayments.efectivo) +
                    toNumber(mixedPayments.tarjeta) +
                    toNumber(mixedPayments.dolares) * exchangeRate
                  ).toFixed(2)}
                </span>
              </div>

              {/* Cambio */}
              <div className={styles.paymentRow}>
                <span>Su Cambio:</span>
                <span className={styles.changeAmount}>
                  ${change.toFixed(2)}
                </span>
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
                <span className={styles.totalAmount}>${total.toFixed(2)}</span>
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
                />
              </div>
              <div className={styles.paymentRow}>
                <span>Total a Cobrar:</span>
                <span className={styles.totalAmount}>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Si el modal no está abierto, no renderizar nada
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={closePaymentModal}>
      <div className={styles.paymentModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>COBRAR</h2>
          <button className={styles.closeButton} onClick={closePaymentModal}>
            ✕
          </button>
        </div>

        <div className={styles.totalDisplay}>${total.toFixed(2)}</div>

        <div className={styles.paymentMethods}>
          {paymentMethods.map((method) => (
            <div
              key={method.id}
              className={`${styles.paymentMethod} ${
                selectedPaymentMethod === method.id
                  ? styles.paymentMethodSelected
                  : ""
              }`}
              onClick={() => setSelectedPaymentMethod(method.id)}
            >
              <div className={styles.methodIcon}>{method.icon}</div>
              <div className={styles.methodName}>{method.name}</div>
            </div>
          ))}
        </div>

        {/* Contenido dinámico según método de pago */}
        {renderPaymentContent()}

        <div className={styles.modalActions}>
          <button className={styles.modalActionBtn}>
            F1 - Cobrar e Imprimir
          </button>
          <button className={styles.modalActionBtn}>
            F2 - Cobrar sin imprimir
          </button>
          <button className={styles.modalActionBtn} onClick={closePaymentModal}>
            ESC - Cancelar
          </button>
          <button 
            className={styles.modalActionBtn}
            onClick={openNotesModal}
          >
            F4 - Ingresar notas
          </button>
        </div>
      </div>
      
      {/* Modal de Notas */}
      <NotesModal
        isOpen={isNotesModalOpen}
        onClose={closeNotesModal}
        onSave={handleSaveNotes}
        initialNotes={saleNotes}
      />
    </div>
  );
};

export default PaymentModal;
