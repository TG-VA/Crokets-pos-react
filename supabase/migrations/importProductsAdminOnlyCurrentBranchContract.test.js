import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20261110130000_import_products_admin_only_current_branch.sql"
);

const rawSql = readFileSync(MIGRATION, "utf8");
const sql = rawSql.replace(/\s+/g, " ");

const IMPORT_PARAMS = "p_rows jsonb, p_branch_id uuid, p_all_branches jsonb";

describe("contrato SQL: importacion solo admin y en la sucursal actual", () => {
  it("conserva firma, SECURITY DEFINER y search_path", () => {
    expect(sql).toMatch(
      /CREATE OR REPLACE FUNCTION public\.import_products_transaction\( p_rows jsonb, p_branch_id uuid, p_all_branches jsonb \) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'/
    );
  });

  it("rechaza a quien no es admin antes de insertar", () => {
    const guard = sql.indexOf("if not public.is_admin() then");
    const firstInsert = sql.indexOf("insert into public.products");

    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(firstInsert);
    expect(sql).toContain(
      "raise exception 'Solo un administrador puede importar productos.';"
    );
  });

  it("crea inventario solo en p_branch_id y no recorre p_all_branches", () => {
    const inventoryInserts = sql.match(
      /insert into public\.branch_inventory \([^)]*\) values \([^;]*\);/g
    );

    expect(inventoryInserts).toHaveLength(1);
    expect(inventoryInserts[0]).toContain("p_branch_id, v_product_id");
    expect(inventoryInserts[0]).toContain("v_status");
    expect(sql).not.toContain("jsonb_array_elements(coalesce(p_all_branches");
  });

  it("mantiene los grants: sin anon ni public, con authenticated y service_role", () => {
    [
      `REVOKE ALL ON FUNCTION public.import_products_transaction(${IMPORT_PARAMS}) FROM public;`,
      `REVOKE ALL ON FUNCTION public.import_products_transaction(${IMPORT_PARAMS}) FROM anon;`,
      `GRANT EXECUTE ON FUNCTION public.import_products_transaction(${IMPORT_PARAMS}) TO authenticated;`,
      `GRANT EXECUTE ON FUNCTION public.import_products_transaction(${IMPORT_PARAMS}) TO service_role;`,
    ].forEach((statement) => expect(rawSql).toContain(statement));
  });
});
