import React, { useEffect } from "react";
import styles from "./SaleSuccessModal.module.css";

const formatCurrency = (value) => {
  return `$${Number(value || 0).toFixed(2)}`;
};

const toNumber = (value) => {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const normalizeRewardItems = (saleData) => {
  const possibleLists = [
    saleData?.rewardRedemptions,
    saleData?.rewardsRedeemed,
    saleData?.redeemedRewards,
    saleData?.appliedRewards,
    saleData?.rewardItems,
  ];

  const list = possibleLists.find((items) => Array.isArray(items));

  if (!list) return [];

  return list
    .map((item) => {
      const rewardName =
        item.reward_name ||
        item.rewardName ||
        item.name ||
        item.reward ||
        "RECOMPENSA";

      const productName =
        item.product_name ||
        item.productName ||
        item.product ||
        item.producto ||
        "";

      const quantity = toNumber(
        item.quantity ||
          item.qty ||
          item.reward_quantity ||
          item.rewardQuantity ||
          item.redeemQuantity ||
          1
      );

      const totalPoints = Math.abs(
        toNumber(
          item.total_points ||
            item.totalPoints ||
            item.points ||
            item.pointsUsed ||
            item.reward_points ||
            item.rewardPoints ||
            0
        )
      );

      return {
        rewardName,
        productName,
        quantity: quantity > 0 ? quantity : 1,
        totalPoints,
      };
    })
    .filter((item) => item.rewardName);
};

const SaleSuccessModal = ({
  isOpen,
  saleData,
  onClose,
  onViewSalesHistory,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" || event.key === "Enter") {
        event.preventDefault();
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !saleData) return null;

  const total = toNumber(saleData.total);
  const rewardItems = normalizeRewardItems(saleData);

  const rewardPointsUsed = Math.abs(
    toNumber(
      saleData.rewardPointsUsed ||
        saleData.pointsUsed ||
        saleData.pointsRedeemed ||
        saleData.totalRewardPoints ||
        saleData.total_points_used
    )
  );

  const rewardsCount =
    toNumber(
      saleData.rewardsCount ||
        saleData.rewardRedemptionsCount ||
        saleData.canjesAplicados ||
        saleData.rewardsAppliedCount
    ) ||
    rewardItems.reduce(
      (totalCount, item) => totalCount + toNumber(item.quantity),
      0
    );

  const hasRewardActivity = Boolean(
    saleData.isRewardRedemptionOnly ||
      saleData.isZeroTotalSale ||
      saleData.hasRewardRedemptions ||
      rewardPointsUsed > 0 ||
      rewardsCount > 0 ||
      rewardItems.length > 0
  );

  const isRewardRedemptionOnly = hasRewardActivity && total <= 0;

  const hasCustomer =
    saleData.customerName &&
    saleData.customerName !== "PÚBLICO EN GENERAL";

  const pointsEarned = toNumber(saleData.pointsEarned);
  const hasPoints = hasCustomer && pointsEarned > 0;
  const pointsError = Boolean(saleData.pointsError);

  const noPointsGenerated =
    !hasRewardActivity &&
    hasCustomer &&
    !pointsError &&
    pointsEarned <= 0;

  const pointsBalance =
    saleData.pointsBalance !== null && saleData.pointsBalance !== undefined
      ? Number(saleData.pointsBalance || 0)
      : saleData.finalPointsBalance !== null &&
          saleData.finalPointsBalance !== undefined
        ? Number(saleData.finalPointsBalance || 0)
        : null;

  const paymentMethod = isRewardRedemptionOnly
    ? "SIN PAGO"
    : saleData.paymentMethod || "SIN MÉTODO";

  const showPointsSummary = hasPoints || hasRewardActivity;
  const showRewardSummaryGrid = isRewardRedemptionOnly;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div
          className={`${styles.successIcon} ${
            isRewardRedemptionOnly ? styles.rewardSuccessIcon : ""
          }`}
        >
          ✓
        </div>

        <h2 className={styles.title}>
          {isRewardRedemptionOnly
            ? "CANJE REGISTRADO CORRECTAMENTE"
            : "VENTA REGISTRADA CORRECTAMENTE"}
        </h2>

        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span>Folio</span>
            <strong>{saleData.folio || "SIN FOLIO"}</strong>
          </div>

          <div className={styles.infoItem}>
            <span>Cliente</span>
            <strong>{saleData.customerName || "PÚBLICO EN GENERAL"}</strong>
          </div>

          <div className={styles.infoItem}>
            <span>Total</span>
            <strong>{formatCurrency(total)}</strong>
          </div>

          <div className={styles.infoItem}>
            <span>{isRewardRedemptionOnly ? "Operación" : "Método de pago"}</span>
            <strong>
              {isRewardRedemptionOnly
                ? "CANJE DE RECOMPENSA"
                : paymentMethod}
            </strong>
          </div>

          {isRewardRedemptionOnly && (
            <div className={styles.infoItem}>
              <span>Pago</span>
              <strong>{paymentMethod}</strong>
            </div>
          )}
        </div>

        {showPointsSummary && (
          <div
            className={`${styles.pointsBox} ${
              hasRewardActivity ? styles.pointsBoxWithRewards : ""
            }`}
          >
            {hasPoints && (
              <div>
                <span>Puntos ganados</span>
                <strong>+{pointsEarned}</strong>
              </div>
            )}

            {hasRewardActivity && rewardPointsUsed > 0 && (
              <div>
                <span>Puntos usados</span>
                <strong className={styles.pointsUsedValue}>
                  -{rewardPointsUsed}
                </strong>
              </div>
            )}

            {hasRewardActivity && (
              <div>
                <span>Canjes aplicados</span>
                <strong>{rewardsCount}</strong>
              </div>
            )}

            {pointsBalance !== null && (
              <div>
                <span>Saldo actual</span>
                <strong>{pointsBalance} pts</strong>
              </div>
            )}
          </div>
        )}

        {hasRewardActivity && (
          <div className={styles.rewardBox}>
            {showRewardSummaryGrid && (
              <div className={styles.rewardSummaryGrid}>
                <div>
                  <span>Canjes aplicados</span>
                  <strong>{rewardsCount}</strong>
                </div>

                {rewardPointsUsed > 0 && (
                  <div>
                    <span>Puntos descontados</span>
                    <strong>-{rewardPointsUsed}</strong>
                  </div>
                )}

                {pointsBalance !== null && (
                  <div>
                    <span>Saldo final</span>
                    <strong>{pointsBalance} pts</strong>
                  </div>
                )}
              </div>
            )}

            {rewardItems.length > 0 && (
              <div className={styles.rewardListBlock}>
                <div className={styles.rewardListHeader}>
                  <span className={styles.rewardListTitle}>
                    Recompensas canjeadas
                  </span>

                  <strong>{rewardsCount}</strong>
                </div>

                <div className={styles.rewardList}>
                  {rewardItems.map((item, index) => (
                    <div
                      key={`${item.rewardName}-${item.productName}-${index}`}
                      className={styles.rewardItem}
                    >
                      <div>
                        <strong>{item.rewardName}</strong>

                        {item.productName && <small>{item.productName}</small>}
                      </div>

                      <span>
                        x{item.quantity}
                        {item.totalPoints > 0 && ` · ${item.totalPoints} pts`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className={styles.rewardNote}>
              {isRewardRedemptionOnly
                ? "Esta operación fue registrada como canje de recompensa y no generó puntos por venta."
                : "La venta también incluyó canje de recompensa. Los puntos usados ya fueron descontados del cliente."}
            </p>
          </div>
        )}

        {noPointsGenerated && (
          <div className={styles.noticeBox}>
            La venta no generó puntos porque el total no alcanzó el monto mínimo
            configurado.
          </div>
        )}

        {pointsError && (
          <div className={styles.warningBox}>
            La venta se registró correctamente, pero no se pudieron generar los
            puntos del cliente. Revisa el historial de puntos o realiza un ajuste
            manual si es necesario.
          </div>
        )}

        <div className={styles.actions}>
          {onViewSalesHistory && (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={onViewSalesHistory}
            >
              Ver historial
            </button>
          )}

          <button
            type="button"
            className={styles.primaryButton}
            onClick={onClose}
            autoFocus
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaleSuccessModal;
