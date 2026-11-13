import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (name) =>
  readFileSync(join(process.cwd(), "supabase/migrations", name), "utf8");

const sql = read("20261113120000_is_admin_fixed_search_path.sql")
  .replace(/--.*$/gm, "")
  .replace(/\s+/g, " ");

describe("is_admin con search_path fijo", () => {
  it("fija search_path y califica las tablas", () => {
    expect(sql).toContain("set search_path = public");
    expect(sql).toContain("from public.users u");
    expect(sql).toContain("join public.roles r on r.id = u.role_id");
  });

  it("conserva la logica del rol admin activo", () => {
    expect(sql).toContain("where u.id = auth.uid()");
    expect(sql).toContain("and u.status = true");
    expect(sql).toContain("and r.name = 'admin'");
  });

  it("sigue STABLE, sin SECURITY DEFINER ni cambios de grants", () => {
    expect(sql).toContain("stable");
    expect(sql).not.toContain("security definer");
    expect(sql).not.toMatch(/\b(grant|revoke)\b/);
  });
});
