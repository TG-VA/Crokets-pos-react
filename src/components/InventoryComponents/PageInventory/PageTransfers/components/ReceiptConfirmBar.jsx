import { useEffect, useState } from "react";

import styles from "../PageTransfers.module.css";

const DISARM_DELAY_MS = 5000;

const ReceiptConfirmBar = ({
  canConfirm,
  submitting,
  unreceivedCount = 0,
  buttonRef,
  onConfirm,
}) => {
  const [armed, setArmed] = useState(false);

  const isArmed = armed && canConfirm && !submitting;

  useEffect(() => {
    if (!isArmed) {
      return;
    }

    const timeoutId = setTimeout(() => setArmed(false), DISARM_DELAY_MS);

    return () => clearTimeout(timeoutId);
  }, [isArmed]);

  const handleClick = () => {
    if (submitting || !canConfirm) {
      return;
    }

    if (!isArmed) {
      setArmed(true);
      return;
    }

    setArmed(false);
    onConfirm();
  };

  const buttonClassName = `${styles.primaryButton}${
    isArmed ? ` ${styles.primaryButtonArmed}` : ""
  }`;

  const renderHint = () => {
    if (!canConfirm) {
      return "Captura al menos una cantidad recibida";
    }

    if (isArmed) {
      return "Presiona de nuevo para confirmar";
    }

    return "Doble click o presiona dos veces para confirmar";
  };

  const unreceivedNotice = () => {
    if (!canConfirm || unreceivedCount <= 0) {
      return null;
    }

    if (unreceivedCount === 1) {
      return "1 producto en 0 regresará completo a origen";
    }

    return `${unreceivedCount} productos en 0 regresarán completos a origen`;
  };

  const notice = unreceivedNotice();

  return (
    <div className={styles.actionRow}>
      <div className={styles.actionText}>
        La recepción genera entradas automáticas en destino y reingresa el
        faltante a origen.
        <span className={styles.confirmHint}>{renderHint()}</span>
        {notice ? (
          <span className={styles.unreceivedNotice}>{notice}</span>
        ) : null}
      </div>

      <button
        ref={buttonRef}
        type="button"
        className={buttonClassName}
        onClick={handleClick}
        onBlur={() => setArmed(false)}
        disabled={submitting || !canConfirm}
      >
        {submitting ? "Procesando..." : "Confirmar recepción"}
      </button>
    </div>
  );
};

export default ReceiptConfirmBar;
