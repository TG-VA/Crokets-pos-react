import styles from "../ReceiptNoteField.module.css";
import {
  getReceiptNoteCounter,
  RECEIPT_NOTE_MAX_LENGTH,
} from "../utils/receiptNoteCalculationService";

const COUNTER_TONE_CLASS = {
  neutral: "",
  warning: styles.counterWarning,
  error: styles.counterError,
};

const ReceiptNoteField = ({
  value,
  isRequired,
  error,
  isDisabled,
  onChange,
}) => {
  const counter = getReceiptNoteCounter(value);
  const describedBy = [
    error ? "receipt-note-error" : "receipt-note-help",
    "receipt-note-counter",
  ].join(" ");

  return (
    <section
      className={[styles.card, error ? styles.cardError : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <header className={styles.header}>
        <label className={styles.title} htmlFor="receipt-note">
          Nota de recepción
        </label>
        <span
          className={[
            styles.pill,
            isRequired ? styles.pillRequired : styles.pillOptional,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {isRequired ? "Obligatoria" : "Opcional"}
        </span>
      </header>

      <textarea
        id="receipt-note"
        className={styles.textarea}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={RECEIPT_NOTE_MAX_LENGTH}
        rows={3}
        placeholder="Describe el faltante o sobrante"
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        disabled={isDisabled}
      />

      <div className={styles.meta}>
        {error ? (
          <p id="receipt-note-error" className={styles.error} role="alert">
            {error}
          </p>
        ) : (
          <p id="receipt-note-help" className={styles.help}>
            Describe el faltante o sobrante. Máximo {RECEIPT_NOTE_MAX_LENGTH}{" "}
            caracteres.
          </p>
        )}
        <p
          id="receipt-note-counter"
          className={[styles.counter, COUNTER_TONE_CLASS[counter.tone]]
            .filter(Boolean)
            .join(" ")}
          aria-live={counter.tone === "neutral" ? "off" : "polite"}
        >
          {counter.text}
        </p>
      </div>
    </section>
  );
};

export default ReceiptNoteField;
