import { useMemo, useState } from "react";

export const USER_FORM_CREATE = "create";
export const USER_FORM_EDIT = "edit";

const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const NAME_MAX_LENGTH = 100;
export const USERNAME_MAX_LENGTH = 50;
export const PASSWORD_MIN_LENGTH = 6;

export const USERNAME_TAKEN_MESSAGE = "Nombre de usuario no disponible";
export const USERNAME_AVAILABLE_MESSAGE = "Nombre de usuario válido";
export const EMAIL_TAKEN_MESSAGE = "Correo electrónico no disponible";
export const EMAIL_AVAILABLE_MESSAGE = "Correo electrónico válido";
export const PASSWORD_MATCH_MESSAGE = "Las contraseñas coinciden";

const LIVE_FEEDBACK_FIELDS = new Set(["username", "email", "confirmPassword"]);

// El nombre completo se captura en mayusculas y el username en minusculas, que
// es el formato que persiste usersDataService y que exige la base con
// users_username_lowercase_check.
const FIELD_CASING = {
  name: (value) => value.toUpperCase(),
  username: (value) => value.toLowerCase(),
};

const collectTakenValues = (existingUsers, currentUserId = null) => {
  const usernames = new Set();
  const emails = new Set();

  for (const item of Array.isArray(existingUsers) ? existingUsers : []) {
    if (currentUserId && item?.id === currentUserId) continue;

    const username = String(item?.username || "")
      .trim()
      .toLowerCase();
    const email = String(item?.email || "")
      .trim()
      .toLowerCase();

    if (username) usernames.add(username);
    if (email) emails.add(email);
  }

  return { usernames, emails };
};

const resolveRoleName = (roleName) => {
  const normalized = String(roleName || "")
    .trim()
    .toLowerCase();

  if (normalized === "admin" || normalized === "cajero") {
    return normalized;
  }

  return "cajero";
};

const buildInitialValues = (mode, user) => ({
  name: user?.name || user?.username || "",
  username: user?.username || "",
  email: user?.email || "",
  role: resolveRoleName(user?.roleName),
  password: "",
  confirmPassword: "",
});

const normalizeValues = (values) => ({
  ...values,
  name: String(values.name || "")
    .trim()
    .toUpperCase(),
  username: String(values.username || "")
    .trim()
    .toLowerCase(),
  email: String(values.email || "")
    .trim()
    .toLowerCase(),
});

export const validateUserForm = (
  values,
  mode,
  existingUsers = [],
  currentUserId = null
) => {
  const errors = {};
  const name = String(values.name || "").trim();

  if (!name) {
    errors.name = "El nombre completo es obligatorio.";
  } else if (name.length < 2) {
    errors.name = "El nombre debe tener al menos 2 caracteres.";
  } else if (name.length > NAME_MAX_LENGTH) {
    errors.name = `El nombre no puede superar los ${NAME_MAX_LENGTH} caracteres.`;
  }

  if (!values.role) {
    errors.role = "Selecciona un rol.";
  }

  const { usernames, emails } = collectTakenValues(
    existingUsers,
    currentUserId
  );
  const username = String(values.username || "").trim();

  if (!username) {
    errors.username = "El nombre de usuario es obligatorio.";
  } else if (username.length < 3) {
    errors.username = "Debe tener al menos 3 caracteres.";
  } else if (username.length > USERNAME_MAX_LENGTH) {
    errors.username = `No puede superar los ${USERNAME_MAX_LENGTH} caracteres.`;
  } else if (!USERNAME_PATTERN.test(username)) {
    errors.username =
      "Solo puede contener letras, números, punto, guion y guion bajo.";
  } else if (usernames.has(username.toLowerCase())) {
    errors.username = USERNAME_TAKEN_MESSAGE;
  }

  if (mode === USER_FORM_CREATE) {
    const email = String(values.email || "").trim();

    if (!email) {
      errors.email = "El correo es obligatorio.";
    } else if (!EMAIL_PATTERN.test(email)) {
      errors.email = "Correo electrónico inválido.";
    } else if (emails.has(email.toLowerCase())) {
      errors.email = EMAIL_TAKEN_MESSAGE;
    }

    if (!values.password) {
      errors.password = "La contraseña es obligatoria.";
    } else if (values.password.length < PASSWORD_MIN_LENGTH) {
      errors.password = `Debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
    }

    if (values.password !== values.confirmPassword) {
      errors.confirmPassword = "Las contraseñas no coinciden.";
    }
  } else {
    const password = String(values.password || "");
    const confirmPassword = String(values.confirmPassword || "");

    if (password.length > 0 || confirmPassword.length > 0) {
      if (!password) {
        errors.password = "Ingresa la nueva contraseña para confirmarla.";
      } else if (password.length < PASSWORD_MIN_LENGTH) {
        errors.password = `Debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
      }

      if (password !== confirmPassword) {
        errors.confirmPassword = "Las contraseñas no coinciden.";
      }
    }
  }

  return errors;
};

/**
 * Estado y validación en vivo del formulario de usuario.
 *
 * No persiste nada: la vista del modal decide que hacer con `values` al
 * enviar. Se usa una `key` en el componente para reinitializar el formulario
 * cuando cambia el usuario objetivo.
 */
const useUserForm = ({
  mode = USER_FORM_CREATE,
  user = null,
  existingUsers = [],
  onSubmit,
}) => {
  const [values, setValues] = useState(() => buildInitialValues(mode, user));
  const [touched, setTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const currentUserId = user?.id || null;

  const errors = useMemo(
    () => validateUserForm(values, mode, existingUsers, currentUserId),
    [values, mode, existingUsers, currentUserId]
  );

  const handleChange = (field, value) => {
    const applyCasing = FIELD_CASING[field];

    setValues((prev) => ({
      ...prev,
      [field]: applyCasing ? applyCasing(String(value ?? "")) : value,
    }));
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const getFieldError = (field) => {
    if (LIVE_FEEDBACK_FIELDS.has(field)) {
      const rawValue = String(values[field] || "").trim();

      if (rawValue && errors[field]) return errors[field];
    }

    if (!touched[field] && !submitAttempted) return "";

    return errors[field] || "";
  };

  const getFieldSuccess = (field) => {
    if (field === "username") {
      const username = String(values.username || "").trim();

      if (!username || errors.username) return "";

      return USERNAME_AVAILABLE_MESSAGE;
    }

    if (field === "email" && mode === USER_FORM_CREATE) {
      const email = String(values.email || "").trim();

      if (!email || errors.email) return "";

      return EMAIL_AVAILABLE_MESSAGE;
    }

    if (field === "confirmPassword") {
      const password = String(values.password || "");
      const confirmPassword = String(values.confirmPassword || "");

      if (errors.password || errors.confirmPassword) return "";
      if (password.length < PASSWORD_MIN_LENGTH || !confirmPassword) return "";
      if (password !== confirmPassword) return "";

      return PASSWORD_MATCH_MESSAGE;
    }

    return "";
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitAttempted(true);

    if (Object.keys(errors).length > 0) return;

    onSubmit(normalizeValues(values));
  };

  return {
    errors,
    getFieldError,
    getFieldSuccess,
    handleBlur,
    handleChange,
    handleSubmit,
    isEdit: mode === USER_FORM_EDIT,
    submitAttempted,
    values,
  };
};

export default useUserForm;
