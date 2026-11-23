import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");

const sql = read(
  "supabase/migrations/20261122160000_products_deactivate_admin_or_grant.sql"
)
  .replace(/--.*$/gm, "")
  .replace(/\s+/g, " ");

const edgeFunction = read("supabase/functions/authorize-admin-action/index.ts");

describe("desactivar productos exige admin o autorizacion vigente", () => {
  it("el trigger solo actua sobre cambios de status", () => {
    expect(sql).toContain(
      "create trigger products_deactivate_admin_or_grant before update of status on public.products for each row"
    );
  });

  it("solo exige la autorizacion al pasar de activo a inactivo desde la API", () => {
    expect(sql).toContain(
      "if coalesce(auth.role(), '') not in ('anon', 'authenticated') then return new;"
    );
    expect(sql).toContain(
      "if old.status is distinct from false and new.status = false then"
    );
  });

  it("acepta admin o un grant vigente de products_delete_access", () => {
    expect(sql).toContain("not public.is_admin()");
    expect(sql).toContain("g.granted_to = v_actor");
    expect(sql).toContain("g.action = 'products_delete_access'");
    expect(sql).toContain("g.expires_at > now()");
    expect(sql).toContain(
      "using errcode = '42501', hint = 'ADMIN_GRANT_REQUIRED'"
    );
  });

  it("la edge function registra la autorizacion de products_delete_access", () => {
    expect(edgeFunction).toMatch(/products_delete_access: \d+,/);
  });
});
