import { supabase } from "./supabaseClient";

export const authorizeAdminAction = async ({
  username,
  password,
  action,
  targetId = null,
  branchId = null,
}) => {
  const cleanUsername = String(username || "").trim().toLowerCase();
  const cleanPassword = String(password || "").trim();
  const cleanAction = String(action || "").trim();

  if (!cleanUsername) {
    return {
      ok: false,
      message: "Ingresa el usuario administrador.",
    };
  }

  if (!cleanPassword) {
    return {
      ok: false,
      message: "Ingresa la contraseña del administrador.",
    };
  }

  if (!cleanAction) {
    return {
      ok: false,
      message: "No se recibió la acción a autorizar.",
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke(
      "authorize-admin-action",
      {
        body: {
          username: cleanUsername,
          password: cleanPassword,
          action: cleanAction,
          targetId,
          branchId,
        },
      }
    );

    if (error) {
      console.error("Error llamando authorize-admin-action:", error);

      return {
        ok: false,
        message: "No se pudo validar la autorización del administrador.",
      };
    }

    if (!data?.ok) {
      return {
        ok: false,
        message: data?.message || "No se pudo autorizar la acción.",
      };
    }

    return {
      ok: true,
      authorizedBy: data.authorizedBy || null,
      authorizedByUsername: data.authorizedByUsername || cleanUsername,
      action: data.action || cleanAction,
      targetId: data.targetId || targetId,
      branchId: data.branchId || branchId,
    };
  } catch (error) {
    console.error("Error general autorizando acción admin:", error);

    return {
      ok: false,
      message: "Ocurrió un error al validar la autorización.",
    };
  }
};