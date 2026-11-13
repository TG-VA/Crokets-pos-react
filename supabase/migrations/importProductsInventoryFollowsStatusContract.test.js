import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20261110120000_import_products_inventory_follows_status.sql"
);

const rawSql = readFileSync(MIGRATION, "utf8");
const sql = rawSql.replace(/\s+/g, " ");

const IMPORT_PARAMS = "p_rows jsonb, p_branch_id uuid, p_all_branches jsonb";

describe("contrato SQL: inventario importado sigue el status del producto", () => {
  it("redefine import_products_transaction con la misma firma y search_path", () => {
    expect(sql).toMatch(
      /CREATE OR REPLACE FUNCTION public\.import_products_transaction\( p_rows jsonb, p_branch_id uuid, p_all_branches jsonb \) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'/
    );
  });

  it("lee status del producto con default true", () => {
    expect(sql).toContain(
      "v_status := coalesce((v_product ->> 'status')::boolean, true);"
    );
  });

  it("usa v_status para products.status y para cada branch_inventory.is_active", () => {
    const inventoryInserts = sql.match(
      /insert into public\.branch_inventory \([^)]*\) values \([^;]*\);/g
    );

    expect(inventoryInserts).toHaveLength(2);
    inventoryInserts.forEach((statement) => {
      expect(statement).toContain("v_status");
      expect(statement).not.toMatch(
        /max_stock\s*end, true,|v_max_stock, true,/
      );
    });
    expect(sql).not.toContain(
      "coalesce((v_product ->> 'status')::boolean, true), v_is_global"
    );
    expect(sql).toContain("v_status, v_is_global,");
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
