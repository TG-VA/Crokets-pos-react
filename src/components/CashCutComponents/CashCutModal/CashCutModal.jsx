import React, { useState } from "react";
import styles from "./CashCutModal.module.css";

const fmt = (n) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n || 0);

const CorteModal = ({ tipo, expected, onClose, onConfirm }) => {
  const [counted, setCounted] = useState("");
  const [notes, setNotes] = useState("");

  const diff = parseFloat(counted) - expected;
  const hasCounted = counted !== "";

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2 className={styles.modalTitle}>
          {tipo === "cajero" ? "🧾 Corte de Cajero" : "📅 Corte del Día"}
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
          <button className={styles.btnCancel} onClick={onClose}>
            Cancelar
          </button>
          <button
            className={styles.btnConfirm}
            onClick={() =>
              onConfirm({ counted: parseFloat(counted) || 0, notes, expected })
            }
          >
            Confirmar Corte
          </button>
        </div>
      </div>
    </div>
  );
};

export default CorteModal;