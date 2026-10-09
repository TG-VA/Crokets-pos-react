import React from "react";
import styles from "../SettingsCash.module.css";

const ToggleSwitch = ({
  checked,
  onChange,
  disabled = false,
  id,
  ariaLabel,
}) => (
  <button
    type="button"
    id={id}
    role="switch"
    aria-checked={checked}
    aria-label={ariaLabel}
    className={styles.toggleSwitch}
    disabled={disabled}
    onClick={() => onChange(!checked)}
  >
    <span className={styles.toggleThumb} />
  </button>
);

export default ToggleSwitch;
