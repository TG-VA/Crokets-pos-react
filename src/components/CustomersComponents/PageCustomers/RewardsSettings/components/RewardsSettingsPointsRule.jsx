import styles from "../RewardsSettings.module.css";
import { EXAMPLE_SALE_AMOUNT } from "../services/rewardsSettingsCalculationService";

/**
 * Regla de acumulacion: cuantos pesos compra 1 punto, con ejemplo de calculo.
 */
const RewardsSettingsPointsRule = ({
  pointsAmountPerPoint,
  examplePoints,
  canSavePointsRule,
  hasPointsRuleChanges,
  loadingPointsRule,
  savingPointsRule,
  onPointsAmountChange,
  onSavePointsRule,
}) => {
  return (
    <div className={styles.pointsRuleCard}>
      <div className={styles.pointsRuleInfo}>
        <h2>Regla de acumulación de puntos</h2>
        <p>
          Define cuántos pesos debe comprar un cliente para ganar 1 punto. El
          sistema no maneja puntos fraccionarios y siempre redondea hacia abajo.
        </p>

        <div className={styles.pointsRuleExample}>
          Ejemplo: una venta de ${EXAMPLE_SALE_AMOUNT.toFixed(2)} genera{" "}
          <strong>{examplePoints}</strong> punto
          {examplePoints !== 1 ? "s" : ""}.
        </div>
      </div>

      <div className={styles.pointsRuleForm}>
        <label>El cliente gana 1 punto por cada</label>

        <div className={styles.pointsRuleInputRow}>
          <span>$</span>
          <input
            type="text"
            inputMode="decimal"
            value={pointsAmountPerPoint}
            onChange={(e) => onPointsAmountChange(e.target.value)}
            placeholder="50"
            disabled={loadingPointsRule || savingPointsRule}
          />
          <strong>MXN</strong>
        </div>

        <button
          type="button"
          className={styles.savePointsRuleButton}
          onClick={onSavePointsRule}
          disabled={!canSavePointsRule}
        >
          {savingPointsRule
            ? "Guardando..."
            : hasPointsRuleChanges
              ? "Guardar regla"
              : "Regla guardada"}
        </button>
      </div>
    </div>
  );
};

export default RewardsSettingsPointsRule;
