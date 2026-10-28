import styles from "../PageOrders.module.css";
import receiptStyles from "../ReceiptPanel.module.css";
import { RECEIPT_NOTE_MAX_LENGTH } from "../utils/receiptNoteCalculationService";

const ReceiptNoteField = ({
  value,
  isRequired,
  error,
  isDisabled,
  onChange,
}) => (
  <div className={receiptStyles.receiptNoteField}>
    <label className={receiptStyles.receiptNoteLabel} htmlFor="receipt-note">
      {isRequired ? "Nota (obligatoria por diferencias)" : "Nota (opcional)"}
    </label>
    <textarea
      id="receipt-note"
      className={styles.receiptNoteInput}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      maxLength={RECEIPT_NOTE_MAX_LENGTH}
      rows={3}
      placeholder="Describe el faltante o sobrante"
      aria-invalid={Boolean(error)}
      aria-describedby={error ? "receipt-note-error" : "receipt-note-help"}
      disabled={isDisabled}
    />
    {error ? (
      <p id="receipt-note-error" className={styles.inlineError} role="alert">
        {error}
      </p>
    ) : (
      <p id="receipt-note-help" className={receiptStyles.receiptNoteHelp}>
        Máximo {RECEIPT_NOTE_MAX_LENGTH} caracteres.
      </p>
    )}
  </div>
);

export default ReceiptNoteField;
