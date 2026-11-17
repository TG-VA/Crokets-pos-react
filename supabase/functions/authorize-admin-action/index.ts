import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { normalizeUsername } from "../_shared/normalizeUsername.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Acciones que la base de datos vuelve a comprobar: la autorizacion se registra en
// `admin_action_grants` a nombre de quien llama y la RPC correspondiente la consulta.
const DB_ENFORCED_GRANT_HOURS: Record<string, number> = {
  inventory_add_access: 12,
};

const jsonResponse = (body: unknown, status = 200) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        ok: false,
        message: "Método no permitido.",
      },
      405
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return jsonResponse(
        {
          ok: false,
          message: "Faltan variables de entorno de Supabase.",
        },
        500
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const supabaseAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const body = await req.json();

    const username = normalizeUsername(body?.username);
    const password = String(body?.password || "").trim();
    const action = String(body?.action || "").trim();
    const targetId = body?.targetId || null;
    const branchId = body?.branchId || null;

    if (!username) {
      return jsonResponse({
        ok: false,
        message: "Ingresa el usuario administrador.",
      });
    }

    if (!password) {
      return jsonResponse({
        ok: false,
        message: "Ingresa la contraseña del administrador.",
      });
    }

    if (!action) {
      return jsonResponse({
        ok: false,
        message: "No se recibió la acción a autorizar.",
      });
    }

    const { data: adminUser, error: adminUserError } = await supabaseAdmin
      .from("users")
      .select(`
        id,
        username,
        email,
        status,
        roles (
          name
        )
      `)
      .eq("username", username)
      .maybeSingle();

    if (adminUserError) {
      console.error("Error consultando usuario administrador:", adminUserError);

      return jsonResponse(
        {
          ok: false,
          message: "No se pudo validar el usuario administrador.",
        },
        500
      );
    }

    if (!adminUser) {
      return jsonResponse({
        ok: false,
        message: "Usuario administrador o contraseña incorrectos.",
      });
    }

    if (adminUser.status !== true) {
      return jsonResponse({
        ok: false,
        message: "El usuario administrador está inactivo.",
      });
    }

    const roleName = Array.isArray(adminUser.roles)
      ? adminUser.roles[0]?.name
      : adminUser.roles?.name;

    if (roleName !== "admin") {
      return jsonResponse({
        ok: false,
        message: "El usuario ingresado no tiene rol de administrador.",
      });
    }

    if (!adminUser.email) {
      return jsonResponse({
        ok: false,
        message: "El usuario administrador no tiene email configurado.",
      });
    }

    const { data: signInData, error: signInError } =
      await supabaseAuthClient.auth.signInWithPassword({
        email: adminUser.email,
        password,
      });

    if (signInError || !signInData?.user) {
      return jsonResponse({
        ok: false,
        message: "Usuario administrador o contraseña incorrectos.",
      });
    }

    if (signInData.user.id !== adminUser.id) {
      await supabaseAuthClient.auth.signOut({ scope: "local" });

      return jsonResponse({
        ok: false,
        message: "Las credenciales no coinciden con el usuario administrador.",
      });
    }

    await supabaseAuthClient.auth.signOut({ scope: "local" });

    const grantHours = DB_ENFORCED_GRANT_HOURS[action];

    if (grantHours) {
      const token = (req.headers.get("Authorization") || "").replace(
        /^Bearer\s+/i,
        ""
      );
      const { data: callerData } = token
        ? await supabaseAdmin.auth.getUser(token)
        : { data: null };
      const callerId = callerData?.user?.id;

      if (!callerId || !branchId) {
        return jsonResponse({
          ok: false,
          message: "No se pudo identificar la sesión o la sucursal a autorizar.",
        });
      }

      const { error: grantError } = await supabaseAdmin
        .from("admin_action_grants")
        .insert({
          action,
          branch_id: branchId,
          granted_to: callerId,
          granted_by: adminUser.id,
          expires_at: new Date(
            Date.now() + grantHours * 60 * 60 * 1000
          ).toISOString(),
        });

      if (grantError) {
        console.error("Error registrando la autorización:", grantError);

        return jsonResponse(
          {
            ok: false,
            message: "No se pudo registrar la autorización.",
          },
          500
        );
      }
    }

    return jsonResponse({
      ok: true,
      authorizedBy: adminUser.id,
      authorizedByUsername: adminUser.username,
      action,
      targetId,
      branchId,
    });
  } catch (error) {
    console.error("Error general en authorize-admin-action:", error);

    return jsonResponse(
      {
        ok: false,
        message: "Ocurrió un error al validar la autorización.",
      },
      500
    );
  }
});
