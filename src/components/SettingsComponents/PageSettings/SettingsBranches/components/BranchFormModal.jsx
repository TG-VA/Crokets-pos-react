import { useEffect } from "react";

import styles from "../SettingsBranches.module.css";
import useBranchForm from "../hooks/useBranchForm";
import {
  BRANCH_TIMEZONE_OPTIONS,
  DEFAULT_TIMEZONE,
} from "../utils/branchesFormatters";

const FieldError = ({ message }) =>
  message ? (
    <p role="alert" className={styles.fieldError}>
      {message}
    </p>
  ) : null;

const BranchFormModal = ({ isOpen, branch, saving, onSubmit, onClose }) => {
  const {
    values,
    isValid,
    isEdit,
    handleChange,
    handleBlur,
    shouldShowError,
    getFieldError,
    markSubmitted,
    getSanitizedValues,
  } = useBranchForm(isOpen ? branch : null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !saving) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, saving, onClose]);

  if (!isOpen) return null;

  const handleOverlayMouseDown = (event) => {
    if (event.target === event.currentTarget && !saving) {
      onClose();
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    markSubmitted();
    if (!isValid) return;
    const sanitized = getSanitizedValues();
    if (isEdit) {
      onSubmit(branch.id, sanitized);
      return;
    }
    onSubmit(sanitized);
  };

  const errorProps = (field) => ({
    "aria-invalid": shouldShowError(field) ? "true" : "false",
    onBlur: handleBlur(field),
  });

  return (
    <div className={styles.modalOverlay} onMouseDown={handleOverlayMouseDown}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-branches-form-title"
      >
        <div className={styles.modalHeader}>
          <h2 id="settings-branches-form-title" className={styles.modalTitle}>
            {isEdit ? "Editar sucursal" : "Nueva sucursal"}
          </h2>
          <p className={styles.modalSubtitle}>
            {isEdit
              ? "Actualiza los datos generales de contacto de la sucursal."
              : "Registra una sucursal nueva del catálogo corporativo."}
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.modalBody}>
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label htmlFor="branch-form-code" className={styles.formLabel}>
                  Código{" "}
                  <span className={styles.requiredMark} aria-hidden="true">
                    *
                  </span>
                </label>
                <input
                  id="branch-form-code"
                  type="text"
                  className={styles.input}
                  value={values.code}
                  onChange={handleChange("code")}
                  placeholder="Ej. CEN01"
                  maxLength={20}
                  autoComplete="off"
                  spellCheck={false}
                  disabled={isEdit}
                  {...errorProps("code")}
                />
                <FieldError message={getFieldError("code")} />
                {isEdit ? (
                  <p className={styles.fieldHint}>
                    El código no es editable para preservar folios y series
                    fiscales.
                  </p>
                ) : (
                  <p className={styles.fieldHint}>
                    Solo letras, números, guiones y guiones bajos.
                  </p>
                )}
              </div>

              <div className={styles.formField}>
                <label htmlFor="branch-form-name" className={styles.formLabel}>
                  Nombre{" "}
                  <span className={styles.requiredMark} aria-hidden="true">
                    *
                  </span>
                </label>
                <input
                  id="branch-form-name"
                  type="text"
                  className={styles.input}
                  value={values.name}
                  onChange={handleChange("name")}
                  placeholder="Ej. Sucursal Centro"
                  maxLength={100}
                  autoComplete="off"
                  {...errorProps("name")}
                />
                <FieldError message={getFieldError("name")} />
              </div>

              <div className={styles.formField}>
                <label htmlFor="branch-form-city" className={styles.formLabel}>
                  Ciudad{" "}
                  <span className={styles.requiredMark} aria-hidden="true">
                    *
                  </span>
                </label>
                <input
                  id="branch-form-city"
                  type="text"
                  className={styles.input}
                  value={values.city}
                  onChange={handleChange("city")}
                  placeholder="Ej. Cancún"
                  maxLength={50}
                  autoComplete="off"
                  {...errorProps("city")}
                />
                <FieldError message={getFieldError("city")} />
              </div>

              <div className={styles.formField}>
                <label htmlFor="branch-form-state" className={styles.formLabel}>
                  Estado{" "}
                  <span className={styles.requiredMark} aria-hidden="true">
                    *
                  </span>
                </label>
                <input
                  id="branch-form-state"
                  type="text"
                  className={styles.input}
                  value={values.state}
                  onChange={handleChange("state")}
                  placeholder="Ej. Quintana Roo"
                  maxLength={50}
                  autoComplete="off"
                  {...errorProps("state")}
                />
                <FieldError message={getFieldError("state")} />
              </div>

              <div className={styles.formField}>
                <label htmlFor="branch-form-phone" className={styles.formLabel}>
                  Teléfono
                </label>
                <input
                  id="branch-form-phone"
                  type="tel"
                  inputMode="numeric"
                  className={styles.input}
                  value={values.phone}
                  onChange={handleChange("phone")}
                  placeholder="Ej. 9999999999"
                  maxLength={10}
                  autoComplete="off"
                  {...errorProps("phone")}
                />
                <FieldError message={getFieldError("phone")} />
              </div>

              <div className={styles.formField}>
                <label htmlFor="branch-form-email" className={styles.formLabel}>
                  Correo
                </label>
                <input
                  id="branch-form-email"
                  type="email"
                  className={styles.input}
                  value={values.email}
                  onChange={handleChange("email")}
                  placeholder="contacto@sucursal.com"
                  maxLength={100}
                  autoComplete="off"
                  {...errorProps("email")}
                />
                <FieldError message={getFieldError("email")} />
              </div>

              <div className={`${styles.formField} ${styles.formFieldFull}`}>
                <label
                  htmlFor="branch-form-address"
                  className={styles.formLabel}
                >
                  Dirección comercial
                </label>
                <textarea
                  id="branch-form-address"
                  className={styles.textarea}
                  value={values.address}
                  onChange={handleChange("address")}
                  placeholder="Dirección completa de la sucursal"
                  rows={3}
                  maxLength={255}
                />
              </div>

              <div className={styles.formField}>
                <label
                  htmlFor="branch-form-timezone"
                  className={styles.formLabel}
                >
                  Zona horaria{" "}
                  <span className={styles.requiredMark} aria-hidden="true">
                    *
                  </span>
                </label>
                <select
                  id="branch-form-timezone"
                  className={styles.select}
                  value={values.timezone || DEFAULT_TIMEZONE}
                  onChange={handleChange("timezone")}
                  {...errorProps("timezone")}
                >
                  {BRANCH_TIMEZONE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <FieldError message={getFieldError("timezone")} />
              </div>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={styles.modalPrimaryButton}
              disabled={saving}
            >
              {saving
                ? "Guardando..."
                : isEdit
                  ? "Guardar cambios"
                  : "Crear sucursal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BranchFormModal;
