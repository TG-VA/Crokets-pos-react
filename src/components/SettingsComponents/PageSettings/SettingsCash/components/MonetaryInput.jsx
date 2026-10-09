import React from "react";
import styles from "../SettingsCash.module.css";

const MonetaryInput = ({
  id,
  value,
  onChange,
  placeholder = "0.00",
  ariaDescribedby,
  disabled = false,
  min = "0",
}) => (
  <div
    className={`${styles.monetaryInputWrapper} ${
      disabled ? styles.fieldDisabled : ""
    }`}
  >
    <span className={styles.monetaryPrefix}>$</span>
    <input
      id={id}
      type="number"
      min={min}
      step="0.01"
      inputMode="decimal"
      disabled={disabled}
      className={styles.monetaryInput}
      value={value}
      onChange={onChange}
      onWheel={(e) => e.currentTarget.blur()}
      placeholder={placeholder}
      aria-describedby={ariaDescribedby}
    />
    <span className={styles.monetarySuffix}>MXN</span>
  </div>
);

export default MonetaryInput;
