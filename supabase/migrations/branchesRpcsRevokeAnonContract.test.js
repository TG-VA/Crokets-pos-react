import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (name) =>
  readFileSync(join(process.cwd(), "supabase/migrations", name), "utf8");

const raw = read("20261115150000_branches_rpcs_revoke_anon.sql");
const sql = raw.replace(/--.*$/gm, "").replace(/\s+/g, " ");

describe("RPCs de sucursales sin anon", () => {
  it("revoca anon en create_branch de 10 argumentos y en set_branch_active", () => {
    expect(sql).toContain(
      "revoke execute on function public.create_branch(text, text, uuid, text, text, text, text, text, text, text) from anon;"
    );
    expect(sql).toContain(
      "revoke execute on function public.set_branch_active(uuid, boolean, uuid) from anon;"
    );
  });

  it("no toca authenticated ni otorga permisos", () => {
    expect(sql).not.toContain("authenticated");
    expect(sql).not.toMatch(/\bgrant\b/);
  });

  it("documenta el rollback", () => {
    expect(raw).toContain("Rollback:");
  });
});
