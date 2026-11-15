import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (name) =>
  readFileSync(join(process.cwd(), "supabase/migrations", name), "utf8");

const raw = read("20261115120000_branches_branch_type.sql");
const sql = raw.replace(/--.*$/gm, "").replace(/\s+/g, " ");

describe("branches.branch_type", () => {
  it("agrega la columna not null con default operational", () => {
    expect(sql).toContain(
      "add column if not exists branch_type text not null default 'operational'"
    );
  });

  it("restringe los valores a operational y admin", () => {
    expect(sql).toContain("check (branch_type in ('operational', 'admin'))");
  });

  it("marca solo ADM-BREN como admin", () => {
    expect(sql).toContain(
      "update public.branches set branch_type = 'admin' where code = 'ADM-BREN';"
    );
    expect(sql.match(/\bupdate\b/g)).toHaveLength(1);
  });

  it("documenta el rollback y no borra datos", () => {
    expect(raw).toContain("drop column if exists branch_type");
    expect(sql).not.toMatch(/\b(drop|delete|truncate)\b/);
  });
});
