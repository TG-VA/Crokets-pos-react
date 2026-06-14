import React from "react";
import styles from "./RedeemRewardConfirmModal.module.css";

const RedeemRewardConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  customer,
  reward,
  currentPoints,
  pointsToUse,
  remainingPoints,
  saving,
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <h2>Confirmar canje</h2>
            <p>Revisa la información antes de entregar la recompensa.</p>
          </div>

          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            disabled={saving}
          >
            ×
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.warningBox}>
            Este movimiento descontará puntos del cliente y quedará registrado
            en el historial.
          </div>

          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span>Cliente</span>
              <strong>{customer?.name || "SIN NOMBRE"}</strong>
            </div>

            <div className={styles.infoItem}>
              <span>Teléfono</span>
              <strong>{customer?.phone || "SIN TELÉFONO"}</strong>
            </div>

            <div className={styles.infoItemFull}>
              <span>Recompensa</span>
              <strong>{reward?.name || "SIN RECOMPENSA"}</strong>
            </div>
          </div>

          <div className={styles.pointsSummary}>
            <div>
              <span>Puntos actuales</span>
              <strong>{Number(currentPoints || 0)}</strong>
            </div>

            <div>
              <span>Puntos a usar</span>
              <strong>-{Number(pointsToUse || 0)}</strong>
            </div>

            <div className={styles.remainingPoints}>
              <span>Puntos restantes</span>
              <strong>{Number(remainingPoints || 0)}</strong>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>

          <button
            type="button"
            className={styles.confirmButton}
            onClick={onConfirm}
            disabled={saving}
          >
            {saving ? "Canjeando..." : "Confirmar canje"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RedeemRewardConfirmModal;