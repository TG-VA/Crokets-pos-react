import React from "react";
import styles from "../PageTransfers.module.css";

const FeedbackBanner = ({ error, success }) => {
  if (!error && !success) return null;

  return (
    <div
      className={`${styles.feedback} ${
        error ? styles.feedbackError : styles.feedbackSuccess
      }`}
    >
      {error || success}
    </div>
  );
};

export default FeedbackBanner;
