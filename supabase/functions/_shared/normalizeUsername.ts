// Normaliza el username al formato canonico de public.users: sin espacios en
// los extremos y en minusculas. La base garantiza ese mismo formato con la
// restriccion users_username_lowercase_check, por lo que la busqueda puede
// comparar por igualdad en lugar de armar un patron LIKE (donde `*`, `%` y `_`
// tendrian significado propio).
export const normalizeUsername = (value: unknown): string =>
  String(value || "")
    .trim()
    .toLowerCase();
