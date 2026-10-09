import React from "react";
import styles from "../SettingsCash.module.css";

const RadioOption = ({
  selected,
  onSelect,
  disabled = false,
  title,
  description,
  badge = null,
}) => (
  <div
    role="radio"
    aria-checked={selected}
    aria-disabled={disabled}
    tabIndex={selected && !disabled ? 0 : -1}
    className={`${styles.radioCard} ${disabled ? styles.fieldDisabled : ""}`}
    onClick={() => {
      if (!disabled) onSelect();
    }}
    onKeyDown={(e) => {
      if (!disabled && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        onSelect();
      }
    }}
  >
    <input
      type="radio"
      checked={selected}
      readOnly
      disabled={disabled}
      className={styles.radioCardInput}
    />
    <div className={styles.radioCardContent}>
      {badge ? (
        <div className={styles.radioCardTitleRow}>
          <h4 className={styles.radioCardTitle}>{title}</h4>
          <span className={styles.recommendedBadge}>{badge}</span>
        </div>
      ) : (
        <h4 className={styles.radioCardTitle}>{title}</h4>
      )}
      <p className={styles.radioCardDescription}>{description}</p>
    </div>
  </div>
);

export default RadioOption;
