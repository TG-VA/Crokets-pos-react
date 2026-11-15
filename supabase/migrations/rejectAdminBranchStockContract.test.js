import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (name) =>
  readFileSync(join(process.cwd(), "supabase/migrations", name), "utf8");

const raw = read("20261115140000_reject_admin_branch_stock.sql");
const sql = raw.replace(/--.*$/gm, "").replace(/\s+/g, " ");

const STOCK_TRIGGERS = [
  {
    table: "sales",
    trigger: "trg_sales_operational_branch",
    columns: "branch_id",
    args: "'branch_id', 'sucursal de venta'",
  },
  {
    table: "inventory_movements",
    trigger: "trg_inventory_movements_operational_branch",
    columns: "branch_id",
    args: "'branch_id', 'sucursal de un movimiento de inventario'",
  },
  {
    table: "inventory_transfers",
    trigger: "trg_inventory_transfers_operational_branch",
    columns: "from_branch_id, to_branch_id",
    args: "'from_branch_id', 'origen del traspaso', 'to_branch_id', 'destino del traspaso'",
  },
  {
    table: "store_orders",
    trigger: "trg_store_orders_operational_branch",
    columns: "from_branch_id, to_branch_id",
    args: "'from_branch_id', 'origen del pedido', 'to_branch_id', 'destino del pedido'",
  },
];

describe("rechazo de sucursales admin como sucursal de stock", () => {
  it("rechaza con un error claro solo las sucursales admin", () => {
    expect(sql).toContain("and b.branch_type = 'admin';");
    expect(sql).toContain(
      "raise exception 'La sucursal % es administrativa y no puede usarse como %.', v_code, p_role"
    );
    expect(sql).toContain("if p_branch_id is null then return; end if;");
  });

  it.each(STOCK_TRIGGERS)(
    "valida $table antes de insertar o cambiar la sucursal",
    ({ table, trigger, columns, args }) => {
      expect(sql).toContain(
        `create trigger ${trigger} before insert or update of ${columns} on public.${table} for each row execute function public.tg_reject_admin_stock_branch( ${args} );`
      );
      expect(sql).toContain(
        `drop trigger if exists ${trigger} on public.${table};`
      );
    }
  );

  it("no valida branch_inventory para no romper el alta de productos", () => {
    expect(sql).not.toContain("on public.branch_inventory");
  });

  it("fija search_path y no expone las funciones a clientes", () => {
    expect(
      sql.match(/security definer set search_path = public/g)
    ).toHaveLength(2);
    expect(sql).toContain(
      "revoke all on function public.assert_operational_branch(uuid, text) from public, anon, authenticated;"
    );
    expect(sql).toContain(
      "revoke all on function public.tg_reject_admin_stock_branch() from public, anon, authenticated;"
    );
    expect(sql).not.toMatch(/\bgrant\b/);
  });

  it("documenta el rollback de triggers y funciones", () => {
    STOCK_TRIGGERS.forEach(({ trigger }) => expect(raw).toContain(trigger));
    expect(raw).toContain("Rollback:");
    expect(raw).toContain(
      "drop function if exists public.assert_operational_branch(uuid, text);"
    );
  });
});
