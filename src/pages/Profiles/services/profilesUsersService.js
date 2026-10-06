import { supabase } from "../../../lib/supabaseClient";

const normalizeRoleName = (rolesValue) => {
  if (Array.isArray(rolesValue)) {
    return rolesValue[0]?.name || null;
  }
  return rolesValue?.name || null;
};

const normalizeUserRow = (row) => {
  const roleName = normalizeRoleName(row?.roles);
  const username = (row?.username || row?.email || "SIN USUARIO")
    .toString()
    .trim();

  return {
    id: row?.id || username,
    username,
    email: row?.email || "SIN CORREO",
    status: typeof row?.status === "boolean" ? row.status : null,
    roleName: roleName || "SIN ROL",
    createdAt: row?.created_at || null,
  };
};

/**
 * Consulta los usuarios visibles para el usuario actual.
 *
 * Vive fuera de los componentes porque no escribe estado: asi el efecto que la
 * dispara puede limitarse a pedir los datos y aplicar el resultado en la
 * continuacion asincrona, sin un setState sincrono que provoque un render en
 * cascada. El primer `select` pide el rol; si la vista `roles` no esta expuesta
 * para el rol actual se reintenta sin ella.
 */
export const fetchProfilesUsers = async () => {
  const candidates = [
    "id, username, email, status, created_at, roles ( name )",
    "id, username, email, status, created_at",
  ];

  let data = null;
  let lastError = null;

  for (const selectClause of candidates) {
    const result = await supabase
      .from("users")
      .select(selectClause)
      .order("created_at", { ascending: false });

    if (!result.error) {
      data = result.data;
      lastError = null;
      break;
    }

    lastError = result.error;
  }

  if (lastError) {
    throw lastError;
  }

  return Array.isArray(data) ? data.map(normalizeUserRow) : [];
};
