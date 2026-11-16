import styles from "../SettingsBranches.module.css";

const BranchContactField = ({
  field,
  value,
  error,
  invalid,
  onChange,
  onBlur,
}) => {
  const id = `branch-form-${field.name}`;
  const Element = field.element;
  const fieldClassName = field.fullWidth
    ? `${styles.formField} ${styles.formFieldFull}`
    : styles.formField;

  return (
    <div className={fieldClassName}>
      <label htmlFor={id} className={styles.formLabel}>
        {field.label}
      </label>
      <Element
        id={id}
        className={
          field.element === "textarea" ? styles.textarea : styles.input
        }
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        aria-invalid={invalid ? "true" : "false"}
        {...field.inputProps}
      />
      {error ? (
        <p role="alert" className={styles.fieldError}>
          {error}
        </p>
      ) : null}
    </div>
  );
};

export default BranchContactField;
