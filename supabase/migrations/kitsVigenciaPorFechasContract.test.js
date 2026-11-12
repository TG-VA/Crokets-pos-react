import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20261101120000_kits_vigencia_por_fechas.sql"
);

const sql = readFileSync(MIGRATION, "utf8").replace(/\s+/g, " ");

const extractFunction = (name) => {
  const start = sql.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`);
  if (start === -1) return "";
  const next = sql.indexOf("CREATE OR REPLACE FUNCTION", start + 10);
  return sql.slice(start, next === -1 ? undefined : next);
};

describe("migracion de vigencia por fechas de kits", () => {
  it("agrega columnas opcionales y el CHECK de rango", () => {
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS starts_on date");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS ends_on date");
    expect(sql).toContain("product_kits_validity_range_chk");
    expect(sql).toContain("ends_on >= starts_on");
  });

  it("define kit_is_available con zona horaria y limites inclusivos", () => {
    const fn = extractFunction("kit_is_available");
    expect(fn).toContain("p_timezone");
    expect(fn).toContain(">= p_starts_on");
    expect(fn).toContain("<= p_ends_on");
  });

  it("create_sale_transaction valida la vigencia con la zona de la sucursal", () => {
    const fn = extractFunction("create_sale_transaction");
    expect(fn).toContain("v_branch_timezone");
    expect(fn).toContain("from public.branches b");
    expect(fn).toContain("public.kit_is_available(");
    expect(fn).toContain("fuera de su vigencia");
  });

  it("create_kit_transaction persiste las fechas", () => {
    const fn = extractFunction("create_kit_transaction");
    expect(fn).toContain(
      "insert into public.product_kits (kit_product_id, is_active, starts_on, ends_on"
    );
    expect(fn).toContain("no puede ser anterior");
  });

  it("update_kit_transaction no borra fechas si el cliente omite las llaves", () => {
    const fn = extractFunction("update_kit_transaction");
    expect(fn).toContain("p_kit_product ? 'starts_on'");
    expect(fn).toContain(
      "case when v_has_validity then v_starts_on else starts_on end"
    );
  });

  it("restringe permisos y no elimina tablas", () => {
    expect(sql).toContain(
      "REVOKE ALL ON FUNCTION public.kit_is_available(boolean, date, date, text) FROM anon"
    );
    expect(sql).not.toMatch(/\bDROP TABLE\b/i);
  });
});
