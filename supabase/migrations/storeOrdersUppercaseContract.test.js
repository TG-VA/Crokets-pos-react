import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20261025190000_store_orders_uppercase_names.sql"
);

const normalizedSql = readFileSync(MIGRATION, "utf8").replace(/\s+/g, " ");

describe("contrato SQL de nombres de pedido en mayusculas", () => {
  it("redefine create_store_order con la misma firma", () => {
    expect(normalizedSql).toMatch(
      /create or replace function public\.create_store_order\( p_order_name text, p_from_branch_id uuid, p_to_branch_id uuid, p_user_id uuid, p_notes text, p_items jsonb \)/i
    );
  });

  it("guarda el nombre en mayusculas y sin espacios sobrantes", () => {
    expect(normalizedSql).toMatch(/upper\(trim\(p_order_name\)\)/i);
    expect(normalizedSql).not.toMatch(/\n\s+trim\(p_order_name\),/);
  });

  it("conserva la validacion de nombre obligatorio y el folio", () => {
    expect(normalizedSql).toMatch(/El nombre del pedido es obligatorio/i);
    expect(normalizedSql).toMatch(
      /pg_advisory_xact_lock\(hashtext\('store_orders:folio:' \|\| v_day\)\)/i
    );
  });

  it("normaliza los nombres existentes de forma idempotente", () => {
    expect(normalizedSql).toMatch(
      /update public\.store_orders set order_name = upper\(order_name\) where order_name <> upper\(order_name\)/i
    );
  });
});
