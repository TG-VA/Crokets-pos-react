import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");

const sql = read(
  "supabase/migrations/20261122150000_cash_exit_admin_or_grant.sql"
)
  .replace(/--.*$/gm, "")
  .replace(/\s+/g, " ");

const edgeFunction = read("supabase/functions/authorize-admin-action/index.ts");

describe("salidas de efectivo exigen admin o autorizacion vigente", () => {
  it("el trigger corre antes de cada insert en cash_movements", () => {
    expect(sql).toContain(
      "create trigger cash_exit_admin_or_grant before insert on public.cash_movements for each row"
    );
  });

  it("solo exige la autorizacion a las salidas que llegan por la API", () => {
    expect(sql).toContain(
      "if coalesce(auth.role(), '') not in ('anon', 'authenticated') then return new;"
    );
    expect(sql).toContain("if new.movement_type = 'salida' then");
  });

  it("acepta admin o un grant vigente de la misma sucursal", () => {
    expect(sql).toContain("not public.is_admin()");
    expect(sql).toContain("g.granted_to = v_actor");
    expect(sql).toContain("g.action = 'cash_exit_access'");
    expect(sql).toContain("g.branch_id = new.branch_id");
    expect(sql).toContain("g.expires_at > now()");
    expect(sql).toContain(
      "using errcode = '42501', hint = 'ADMIN_GRANT_REQUIRED'"
    );
  });

  it("la edge function registra la autorizacion de cash_exit_access", () => {
    expect(edgeFunction).toMatch(/cash_exit_access: \d+,/);
  });
});
