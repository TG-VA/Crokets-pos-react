import { useEffect, useState } from "react";

import styles from "../SettingsUsers.module.css";
import useUserForm, {
  NAME_MAX_LENGTH,
  USER_FORM_EDIT,
  USERNAME_MAX_LENGTH,
} from "../hooks/useUserForm";
import { ROLE_FORM_OPTIONS } from "../hooks/useSettingsUsers";
import eyeIcon from "../../../../../assets/icons/eye-solid-full.svg";
import eyeSlashIcon from "../../../../../assets/icons/eye-slash-solid-full.svg";

const COPY_FEEDBACK_TIMEOUT = 1500;

const UserFormModal = ({
  isOpen,
  mode,
  user,
  saving,
  isCurrentUser,
  existingUsers,
  onSubmit,
  onClose,
}) => {
  const isEdit = mode === USER_FORM_EDIT;
  const isRoleLocked = isEdit && isCurrentUser;

  const {
    values,
    getFieldError,
    getFieldSuccess,
    handleBlur,
    handleChange,
    handleSubmit,
  } = useUserForm({ mode, user, existingUsers, onSubmit });

  const [idCopied, setIdCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const handleCopyId = async () => {
    if (!user?.id) return;

    try {
      await navigator.clipboard.writeText(user.id);
      setIdCopied(true);
      window.setTimeout(() => setIdCopied(false), COPY_FEEDBACK_TIMEOUT);
    } catch (error) {
      console.error("No se pudo copiar el identificador del usuario:", error);
    }
  };

  const nameError = getFieldError("name");
  const usernameError = getFieldError("username");
  const usernameSuccess = getFieldSuccess("username");
  const emailError = getFieldError("email");
  const emailSuccess = getFieldSuccess("email");
  const roleError = getFieldError("role");
  const passwordError = getFieldError("password");
  const confirmPasswordError = getFieldError("confirmPassword");
  const confirmPasswordSuccess = getFieldSuccess("confirmPassword");

  const passwordLabel = isEdit ? "Nueva contraseña" : "Contraseña inicial";
  const confirmPasswordLabel = isEdit
    ? "Confirmar nueva contraseña"
    : "Confirmar contraseña";
  const passwordPlaceholder = isEdit
    ? "Dejar en blanco para mantener la actual"
    : "";
  const passwordHint = isEdit
    ? "Opcional. Mínimo 6 caracteres si se define."
    : "Mínimo 6 caracteres.";

  return (
    <div className={styles.modalOverlay} onMouseDown={handleOverlayMouseDown}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-users-form-title"
      >
        <div className={styles.modalHeader}>
          <h2 id="settings-users-form-title" className={styles.modalTitle}>
            {isEdit ? "Editar usuario" : "Nuevo usuario"}
          </h2>
          <p className={styles.modalSubtitle}>
            {isEdit
              ? "Actualiza el nombre, el rol y, si lo necesitas, la contraseña."
              : "Crea una cuenta de acceso al sistema."}
          </p>
        </div>

        <form className={styles.modalBody} onSubmit={handleSubmit} noValidate>
          {isEdit ? (
            <dl className={styles.readonlyGrid}>
              <div className={styles.readonlyItem}>
                <dt className={styles.readonlyLabel}>Correo electrónico</dt>
                <dd className={styles.readonlyValue}>
                  {values.email || "Sin correo"}
                </dd>
              </div>

              <div
                className={[styles.readonlyItem, styles.readonlyItemFull]
                  .filter(Boolean)
                  .join(" ")}
              >
                <dt className={styles.readonlyLabel}>Identificador</dt>
                <dd className={styles.readonlyValue}>
                  <code className={styles.readonlyCode}>
                    {user?.id || "n/a"}
                  </code>
                  <button
                    type="button"
                    className={styles.readonlyCopyButton}
                    onClick={handleCopyId}
                  >
                    {idCopied ? "Copiado" : "Copiar"}
                  </button>
                </dd>
              </div>
            </dl>
          ) : null}

          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="settings-users-name">
              Nombre completo
            </label>
            <input
              id="settings-users-name"
              type="text"
              maxLength={NAME_MAX_LENGTH}
              className={[
                styles.formInput,
                styles.uppercaseInput,
                nameError ? styles.fieldInvalid : "",
              ]
                .filter(Boolean)
                .join(" ")}
              value={values.name}
              autoFocus
              onChange={(event) => handleChange("name", event.target.value)}
              onBlur={() => handleBlur("name")}
              disabled={saving}
              aria-invalid={nameError ? "true" : undefined}
              aria-describedby={
                nameError ? "settings-users-name-error" : undefined
              }
            />
            {nameError ? (
              <span
                id="settings-users-name-error"
                className={styles.fieldError}
              >
                {nameError}
              </span>
            ) : null}
          </div>

          <div className={styles.formGroup}>
            <label
              htmlFor="settings-users-username"
              className={styles.formLabel}
            >
              Usuario
            </label>
            <input
              id="settings-users-username"
              type="text"
              maxLength={USERNAME_MAX_LENGTH}
              className={[
                styles.formInput,
                usernameError
                  ? styles.fieldInvalid
                  : usernameSuccess
                    ? styles.fieldValid
                    : "",
              ]
                .filter(Boolean)
                .join(" ")}
              value={values.username}
              onChange={(event) => handleChange("username", event.target.value)}
              onBlur={() => handleBlur("username")}
              disabled={saving}
              aria-invalid={usernameError ? "true" : undefined}
              aria-describedby={
                usernameError ? "settings-users-username-error" : undefined
              }
              autoComplete="off"
            />
            {usernameError ? (
              <span
                id="settings-users-username-error"
                className={styles.fieldError}
              >
                {usernameError}
              </span>
            ) : usernameSuccess ? (
              <span className={styles.fieldSuccess}>{usernameSuccess}</span>
            ) : (
              <span className={styles.fieldHint}>
                Solo letras, números, punto, guion y guion bajo. Sin espacios.
              </span>
            )}
          </div>

          {!isEdit ? (
            <>
              <div className={styles.formGroup}>
                <label
                  htmlFor="settings-users-email"
                  className={styles.formLabel}
                >
                  Correo electrónico
                </label>
                <input
                  id="settings-users-email"
                  type="email"
                  className={[
                    styles.formInput,
                    emailError
                      ? styles.fieldInvalid
                      : emailSuccess
                        ? styles.fieldValid
                        : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  value={values.email}
                  onChange={(event) =>
                    handleChange("email", event.target.value)
                  }
                  onBlur={() => handleBlur("email")}
                  disabled={saving}
                  aria-invalid={emailError ? "true" : undefined}
                  aria-describedby={
                    emailError ? "settings-users-email-error" : undefined
                  }
                  autoComplete="off"
                />
                {emailError ? (
                  <span
                    id="settings-users-email-error"
                    className={styles.fieldError}
                  >
                    {emailError}
                  </span>
                ) : emailSuccess ? (
                  <span className={styles.fieldSuccess}>{emailSuccess}</span>
                ) : null}
              </div>
            </>
          ) : null}

          <div className={styles.formGroup}>
            <label
              htmlFor="settings-users-form-role"
              className={styles.formLabel}
            >
              Rol
            </label>
            <select
              id="settings-users-form-role"
              className={[
                styles.formSelect,
                roleError ? styles.fieldInvalid : "",
              ]
                .filter(Boolean)
                .join(" ")}
              value={values.role}
              onChange={(event) => handleChange("role", event.target.value)}
              disabled={saving || isRoleLocked}
              aria-invalid={roleError ? "true" : undefined}
              aria-describedby={
                roleError ? "settings-users-role-error" : undefined
              }
            >
              {ROLE_FORM_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {isRoleLocked ? (
              <span className={styles.fieldHint}>
                No puedes cambiar tu propio rol.
              </span>
            ) : null}
            {roleError ? (
              <span
                id="settings-users-role-error"
                className={styles.fieldError}
              >
                {roleError}
              </span>
            ) : null}
          </div>

          <div className={styles.formGroup}>
            <label
              htmlFor="settings-users-password"
              className={styles.formLabel}
            >
              {passwordLabel}
            </label>
            <div className={styles.passwordInputWrapper}>
              <input
                id="settings-users-password"
                type={showPassword ? "text" : "password"}
                className={[
                  styles.formInput,
                  passwordError ? styles.fieldInvalid : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                value={values.password}
                placeholder={passwordPlaceholder}
                onChange={(event) =>
                  handleChange("password", event.target.value)
                }
                onBlur={() => handleBlur("password")}
                disabled={saving}
                aria-invalid={passwordError ? "true" : undefined}
                aria-describedby={
                  passwordError ? "settings-users-password-error" : undefined
                }
                autoComplete="new-password"
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                tabIndex={-1}
              >
                <img
                  src={showPassword ? eyeSlashIcon : eyeIcon}
                  alt=""
                  aria-hidden="true"
                  className={styles.passwordToggleIcon}
                />
              </button>
            </div>
            {passwordError ? (
              <span
                id="settings-users-password-error"
                className={styles.fieldError}
              >
                {passwordError}
              </span>
            ) : (
              <span className={styles.fieldHint}>{passwordHint}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label
              htmlFor="settings-users-confirm-password"
              className={styles.formLabel}
            >
              {confirmPasswordLabel}
            </label>
            <div className={styles.passwordInputWrapper}>
              <input
                id="settings-users-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                className={[
                  styles.formInput,
                  confirmPasswordError
                    ? styles.fieldInvalid
                    : confirmPasswordSuccess
                      ? styles.fieldValid
                      : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                value={values.confirmPassword}
                onChange={(event) =>
                  handleChange("confirmPassword", event.target.value)
                }
                onBlur={() => handleBlur("confirmPassword")}
                disabled={saving}
                aria-invalid={confirmPasswordError ? "true" : undefined}
                aria-describedby={
                  confirmPasswordError
                    ? "settings-users-confirm-password-error"
                    : undefined
                }
                autoComplete="off"
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={
                  showConfirmPassword
                    ? "Ocultar contraseña"
                    : "Mostrar contraseña"
                }
                tabIndex={-1}
              >
                <img
                  src={showConfirmPassword ? eyeSlashIcon : eyeIcon}
                  alt=""
                  aria-hidden="true"
                  className={styles.passwordToggleIcon}
                />
              </button>
            </div>
            {confirmPasswordError ? (
              <span
                id="settings-users-confirm-password-error"
                className={styles.fieldError}
              >
                {confirmPasswordError}
              </span>
            ) : confirmPasswordSuccess ? (
              <span className={styles.fieldSuccess}>
                {confirmPasswordSuccess}
              </span>
            ) : null}
          </div>

          <div className={styles.modalActions}>
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
              className={styles.primaryButton}
              disabled={saving}
            >
              {saving
                ? "Guardando..."
                : isEdit
                  ? "Guardar cambios"
                  : "Crear usuario"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormModal;
