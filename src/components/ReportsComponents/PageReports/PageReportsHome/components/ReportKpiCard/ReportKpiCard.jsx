import React from "react";

import styles from "./ReportKpiCard.module.css";

const ReportKpiCard = ({
  title,
  value,
  description = "",
  loading = false,
  variant = "default",
  icon = null,
}) => {
  const variantClass =
    styles[variant] || styles.default;
  const badgeClass =
    styles[`${variant}Badge`] || styles.defaultBadge;

  return (
    <article
      className={`${styles.card} ${variantClass}`}
    >
      <div className={styles.headerRow}>
        <span className={styles.title}>{title}</span>

        {icon ? (
          <div
            className={`${styles.iconBadge} ${badgeClass}`}
          >
            <img
              src={icon}
              alt=""
              aria-hidden="true"
              className={styles.icon}
            />
          </div>
        ) : null}
      </div>

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
