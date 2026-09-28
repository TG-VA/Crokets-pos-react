import styles from "./RewardsSettings.module.css";
import {
  getLinkedProductsLabel,
  getRewardBenefitLabel,
  getRewardTypeLabel,
} from "./services/rewardsSettingsCalculationService";

/**
 * Catalogo de recompensas con sus acciones de edicion y estado.
 */
const RewardsSettingsTable = ({
  rewards,
  loadingRewards,
  onEditReward,
  onOpenStatusConfirmModal,
  onOpenRewardDetailsModal,
}) => {
  return (
    <>
      <div className={styles.resultsInfo}>
        {loadingRewards
          ? "Cargando recompensas..."
          : `Mostrando ${rewards.length} recompensa${rewards.length !== 1 ? "s" : ""}`}
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.rewardsTable}>
          <thead>
            <tr>
              <th>Recompensa</th>
              <th>Tipo</th>
              <th>Beneficio</th>
              <th>Productos</th>
              <th>Puntos</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {loadingRewards ? (
              <tr>
                <td colSpan="7" className={styles.textCenter}>
                  Cargando recompensas...
                </td>
              </tr>
            ) : rewards.length === 0 ? (
              <tr>
                <td colSpan="7" className={styles.textCenter}>
                  No hay recompensas registradas con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              rewards.map((reward) => (
                <tr key={reward.id}>
                  <td>
                    <button
                      type="button"
                      className={styles.rewardInfoButton}
                      onClick={() => onOpenRewardDetailsModal(reward)}
                      title="Ver detalle de la recompensa"
                    >
                      <div className={styles.rewardName}>
                        {reward.name || "SIN NOMBRE"}
                      </div>

                      <span className={styles.descriptionText}>
                        {reward.description || "SIN DESCRIPCIÓN"}
                      </span>

                      <span className={styles.viewDetailText}>Ver detalle</span>
                    </button>
                  </td>

                  <td>
                    <span className={styles.descriptionText}>
                      {getRewardTypeLabel(reward)}
                    </span>
                  </td>

                  <td>
                    <span className={styles.descriptionText}>
                      {getRewardBenefitLabel(reward)}
                    </span>
                  </td>

                  <td>
                    <span className={styles.descriptionText}>
                      {getLinkedProductsLabel(reward)}
                    </span>
                  </td>

                  <td>
                    <span className={styles.pointsBadge}>
                      {Number(reward.points_required || 0)}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`${styles.statusBadge} ${
                        reward.is_active === false
                          ? styles.statusInactive
                          : styles.statusActive
                      }`}
                    >
                      {reward.is_active === false ? "INACTIVA" : "ACTIVA"}
                    </span>
                  </td>

                  <td>
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={`${styles.actionButton} ${styles.editButton}`}
                        onClick={() => onEditReward(reward)}
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        className={`${styles.actionButton} ${
                          reward.is_active === false
                            ? styles.activateButton
                            : styles.deactivateButton
                        }`}
                        onClick={() => onOpenStatusConfirmModal(reward)}
                      >
                        {reward.is_active === false ? "Activar" : "Desactivar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default RewardsSettingsTable;
