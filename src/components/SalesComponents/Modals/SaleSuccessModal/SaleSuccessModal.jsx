import React, { useEffect } from "react";
import styles from "./SaleSuccessModal.module.css";

const formatCurrency = (value) => {
  return `$${Number(value || 0).toFixed(2)}`;
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

  const hasCustomer =
    saleData.customerName &&
    saleData.customerName !== "PÚBLICO EN GENERAL";

  const hasPoints = hasCustomer && Number(saleData.pointsEarned || 0) > 0;
  const pointsError = Boolean(saleData.pointsError);
  const noPointsGenerated =
    hasCustomer && !pointsError && Number(saleData.pointsEarned || 0) <= 0;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.successIcon}>✓</div>

        <h2 className={styles.title}>VENTA REGISTRADA CORRECTAMENTE</h2>

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
            <strong>{formatCurrency(saleData.total)}</strong>
          </div>

          <div className={styles.infoItem}>
            <span>Método de pago</span>
            <strong>{saleData.paymentMethod || "SIN MÉTODO"}</strong>
          </div>
        </div>

        {hasPoints && (
          <div className={styles.pointsBox}>
            <div>
              <span>Puntos ganados</span>
              <strong>+{Number(saleData.pointsEarned || 0)}</strong>
            </div>

            {saleData.pointsBalance !== null &&
              saleData.pointsBalance !== undefined && (
                <div>
                  <span>Saldo actual</span>
                  <strong>{Number(saleData.pointsBalance || 0)} pts</strong>
                </div>
              )}
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