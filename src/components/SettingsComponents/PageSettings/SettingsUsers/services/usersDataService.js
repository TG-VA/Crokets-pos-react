import { supabase } from "../../../../../lib/supabaseClient";

export const USER_SELECT_CANDIDATES = [
  "id, name, username, email, status, role_id, created_at, roles ( name )",
  "id, name, username, email, status, role_id, created_at",
  "id, username, email, status, created_at, roles ( name )",
  "id, username, email, status, created_at",
];

export const normalizeRoleName = (rolesValue) => {
  if (Array.isArray(rolesValue)) {
    return rolesValue[0]?.name || null;
  }

  return rolesValue?.name || null;
};

export const normalizeUserRow = (row) => {
  const roleName = normalizeRoleName(row?.roles);
  const username = (row?.username || row?.email || "SIN USUARIO")
    .toString()
    .trim();

  return {
    id: row?.id || username,
    name: row?.name ? String(row.name).trim() : "",
    username,
    email: row?.email || "",
    status: typeof row?.status === "boolean" ? row.status : null,
    roleId: row?.role_id || null,
    roleName: roleName || "SIN ROL",
    createdAt: row?.created_at || null,
  };
};

export const fetchUsers = async () => {
  let lastError = null;

  for (const selectClause of USER_SELECT_CANDIDATES) {
    const { data, error } = await supabase
      .from("users")
      .select(selectClause)
      .order("created_at", { ascending: false });

    if (!error) {
      return {
        success: true,
        data: Array.isArray(data) ? data.map(normalizeUserRow) : [],
        error: null,
      };
    }

    lastError = error;
  }

  console.error("Error consultando usuarios:", lastError);

  return {
    success: false,
    data: [],
    error: lastError?.message || "No se pudieron consultar los usuarios.",
  };
};

export const fetchRoles = async () => {
  const { data, error } = await supabase
    .from("roles")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error consultando roles:", error);

    return {
      success: false,
      data: [],
      error: error.message || "No se pudieron consultar los roles.",
    };
  }

  return {
    success: true,
    data: Array.isArray(data) ? data : [],
    error: null,
  };
};

export const updateUser = async ({ id, name, username, roleId }) => {
  if (!id) {
    return {
      success: false,
      data: null,
      error: "Falta el identificador del usuario.",
    };
  }

  const params = {
    p_user_id: id,
    p_name: typeof name === "string" ? name.trim() : null,
    p_username:
      typeof username === "string" ? username.trim().toLowerCase() : null,
    p_role_id: roleId || null,
  };

  if (
    params.p_name === null &&
    params.p_username === null &&
    params.p_role_id === null
  ) {
    return { success: true, data: null, error: null };
  }

  // La tabla users no admite escritura directa desde el cliente: la RPC exige
  // is_admin() y evita que un administrador se quite su propio rol.
  const { data, error } = await supabase.rpc("admin_update_user", params);

  if (error) {
    console.error("Error actualizando usuario:", error);

    return {
      success: false,
      data: null,
      error: error.message || "No se pudo actualizar el usuario.",
    };
  }

  return {
    success: true,
    data: data ? normalizeUserRow(data) : null,
    error: null,
  };
};

export const updateUserStatus = async ({ id, status }) => {
  if (!id || typeof status !== "boolean") {
    return {
      success: false,
      data: null,
      error: "Datos insuficientes para cambiar el estado del usuario.",
    };
  }

  const { data, error } = await supabase.rpc("admin_set_user_status", {
    p_user_id: id,
    p_status: status,
  });

  if (error) {
    console.error("Error cambiando el estado del usuario:", error);

    return {
      success: false,
      data: null,
      error: error.message || "No se pudo cambiar el estado del usuario.",
    };
  }

  return {
    success: true,
    data: data ? normalizeUserRow(data) : null,
    error: null,
  };
};

/**
 * Restablece la contraseña de un usuario existente.
 *
 * La contraseña vive en `auth.users`, que solo se puede escribir con la
 * service role. Por eso la operación se delega a la edge function
 * `admin-reset-user-password`, que valida que quien invoca tenga rol de
 * administrador antes de aplicar el cambio. El guardado de los datos básicos
 * (nombre y rol) es independiente y no depende de este resultado.
 */
export const updateUserPassword = async ({ id, password }) => {
  const targetId = String(id || "").trim();
  const cleanPassword = String(password || "");

  if (!targetId) {
    return {
      success: false,
      data: null,
      error: "Falta el identificador del usuario.",
    };
  }

  if (cleanPassword.length < 6) {
    return {
      success: false,
      data: null,
      error: "La contraseña debe tener al menos 6 caracteres.",
    };
  }

  const { data, error } = await supabase.functions.invoke(
    "admin-reset-user-password",
    {
      body: { targetId, newPassword: cleanPassword },
    }
  );

  if (error) {
    console.error("Error restableciendo la contraseña del usuario:", error);

    return {
      success: false,
      data: null,
      error:
        "No se pudo restablecer la contraseña. Intenta de nuevo más tarde.",
    };
  }

  if (data && data.ok === false) {
    return {
      success: false,
      data: null,
      error: data.message || "No se pudo restablecer la contraseña.",
    };
  }

  return { success: true, data: { id: targetId }, error: null };
};

/**
 * Registra un usuario nuevo.
 *
 * La cuenta de autenticacion se crea con privilegios de servicio dentro de la
 * edge function `admin-create-user`, que valida que quien invoca sea un
 * administrador activo y confirma el correo automaticamente (`email_confirm`).
 * Asi el administrador no pierde su sesion ni depende de la confirmacion por
 * correo del nuevo usuario. El perfil en `public.users` se escribe en la misma
 * funcion; si falla, la funcion elimina la cuenta de auth para evitar huerfanos.
 */
export const createUser = async ({
  name,
  username,
  email,
  roleId,
  password,
}) => {
  const cleanUsername = String(username || "").trim();
  const cleanEmail = String(email || "")
    .trim()
    .toLowerCase();
  const cleanName = String(name || "").trim();
  const cleanPassword = String(password || "");

  if (!cleanUsername || !cleanEmail || !roleId || !cleanPassword) {
    return {
      success: false,
      data: null,
      error: "Completa nombre de usuario, correo, rol y contraseña.",
    };
  }

  const { data, error } = await supabase.functions.invoke("admin-create-user", {
    body: {
      name: cleanName,
      username: cleanUsername,
      email: cleanEmail,
      roleId,
      password: cleanPassword,
    },
  });

  if (error || data?.ok === false) {
    console.error("Error creando el usuario:", error || data);

    return {
      success: false,
      data: null,
      error: data?.message || error?.message || "No se pudo crear el usuario.",
    };
  }

  return {
    success: true,
    data: data?.data ?? null,
    requiresConfirmation: false,
    error: null,
  };
};
