import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20261112120000_import_products_revoke_service_role.sql"
);

const sql = readFileSync(MIGRATION, "utf8");

const IMPORT_PARAMS = "p_rows jsonb, p_branch_id uuid, p_all_branches jsonb";

describe("contrato SQL: import_products_transaction sin service_role", () => {
  it("revoca EXECUTE de service_role y no otorga nada nuevo", () => {
    expect(sql).toContain(
      `REVOKE ALL ON FUNCTION public.import_products_transaction(${IMPORT_PARAMS}) FROM service_role;`
    );
    expect(sql).not.toMatch(/^\s*GRANT/m);
  });
});
