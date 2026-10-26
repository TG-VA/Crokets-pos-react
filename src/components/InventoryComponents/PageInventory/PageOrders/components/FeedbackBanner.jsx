import { useEffect } from "react";

import styles from "../PageOrders.module.css";
import XmarkIcon from "../../../../../assets/icons/xmark-solid-full.svg";

const TONE_CLASS = {
  success: styles.feedbackSuccess,
  warning: styles.feedbackWarning,
  error: styles.feedbackError,
  info: styles.feedbackInfo,
};

const AUTO_DISMISS_MS = 8000;

const FeedbackBanner = ({ feedback, onDismiss }) => {
  const message = feedback?.message;
  const tone = feedback?.tone;

  // Los errores se quedan hasta que el usuario los cierre.
  useEffect(() => {
    if (!message || tone === "error" || !onDismiss) return undefined;

    const timer = window.setTimeout(onDismiss, AUTO_DISMISS_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [message, tone, onDismiss]);

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
