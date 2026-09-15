import styles from "../CashCut.module.css";

export const IconImg = ({ src, className = "", alt = "" }) => (
  <img
    src={src}
    alt={alt}
    className={className}
    aria-hidden={alt ? undefined : "true"}
    style={{
      width: "1em",
      height: "1em",
      display: "inline-block",
      objectFit: "contain",
      verticalAlign: "middle",
      filter: "brightness(0) invert(1)",
    }}
  />
);

export const SectionCard = ({ icon, title, children }) => (
  <div className={styles.card}>
    <div className={styles.cardHeader}>
      <span className={styles.cardIcon}>
        <IconImg src={icon} />
      </span>
      <span className={styles.cardTitle}>{title}</span>
    </div>
    <div className={styles.cardBody}>{children}</div>
  </div>
);

export const DataRow = ({ label, value, color, bold, borderTop }) => (
  <div
    className={[styles.dataRow, borderTop ? styles.borderTop : null]
      .filter(Boolean)
      .join(" ")}
  >
    <span
      className={[styles.dataLabel, bold ? styles.bold : null]
        .filter(Boolean)
        .join(" ")}
    >
      {label}
    </span>
    <span
      className={[styles.dataValue, bold ? styles.bold : null]
        .filter(Boolean)
        .join(" ")}
      style={{ color: color || undefined }}
    >
      {value}
    </span>
  </div>
);

export const EmptyState = ({ msg }) => <div className={styles.emptyState}>{msg}</div>;
