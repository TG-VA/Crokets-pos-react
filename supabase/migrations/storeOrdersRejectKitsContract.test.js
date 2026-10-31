import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (name) =>
  readFileSync(join(process.cwd(), "supabase/migrations", name), "utf8");

const sql = read("20261030150000_store_orders_reject_kits.sql").replace(
  /\s+/g,
  " "
);
const previous = read("20261025200000_store_orders_revoke_anon.sql");

describe("create_store_order rechaza kits", () => {
  it("lee is_kit del producto y rechaza la partida", () => {
    expect(sql).toContain("coalesce(p.is_kit, false)");
    expect(sql).toContain("if v_is_kit then");
    expect(sql).toContain("es un kit y no se puede pedir");
  });

  it("conserva firma, SECURITY DEFINER y grants restringidos", () => {
    expect(sql).toContain(
      "create_store_order(p_order_name text, p_from_branch_id uuid, p_to_branch_id uuid, p_user_id uuid, p_notes text, p_items jsonb)"
    );
    expect(sql).toContain("SECURITY DEFINER");
    expect(sql).toContain("from public, anon");
    expect(sql).toContain("to authenticated, service_role");
  });

  it("conserva las validaciones de la definicion anterior", () => {
    [
      "El nombre del pedido es obligatorio.",
      "La sucursal de origen y destino deben ser diferentes.",
      "No tienes acceso a la sucursal de origen.",
      "La cantidad esperada debe ser un numero entero.",
    ].forEach((message) => {
      expect(previous).toContain(message);
      expect(sql).toContain(message);
    });
  });
});
