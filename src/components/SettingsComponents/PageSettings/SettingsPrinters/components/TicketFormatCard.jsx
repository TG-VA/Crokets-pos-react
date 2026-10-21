import styles from "../SettingsPrinters.module.css";
import ScopeBadge from "../../components/ScopeBadge";
import {
  TICKET_WIDTH_OPTIONS,
  TICKET_COPIES_RANGE,
  TICKET_FEED_LINES_RANGE,
} from "../../../../../services/printSettingsService";
import checkIcon from "../../../../../assets/icons/circle-check-solid-full.svg";
import warningIcon from "../../../../../assets/icons/triangle-exclamation-solid-full.svg";

const TicketFormatCard = ({
  widthMm,
  handleWidthChange,
  printMode,
  handlePrintModeChange,
  copiesText,
  handleCopiesChange,
  handleCopiesBlur,
  feedLinesText,
  handleFeedLinesChange,
  handleFeedLinesBlur,
  preferencesFeedback,
}) => (
  <article className={styles.card}>
    <div className={styles.cardTitleRow}>
      <h2 className={styles.cardTitle}>Formato y preferencias</h2>
      <ScopeBadge scope="device" />
    </div>
    <p className={styles.cardDescription}>
      Configura el ancho, copias, modo de impresión y saltos de línea.
    </p>

    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>Ancho del ticket</legend>
      <div className={styles.radioCards}>
        {TICKET_WIDTH_OPTIONS.map((option) => (
          <label
            key={option}
            className={`${styles.radioCard} ${widthMm === option ? styles.radioCardActive : ""}`}
          >
            <input
              type="radio"
              name="ticket-width"
              value={option}
              checked={widthMm === option}
              onChange={handleWidthChange}
              className={styles.radioInput}
            />
            <div className={styles.radioCardContent}>
              <div className={styles.radioCardTitle}>{option} mm</div>
              <div className={styles.radioCardDesc}>
                {option === 58 ? "Estándar térmico" : "Rollo ancho"}
              </div>
            </div>
          </label>
        ))}
      </div>
    </fieldset>

    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>Modo de impresión post-cobro</legend>
      <div className={styles.radioCards}>
        <label
          className={`${styles.radioCard} ${printMode === "auto" ? styles.radioCardActive : ""}`}
        >
          <input
            type="radio"
            name="print-mode"
            value="auto"
            checked={printMode === "auto"}
            onChange={handlePrintModeChange}
            className={styles.radioInput}
          />
          <div className={styles.radioCardContent}>
            <div className={styles.radioCardTitle}>Automático</div>
            <div className={styles.radioCardDesc}>Imprime al cobrar</div>
          </div>
        </label>
        <label
          className={`${styles.radioCard} ${printMode === "confirm" ? styles.radioCardActive : ""}`}
        >
          <input
            type="radio"
            name="print-mode"
            value="confirm"
            checked={printMode === "confirm"}
            onChange={handlePrintModeChange}
            className={styles.radioInput}
          />
          <div className={styles.radioCardContent}>
            <div className={styles.radioCardTitle}>Confirmar</div>
            <div className={styles.radioCardDesc}>Pide confirmación</div>
          </div>
        </label>
      </div>
    </fieldset>

    <div className={styles.formRowCompact}>
      <div className={styles.fieldCompact}>
        <label htmlFor="copies-input" className={styles.label}>
          Copias por venta
        </label>
        <p className={styles.fieldHint}>
          Entre {TICKET_COPIES_RANGE.min} y {TICKET_COPIES_RANGE.max} copias por
          venta
        </p>
        <input
          id="copies-input"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          className={styles.input}
          value={copiesText}
          onChange={(e) => handleCopiesChange(e.target.value)}
          onBlur={handleCopiesBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
      </div>
      <div className={styles.fieldCompact}>
        <label htmlFor="feedlines-input" className={styles.label}>
          Saltos de línea antes de corte
        </label>
        <p className={styles.fieldHint}>
          Entre {TICKET_FEED_LINES_RANGE.min} y {TICKET_FEED_LINES_RANGE.max}{" "}
          líneas de avance antes del corte
        </p>
        <input
          id="feedlines-input"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          className={styles.input}
          value={feedLinesText}
          onChange={(e) => handleFeedLinesChange(e.target.value)}
          onBlur={handleFeedLinesBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
      </div>
    </div>

    {preferencesFeedback?.type === "error" ? (
      <div
        role="alert"
        className={`${styles.feedbackBanner} ${styles.feedbackError}`}
      >
        <img
          src={warningIcon}
          alt=""
          className={styles.feedbackIcon}
          aria-hidden="true"
        />
        <span>{preferencesFeedback.message}</span>
      </div>
    ) : null}

    {preferencesFeedback?.type === "success" ? (
      <div
        role="status"
        className={`${styles.feedbackBanner} ${styles.feedbackSuccess}`}
      >
        <img
          src={checkIcon}
          alt=""
          className={styles.feedbackIcon}
          aria-hidden="true"
        />
        <span>{preferencesFeedback.message}</span>
      </div>
    ) : null}
  </article>
);

export default TicketFormatCard;
