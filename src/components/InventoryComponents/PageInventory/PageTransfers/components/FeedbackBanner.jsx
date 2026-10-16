import styles from "../PageTransfers.module.css";
import errorIcon from "../../../../../assets/icons/triangle-exclamation-solid-full.svg";
import successIcon from "../../../../../assets/icons/circle-check-solid-full.svg";

const FeedbackBanner = ({ error, success }) => {
  if (!error && !success) return null;

  return (
    <div
      className={`${styles.feedback} ${
        error ? styles.feedbackError : styles.feedbackSuccess
      }`}
      role={error ? "alert" : "status"}
      aria-live="polite"
    >
      <img
        src={error ? errorIcon : successIcon}
        alt=""
        aria-hidden="true"
        className={styles.feedbackIcon}
      />
      <span>{error || success}</span>
    </div>
  );
};

export default FeedbackBanner;
