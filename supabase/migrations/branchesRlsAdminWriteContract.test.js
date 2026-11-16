import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (name) =>
  readFileSync(join(process.cwd(), "supabase/migrations", name), "utf8");

const raw = read("20261115180000_branches_rls_admin_write.sql");
const sql = raw.replace(/--.*$/gm, "").replace(/\s+/g, " ");

describe("RLS de branches con escritura solo para admin", () => {
  it("activa RLS en branches", () => {
    expect(sql).toContain(
      "alter table public.branches enable row level security;"
    );
  });

  it("conserva la lectura de anon que usa el login", () => {
    expect(sql).toContain(
      "create policy branches_select_anon on public.branches for select to anon using (true);"
    );
  });

  it("revoca toda escritura a anon e insert/delete a authenticated", () => {
    expect(sql).toContain(
      "revoke insert, update, delete, truncate on table public.branches from anon;"
    );
    expect(sql).toContain(
      "revoke insert, delete, truncate on table public.branches from authenticated;"
    );
    expect(sql).not.toMatch(/\bgrant\b/);
  });

  it("limita el update a admins", () => {
    expect(sql).toContain(
      "create policy branches_update_admin on public.branches for update to authenticated using (public.is_admin()) with check (public.is_admin());"
    );
  });

  it("rechaza cambiar branch_type en un update", () => {
    expect(sql).toContain(
      "if new.branch_type is distinct from old.branch_type then raise exception"
    );
    expect(sql).toContain(
      "before update of branch_type on public.branches for each row execute function public.reject_branch_type_change();"
    );
  });

  it("documenta el rollback", () => {
    expect(raw).toContain("Rollback:");
  });
});
