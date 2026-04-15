import React, { useEffect, useState } from "react";
import styles from "./CashCutModal.module.css";

const fmt = (n) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(Number(n) || 0);

const CorteModal = ({
  isOpen,
  cutType,
  expectedAmount,
  onClose,
  onConfirm,
}) => {
  const [counted, setCounted] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (isOpen) {
      setCounted("");
      setNotes("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const expected = Number(expectedAmount) || 0;
  const countedNumber = Number(counted) || 0;
  const hasCounted = counted !== "";
  const diff = countedNumber - expected;

  const handleConfirm = () => {
    onConfirm({
      counted: countedNumber,
      notes,
      expected,
    });
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <h2 className={styles.modalTitle}>
          {cutType === "cajero" ? "🧾 Corte de Cajero" : "📅 Corte del Día"}
        </h2>

        <p className={styles.modalSubtitle}>Confirma el monto contado en caja</p>

        <div className={styles.modalField}>
          <label className={styles.modalLabel}>MONTO ESPERADO</label>
          <div className={styles.expectedAmount}>{fmt(expected)}</div>
        </div>

        <div className={styles.modalField}>
          <label className={styles.modalLabel}>MONTO CONTADO EN CAJA</label>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={counted}
            onChange={(e) => setCounted(e.target.value)}
            className={styles.modalInput}
          />
        </div>

        {hasCounted && (
          <div
            className={`${styles.diffBadge} ${
              diff >= 0 ? styles.diffPositive : styles.diffNegative
            }`}
          >
            Diferencia: {fmt(diff)}
          </div>
        )}

        <div className={styles.modalField}>
          <label className={styles.modalLabel}>NOTAS (opcional)</label>
          <textarea
            placeholder="Observaciones del corte..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={styles.modalTextarea}
            rows={3}
          />
        </div>

        <div className={styles.modalActions}>
          <button
            type="button"
            className={styles.btnCancel}
            onClick={onClose}
          >
            Cancelar
          </button>

          <button
            type="button"
            className={styles.btnConfirm}
            onClick={handleConfirm}
          >
            Confirmar Corte
          </button>
        </div>
      </div>
    </div>
  );
};

export default CorteModal;