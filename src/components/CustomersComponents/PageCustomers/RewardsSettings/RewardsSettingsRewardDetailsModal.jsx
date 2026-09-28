import styles from "./RewardsSettings.module.css";
import {
  getLinkedProductsLabel,
  getRewardBenefitLabel,
  getRewardTypeLabel,
} from "./services/rewardsSettingsCalculationService";

/**
 * Modal de solo lectura con el detalle completo de una recompensa.
 */
const RewardsSettingsRewardDetailsModal = ({ reward, onClose }) => {
  if (!reward) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.detailsModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reward-details-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.detailsHeader}>
          <div>
            <h3 id="reward-details-title">Detalle de recompensa</h3>
            <p>{reward.name || "SIN NOMBRE"}</p>
          </div>

          <button
            type="button"
            className={styles.detailsCloseButton}
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            ×
          </button>
        </div>

        <div className={styles.detailsBody}>
          <div className={styles.detailItem}>
            <span>Descripción</span>
            <strong>{reward.description || "SIN DESCRIPCIÓN"}</strong>
          </div>

          <div className={styles.detailsGrid}>
            <div className={styles.detailItem}>
              <span>Tipo</span>
              <strong>{getRewardTypeLabel(reward.reward_type)}</strong>
            </div>

            <div className={styles.detailItem}>
              <span>Beneficio</span>
              <strong>{getRewardBenefitLabel(reward)}</strong>
            </div>

            <div className={styles.detailItem}>
              <span>Productos aplicables</span>
              <strong>{getLinkedProductsLabel(reward)}</strong>
            </div>

            <div className={styles.detailItem}>
              <span>Puntos requeridos</span>
              <strong>{Number(reward.points_required || 0)}</strong>
            </div>

            <div className={styles.detailItem}>
              <span>Estado</span>
              <strong>
                {reward.is_active === false ? "INACTIVA" : "ACTIVA"}
              </strong>
            </div>
          </div>
        </div>

        <div className={styles.detailsActions}>
          <button
            type="button"
            className={styles.detailsPrimaryButton}
            onClick={onClose}
            autoFocus
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default RewardsSettingsRewardDetailsModal;
