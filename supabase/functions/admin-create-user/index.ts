import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const resolveRoleName = (rolesValue) => {
  if (Array.isArray(rolesValue)) {
    return rolesValue[0]?.name || null;
  }

  return rolesValue?.name || null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, message: "Método no permitido." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return jsonResponse(
        { ok: false, message: "Faltan variables de entorno de Supabase." },
        500
      );
    }

    const authorization =
      req.headers.get("Authorization") || req.headers.get("authorization");

    if (!authorization) {
      return jsonResponse(
        { ok: false, message: "No se recibió la sesión del administrador." },
        401
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authorization } },
    });

    const {
      data: { user: caller },
      error: callerError,
    } = await supabaseUser.auth.getUser();

    if (callerError || !caller) {
      return jsonResponse(
        { ok: false, message: "La sesión del administrador no es válida." },
        401
      );
    }

    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from("users")
      .select("id, status, roles ( name )")
      .eq("id", caller.id)
      .maybeSingle();

    if (profileError) {
      console.error("Error consultando al administrador:", profileError);

      return jsonResponse(
        { ok: false, message: "No se pudo validar al administrador." },
        500
      );
    }

    if (!callerProfile || callerProfile.status !== true) {
      return jsonResponse({
        ok: false,
        message: "El administrador no está activo.",
      });
    }

    if (resolveRoleName(callerProfile.roles) !== "admin") {
      return jsonResponse({
        ok: false,
        message: "Solo un administrador puede crear usuarios.",
      });
    }

    const body = await req.json();
    const cleanName = String(body?.name || "").trim();
    const cleanUsername = String(body?.username || "")
      .trim()
      .toLowerCase();
    const cleanEmail = String(body?.email || "")
      .trim()
      .toLowerCase();
    const cleanPassword = String(body?.password || "");
    const roleId = String(body?.roleId || "").trim();

    if (!cleanName || !cleanUsername || !cleanEmail || !roleId) {
      return jsonResponse({
        ok: false,
        message: "Completa nombre, usuario, correo y rol.",
      });
    }

    if (cleanPassword.length < 6) {
      return jsonResponse({
        ok: false,
        message: "La contraseña debe tener al menos 6 caracteres.",
      });
    }

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: cleanPassword,
        email_confirm: true,
        user_metadata: { name: cleanName, username: cleanUsername },
      });

    if (authError) {
      console.error("Error creando la cuenta del usuario:", authError);

      return jsonResponse({ ok: false, message: authError.message });
    }

    const authUserId = authData?.user?.id;

    if (!authUserId) {
      return jsonResponse({
        ok: false,
        message: "No se recibió el identificador del usuario creado.",
      });
    }

    const { error: insertError } = await supabaseAdmin.from("users").insert({
      id: authUserId,
      name: cleanName,
      username: cleanUsername,
      email: cleanEmail,
      role_id: roleId,
      status: true,
    });

    if (insertError) {
      console.error("Error creando el perfil del usuario:", insertError);

      const { error: deleteError } =
        await supabaseAdmin.auth.admin.deleteUser(authUserId);

      if (deleteError) {
        console.error(
          "Error eliminando la cuenta huérfana del usuario:",
          deleteError
        );
      }

      return jsonResponse({
        ok: false,
        message:
          insertError.message ||
          "La cuenta se creó pero no se pudo guardar el perfil.",
      });
    }

    return jsonResponse({ ok: true, data: { id: authUserId } });
  } catch (error) {
    console.error("Error general en admin-create-user:", error);

    return jsonResponse(
      { ok: false, message: "Ocurrió un error al crear el usuario." },
      500
    );
  }
});
