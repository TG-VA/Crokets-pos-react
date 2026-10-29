// Normaliza el username al formato canonico de public.users: sin espacios en
// los extremos y en minusculas. La base garantiza ese mismo formato con la
// restriccion users_username_lowercase_check, por lo que la busqueda puede
// comparar por igualdad en lugar de armar un patron LIKE (donde `*`, `%` y `_`
// tendrian significado propio).
export const normalizeUsername = (value: unknown): string =>
  String(value || "")
    .trim()
    .toLowerCase();

// Formato permitido para un username ya normalizado: solo ASCII sin espacios.
// Excluir caracteres no ASCII evita que toLowerCase() de JavaScript y lower()
// de PostgreSQL difieran y que la restriccion users_username_lowercase_check
// rechace el alta despues de crear la cuenta en Auth.
const USERNAME_PATTERN = /^[a-z0-9_.-]+$/;

export const isValidUsername = (value: string): boolean =>
  USERNAME_PATTERN.test(value);
