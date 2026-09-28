import styles from "./RewardsAvailability.module.css";
import {
  getRewardStatus,
  getRewardTypeLabel,
} from "./services/rewardsAvailabilityCalculationService";

/**
 * Rejilla de recompensas activas con su estado respecto al saldo del cliente.
 */
const RewardsAvailabilityRewardsGrid = ({
  rewards,
  customerPoints,
  hasSelectedCustomer,
  loadingRewards,
  onRefresh,
}) => {
  return (
    <section className={styles.rewardsSection}>
      <div className={styles.sectionHeader}>
        <div>
          <h2>Recompensas activas</h2>
          <p>
            Consulta qué recompensas están disponibles según los puntos del
            cliente seleccionado.
          </p>
        </div>

        <button
          type="button"
          className={styles.refreshButton}
          onClick={onRefresh}
          disabled={loadingRewards}
        >
          {loadingRewards ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      <div className={styles.rewardsGrid}>
        {loadingRewards ? (
          <div className={styles.emptyState}>Cargando recompensas...</div>
        ) : rewards.length === 0 ? (
          <div className={styles.emptyState}>
            No hay recompensas activas configuradas.
          </div>
        ) : (
          rewards.map((reward) => {
            const requiredPoints = Number(reward.points_required || 0);
            const rewardStatus = getRewardStatus({
              reward,
              customerPoints,
              hasSelectedCustomer,
            });

            return (
              <article
                key={reward.id}
                className={`${styles.rewardCard} ${
                  rewardStatus.status === "available"
                    ? styles.rewardCardAvailable
                    : ""
                } ${
                  rewardStatus.status === "unavailable"
                    ? styles.rewardCardUnavailable
                    : ""
                } ${
                  rewardStatus.status === "neutral"
                    ? styles.rewardCardNeutral
                    : ""
                }`}
              >
                <div className={styles.rewardCardTop}>
                  <h3>{reward.name}</h3>
                  <span>{requiredPoints} pts</span>
                </div>

                <div className={styles.rewardType}>
                  {getRewardTypeLabel(reward)}
                </div>

                <p>{reward.description || "SIN DESCRIPCIÓN"}</p>

                <div
                  className={`${styles.rewardStatus} ${
                    rewardStatus.status === "available"
                      ? styles.rewardStatusAvailable
                      : ""
                  } ${
                    rewardStatus.status === "unavailable"
                      ? styles.rewardStatusUnavailable
                      : ""
                  }`}
                >
                  {rewardStatus.label}
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
};

export default RewardsAvailabilityRewardsGrid;
