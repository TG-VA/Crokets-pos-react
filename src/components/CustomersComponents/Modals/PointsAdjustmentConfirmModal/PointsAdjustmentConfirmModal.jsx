import React from "react";
import styles from "./PointsAdjustmentConfirmModal.module.css";
import { useEscapeKey } from "../../../../hooks/useEscapeKey";

const PointsAdjustmentConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  saving,
  customer,
  adjustmentType,
  currentPoints,
  pointsAmount,
  signedPoints,
  newBalance,
  notes,
  branch,
}) => {
  const isAdd = adjustmentType === "add";

  useEscapeKey(onClose, isOpen && !saving);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="points-adjustment-confirm-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <div>
            <h2 id="points-adjustment-confirm-title">Confirmar ajuste</h2>
            <p>Revisa la información antes de guardar el movimiento.</p>
          </div>

          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar modal"
          >
            ×
          </button>
        </div>

        <div className={styles.body}>
          <div
            className={`${styles.notice} ${
              isAdd ? styles.noticeAdd : styles.noticeSubtract
            }`}
          >
            Este ajuste {isAdd ? "agregará" : "descontará"} puntos al cliente y
            quedará registrado en el historial.
          </div>

          <div className={styles.infoGrid}>
            <div className={styles.infoBox}>
              <span>Cliente</span>
              <strong>{customer?.name || "SIN CLIENTE"}</strong>
            </div>

            <div className={styles.infoBox}>
              <span>Teléfono</span>
              <strong>{customer?.phone || "SIN TELÉFONO"}</strong>
            </div>

            <div className={styles.infoBox}>
              <span>Tipo de ajuste</span>
              <strong>{isAdd ? "AGREGAR PUNTOS" : "DESCONTAR PUNTOS"}</strong>
            </div>

            <div className={styles.infoBox}>
              <span>Sucursal</span>
              <strong>{branch?.name || branch?.code || "SIN SUCURSAL"}</strong>
            </div>
          </div>

          <div className={styles.pointsGrid}>
            <div className={styles.pointsBox}>
              <span>PUNTOS ACTUALES</span>
              <strong>{currentPoints}</strong>
            </div>

            <div className={styles.pointsBox}>
              <span>{isAdd ? "PUNTOS A AGREGAR" : "PUNTOS A DESCONTAR"}</span>
              <strong className={isAdd ? styles.positive : styles.negative}>
                {isAdd ? `+${pointsAmount}` : signedPoints}
              </strong>
            </div>

            <div className={styles.pointsBox}>
              <span>NUEVO SALDO</span>
              <strong
                className={newBalance < 0 ? styles.negative : styles.positive}
              >
                {newBalance}
              </strong>
            </div>
          </div>

          <div className={styles.notesBox}>
            <span>Motivo</span>
            <p>{notes || "SIN MOTIVO"}</p>
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
            {saving ? "Guardando..." : "Confirmar ajuste"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PointsAdjustmentConfirmModal;