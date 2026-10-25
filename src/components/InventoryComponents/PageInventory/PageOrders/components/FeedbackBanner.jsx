import styles from "../PageOrders.module.css";
import XmarkIcon from "../../../../../assets/icons/xmark-solid-full.svg";

const TONE_CLASS = {
  success: styles.feedbackSuccess,
  warning: styles.feedbackWarning,
  error: styles.feedbackError,
  info: styles.feedbackInfo,
};

const FeedbackBanner = ({ feedback, onDismiss }) => {
  if (!feedback?.message) return null;

  const toneClass = TONE_CLASS[feedback.tone] || TONE_CLASS.info;

  return (
    <div
      className={[styles.feedback, toneClass].filter(Boolean).join(" ")}
      role={feedback.tone === "error" ? "alert" : "status"}
    >
      <span className={styles.feedbackMessage}>{feedback.message}</span>
      {onDismiss ? (
        <button
          type="button"
          className={styles.feedbackClose}
          onClick={onDismiss}
          aria-label="Cerrar aviso"
        >
          <img src={XmarkIcon} alt="" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
};

export default FeedbackBanner;
