import React from "react";

import styles from "./ReportKpiCard.module.css";

const ReportKpiCard = ({
  title,
  value,
  description = "",
  loading = false,
  variant = "default",
}) => {
  const variantClass =
    styles[variant] || styles.default;

  return (
    <article
      className={`${styles.card} ${variantClass}`}
    >
      <span className={styles.title}>{title}</span>

      {loading ? (
        <div className={styles.loadingValue} />
      ) : (
        <strong className={styles.value}>{value}</strong>
      )}

      {description ? (
        <p className={styles.description}>
          {description}
        </p>
      ) : null}
    </article>
  );
};

export default ReportKpiCard;