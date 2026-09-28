import styles from "./PointsAdjustment.module.css";
import { ADJUSTMENT_REASON_OPTIONS } from "./services/pointsAdjustmentCalculationService";

/**
 * Formulario del ajuste: tipo, cantidad, motivo y vista previa del saldo.
 */
const PointsAdjustmentForm = ({
  adjustmentType,
  pointsAmount,
  adjustmentReason,
  notes,
  newBalance,
  normalizedFinalNotes,
  isOtherReason,
  selectedCustomer,
  saving,
  canSubmit,
  onAdjustmentTypeChange,
  onPointsChange,
  onReasonChange,
  onNotesChange,
  onClearForm,
  onSubmit,
}) => {
  return (
    <form className={styles.adjustmentCard} onSubmit={onSubmit}>
      <div className={styles.adjustmentHeader}>
        <div>
          <h2>Datos del ajuste</h2>
          <p>
            El ajuste quedará registrado en el historial de puntos con usuario,
            sucursal y motivo.
          </p>
        </div>
      </div>

      <div className={styles.formGrid}>
        <div className={styles.fieldGroup}>
          <label>Tipo de ajuste *</label>
          <select
            value={adjustmentType}
            onChange={(e) => onAdjustmentTypeChange(e.target.value)}
            disabled={saving}
          >
            <option value="add">Agregar puntos</option>
            <option value="subtract">Descontar puntos</option>
          </select>
        </div>

        <div className={styles.fieldGroup}>
          <label>Puntos *</label>
          <input
            type="text"
            inputMode="numeric"
            value={pointsAmount}
            onChange={(e) => onPointsChange(e.target.value)}
            placeholder="Ej. 500"
            disabled={saving}
          />
        </div>

        <div className={styles.balancePreview}>
          <span>Nuevo saldo</span>
          <strong
            className={
              newBalance < 0 ? styles.balanceNegative : styles.balanceNormal
            }
          >
            {selectedCustomer ? newBalance : "-"}
          </strong>
        </div>
      </div>

      <div className={styles.fieldGroup}>
        <label>Motivo del ajuste *</label>
        <select
          value={adjustmentReason}
          onChange={(e) => onReasonChange(e.target.value)}
          disabled={saving}
        >
          <option value="">Selecciona un motivo</option>
          {ADJUSTMENT_REASON_OPTIONS.map((reason) => (
            <option key={reason.value} value={reason.value}>
              {reason.label}
            </option>
          ))}
        </select>
      </div>

      {isOtherReason && (
        <div className={styles.fieldGroup}>
          <label>Describe el motivo *</label>
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value.toUpperCase())}
            placeholder="Ej. ACLARACIÓN AUTORIZADA POR DIFERENCIA EN PUNTOS DEL CLIENTE"
            rows={4}
            disabled={saving}
          />

          <span className={styles.helpText}>
            Evita motivos genéricos como PRUEBA, TEST, OK o AJUSTE. Este detalle
            aparecerá en el historial.
          </span>
        </div>
      )}

      {!isOtherReason && adjustmentReason && (
        <div className={styles.helpText}>
          Motivo seleccionado: {normalizedFinalNotes}
        </div>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.clearButton}
          onClick={onClearForm}
          disabled={saving}
        >
          Limpiar ajuste
        </button>

        <button
          type="submit"
          className={styles.saveButton}
          disabled={!canSubmit}
        >
          Revisar ajuste
        </button>
      </div>
    </form>
  );
};

export default PointsAdjustmentForm;
