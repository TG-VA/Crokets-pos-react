import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const raw = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20261118140000_users_roles_write_admin_only.sql"
  ),
  "utf8"
);
const sql = raw.replace(/--.*$/gm, "").replace(/\s+/g, " ");

const functionBody = (name) => {
  const start = sql.indexOf(`create or replace function public.${name}(`);
  const end = sql.indexOf("$function$;", start);

  return sql.slice(start, end);
};

const TABLES = [
  "users",
  "roles",
  "role_permissions",
  "permissions",
  "user_roles",
];

describe("escritura de usuarios y roles solo para administradores", () => {
  it.each(TABLES)(
    "deja %s en solo lectura para anon y authenticated",
    (table) => {
      const revoke = `revoke all on table public.${table} from anon, authenticated;`;
      const grant = `grant select on table public.${table} to anon, authenticated;`;

      expect(sql).toContain(revoke);
      expect(sql).toContain(grant);
      expect(sql.indexOf(revoke)).toBeLessThan(sql.indexOf(grant));
    }
  );

  it("no otorga sobre las tablas nada distinto de select", () => {
    // TABLE es opcional en GRANT: se toma todo grant que no sea sobre funciones.
    const tableGrants = sql.match(/grant [^;]* on (?!function )[^;]*;/g) ?? [];

    expect(tableGrants).toHaveLength(TABLES.length);
    tableGrants.forEach((statement) => {
      expect(statement).toMatch(
        /^grant select on table public\.\w+ to anon, authenticated;$/
      );
    });
  });

  it.each(["admin_update_user", "admin_set_user_status"])(
    "%s exige is_admin() con 42501 antes de escribir",
    (name) => {
      const body = functionBody(name);

      expect(body).toContain("security definer set search_path to 'public'");
      expect(body).toMatch(
        /if not public\.is_admin\(\) then raise exception '[^']+' using errcode = '42501';/
      );
      expect(body.indexOf("public.is_admin()")).toBeLessThan(
        body.indexOf("update public.users")
      );
    }
  );

  it("impide que el administrador se quite su propio rol", () => {
    expect(functionBody("admin_update_user")).toMatch(
      /if p_user_id = auth\.uid\(\) and v_role_name <> 'admin' then raise exception 'No puedes quitarte el rol de administrador\.';/
    );
  });

  it("impide que el administrador se desactive a si mismo", () => {
    expect(functionBody("admin_set_user_status")).toMatch(
      /if p_user_id = auth\.uid\(\) and p_status = false then raise exception 'No puedes desactivar tu propio usuario\.';/
    );
  });

  it("guarda el username en minusculas como exige users_username_lowercase_check", () => {
    expect(functionBody("admin_update_user")).toContain(
      "else lower(btrim(p_username))"
    );
  });

  it("admin_update_user conserva los campos que no se envian", () => {
    const body = functionBody("admin_update_user");

    expect(body).toContain(
      "set name = case when p_name is null then u.name else btrim(p_name) end"
    );
    expect(body).toContain("when p_username is null then u.username");
    expect(body).toContain("role_id = coalesce(p_role_id, u.role_id)");
  });

  it("admin_update_user rechaza un rol inexistente con mensaje propio", () => {
    expect(functionBody("admin_update_user")).toContain(
      "if v_role_name is null then raise exception 'El rol seleccionado no existe.';"
    );
  });

  it("admin_set_user_status rechaza datos nulos", () => {
    expect(functionBody("admin_set_user_status")).toContain(
      "if p_user_id is null or p_status is null then raise exception 'Datos insuficientes para cambiar el estado del usuario.';"
    );
  });

  it.each(["admin_update_user", "admin_set_user_status"])(
    "%s falla si el usuario no existe en lugar de devolver una fila vacia",
    (name) => {
      const body = functionBody(name);
      const check =
        "if v_user.id is null then raise exception 'El usuario no existe.';";

      expect(body).toContain(check);
      expect(body.indexOf("returning u.* into v_user;")).toBeLessThan(
        body.indexOf(check)
      );
      expect(body.indexOf(check)).toBeLessThan(
        body.indexOf("return jsonb_build_object(")
      );
    }
  );

  it("solo authenticated puede ejecutar las RPCs", () => {
    expect(sql).toContain(
      "revoke all on function public.admin_update_user(uuid, text, text, uuid) from public, anon;"
    );
    expect(sql).toContain(
      "revoke all on function public.admin_set_user_status(uuid, boolean) from public, anon;"
    );
    expect(sql).toContain(
      "grant execute on function public.admin_update_user(uuid, text, text, uuid) to authenticated;"
    );
    expect(sql).toContain(
      "grant execute on function public.admin_set_user_status(uuid, boolean) to authenticated;"
    );
  });
});
