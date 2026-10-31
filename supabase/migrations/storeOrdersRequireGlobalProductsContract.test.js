import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (name) =>
  readFileSync(join(process.cwd(), "supabase/migrations", name), "utf8");

const sql = read("20261030160000_store_orders_require_global_products.sql");
const normalizedSql = sql.replace(/\s+/g, " ");
const previous = read("20261030150000_store_orders_reject_kits.sql");

describe("create_store_order exige productos globales", () => {
  it("lee is_global del producto y rechaza los que no lo son", () => {
    expect(normalizedSql).toContain("coalesce(p.is_global, false)");
    expect(normalizedSql).toContain("if not v_is_global then");
    expect(normalizedSql).toContain("es local y no se puede pedir");
  });

  it("valida kits antes que productos locales", () => {
    expect(sql.indexOf("if v_is_kit then")).toBeGreaterThan(-1);
    expect(sql.indexOf("if v_is_kit then")).toBeLessThan(
      sql.indexOf("if not v_is_global then")
    );
  });

  it("conserva firma, SECURITY DEFINER y grants restringidos", () => {
    expect(normalizedSql).toContain(
      "create_store_order(p_order_name text, p_from_branch_id uuid, p_to_branch_id uuid, p_user_id uuid, p_notes text, p_items jsonb)"
    );
    expect(normalizedSql).toContain("SECURITY DEFINER");
    expect(normalizedSql).toContain("from public, anon");
    expect(normalizedSql).toContain("to authenticated, service_role");
  });

  it("conserva las validaciones de la definicion anterior", () => {
    [
      "El nombre del pedido es obligatorio.",
      "No tienes acceso a la sucursal de origen.",
      "La cantidad esperada debe ser un numero entero.",
      "es un kit y no se puede pedir",
    ].forEach((message) => {
      expect(previous).toContain(message);
      expect(sql).toContain(message);
    });
  });
});
