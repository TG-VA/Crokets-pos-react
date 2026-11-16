import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (name) =>
  readFileSync(join(process.cwd(), "supabase/migrations", name), "utf8");

const raw = read("20261115170000_set_branch_active_admin_guard.sql");
const sql = raw.replace(/--.*$/gm, "").replace(/\s+/g, " ");
const previous = read("20261020120000_branches_is_active_management.sql");

describe("set_branch_active con guard anti-suplantacion", () => {
  it("fija el actor con auth.uid() y valida ese actor", () => {
    expect(sql).toContain(
      "v_admin_id uuid := coalesce(auth.uid(), p_admin_id);"
    );
    expect(sql).toContain("where u.id = v_admin_id");
    expect(sql).not.toContain("where u.id = p_admin_id");
  });

  it("conserva firma, SECURITY DEFINER, search_path y grants sin anon", () => {
    expect(sql).toContain(
      "CREATE OR REPLACE FUNCTION public.set_branch_active( p_branch_id uuid, p_is_active boolean, p_admin_id uuid )"
    );
    expect(sql).toContain("SECURITY DEFINER SET search_path = public");
    expect(sql).toContain(
      "revoke all on function public.set_branch_active(uuid, boolean, uuid) from public, anon;"
    );
    expect(sql).toContain(
      "grant execute on function public.set_branch_active(uuid, boolean, uuid) to authenticated, service_role;"
    );
  });

  it("conserva los bloqueos de la definicion anterior", () => {
    [
      "crs.status = 'open'",
      "t.status in ('pending_receipt', 'pending')",
      "El administrador no es válido.",
    ].forEach((fragment) => {
      expect(previous).toContain(fragment);
      expect(sql).toContain(fragment);
    });
  });
});
