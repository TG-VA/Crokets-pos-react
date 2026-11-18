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
    "revoca la escritura de %s a anon y authenticated",
    (table) => {
      expect(sql).toContain(
        `revoke insert, update, delete, truncate on table public.${table} from anon, authenticated;`
      );
    }
  );

  it("conserva la lectura y no vuelve a otorgar escritura sobre las tablas", () => {
    expect(sql).not.toMatch(/revoke [^;]*select[^;]* on table/);
    expect(sql).not.toMatch(/grant [^;]* on table/);
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
