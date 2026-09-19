import { fmt, fmtShortDate, fmtTime, getFolio } from "../utils/cashCutFormatters";

import styles from "../CashCut.module.css";

const RefundItem = ({ saleId, date, reason, amount, method }) => (
  <div className={styles.cancellationItem}>
    <div className={styles.cancellationTop}>
      <div className={styles.cancellationLeft}>
        <div className={styles.cancellationFolio}>
          Folio {getFolio(saleId)}
        </div>

        <div className={styles.cancellationDate}>
          {fmtShortDate(date)} · {fmtTime(date)}
        </div>

        <div className={styles.cancellationReason}>
          Motivo: {reason?.trim() || "Sin motivo registrado"}
        </div>
      </div>

      <div className={styles.cancellationRight}>
        <div className={styles.cancellationAmount}>- {fmt(amount)}</div>

        <div className={styles.cancellationMethod}>
          {method || "Sin método"}
        </div>
      </div>
    </div>
  </div>
);

export default RefundItem;
