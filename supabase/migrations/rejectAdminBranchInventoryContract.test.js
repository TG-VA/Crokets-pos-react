import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (name) =>
  readFileSync(join(process.cwd(), "supabase/migrations", name), "utf8");

const raw = read("20261115160000_reject_admin_branch_inventory.sql");
const sql = raw.replace(/--.*$/gm, "").replace(/\s+/g, " ");

describe("branch_inventory rechaza sucursales admin", () => {
  it("valida la sucursal antes de insertar o cambiarla", () => {
    expect(sql).toContain(
      "create trigger trg_branch_inventory_operational_branch before insert or update of branch_id on public.branch_inventory for each row execute function public.tg_reject_admin_stock_branch( 'branch_id', 'sucursal de inventario' );"
    );
  });

  it("es idempotente y documenta el rollback", () => {
    expect(sql).toContain(
      "drop trigger if exists trg_branch_inventory_operational_branch on public.branch_inventory;"
    );
    expect(raw).toContain("Rollback:");
  });
});
