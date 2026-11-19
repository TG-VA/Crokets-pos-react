import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect, vi } from "vitest";
import {
  ADJUSTMENT_ERROR_HINTS,
  ADMIN_GRANT_REQUIRED_HINT,
} from "../../src/components/InventoryComponents/PageInventory/PageAdjustments/services/inventoryAdjustmentService";

vi.mock("../../src/lib/supabaseClient", () => ({ supabase: {} }));

const ADMIN_GRANT_REQUIRED_MESSAGE =
  "Ajustar inventario requiere la autorizacion de un administrador.";

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20261118150000_apply_inventory_adjustment_rpc.sql"
);

const rawSql = readFileSync(MIGRATION, "utf8");
const normalizedSql = rawSql.replace(/\s+/g, " ");
const body = normalizedSql.slice(normalizedSql.indexOf("as $$"));

const SIGNATURE =
  "public.apply_inventory_adjustment(uuid, uuid, numeric, text, text)";

describe("contrato SQL del ajuste transaccional de inventario", () => {
  it("declara la RPC como security definer con search_path fijo", () => {
    expect(normalizedSql).toMatch(
      /create or replace function public\.apply_inventory_adjustment\( p_branch_id uuid, p_product_id uuid, p_quantity numeric, p_reason text, p_notes text default null \) returns jsonb language plpgsql security definer set search_path = public/i
    );
  });

  it("revoca anon/public y otorga EXECUTE a authenticated y service_role", () => {
    expect(normalizedSql).toContain(
      `revoke all on function ${SIGNATURE} from public, anon;`
    );
    expect(normalizedSql).toContain(
      `grant execute on function ${SIGNATURE} to authenticated, service_role;`
    );
  });

  it("exige acceso a la sucursal y admin o autorizacion vigente de ajustes", () => {
    expect(normalizedSql).toMatch(
      /not public\._user_can_access_branch\(p_branch_id\)/i
    );
    expect(normalizedSql).toContain(
      "and not public.is_admin() and not exists ( select 1 from public.admin_action_grants g where g.granted_to = v_actor and g.action = 'inventory_adjust_access' and g.branch_id = p_branch_id and g.expires_at > now() ) then"
    );
    expect(normalizedSql).toContain(
      `raise exception '${ADMIN_GRANT_REQUIRED_MESSAGE}' using errcode = '42501';`
    );
  });

  it("exige diferencia entera distinta de 0 y motivo", () => {
    expect(normalizedSql).toMatch(/if p_quantity = 0 then raise exception/i);
    expect(normalizedSql).toMatch(
      /if p_quantity <> trunc\(p_quantity\) then raise exception/i
    );
    expect(normalizedSql).toMatch(/if v_reason = '' then raise exception/i);
  });

  it("comprueba el permiso y bloquea la fila antes de leer el stock", () => {
    const guard = body.search(/not public\.is_admin\(\)/);
    const lock = body.search(
      /perform pg_advisory_xact_lock\(hashtext\('branch_inventory:'/
    );
    const read = body.search(
      /from public\.branch_inventory where branch_id = p_branch_id and product_id = p_product_id for update;/
    );

    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(lock);
    expect(lock).toBeLessThan(read);
  });

  it("rechaza con los hints que el cliente traduce", () => {
    for (const hint of ADJUSTMENT_ERROR_HINTS) {
      expect(body).toContain(`using hint = '${hint}'`);
    }
    expect(body).toMatch(/if v_new_stock < 0 then raise exception/);
  });

  it("no altera el CPP ni valoriza el movimiento", () => {
    expect(body).not.toMatch(/cost_price/);
    expect(body).not.toMatch(/unit_cost|total_cost/);
  });

  it("no crea filas de inventario: el alta es de Agregar", () => {
    expect(body).not.toMatch(/insert into public\.branch_inventory/);
  });

  it("registra el movimiento de tipo adjustment en la misma funcion", () => {
    expect(body).toMatch(/insert into public\.inventory_movements/);
    expect(body).toContain("'adjustment',");
  });
});

const HINT_MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20261118160000_apply_inventory_adjustment_grant_hint.sql"
);

const hintSql = readFileSync(HINT_MIGRATION, "utf8").replace(/\s+/g, " ");
const stripHeader = (sql) =>
  sql.slice(sql.indexOf("create or replace function"));

describe("contrato SQL del hint de autorizacion vencida (20261118160000)", () => {
  it("rechaza la falta de autorizacion con el hint que compara el cliente", () => {
    expect(hintSql).toContain(
      `raise exception '${ADMIN_GRANT_REQUIRED_MESSAGE}' using errcode = '42501', hint = '${ADMIN_GRANT_REQUIRED_HINT}';`
    );
  });

  it("no cambia nada mas de la funcion respecto a 20261118150000", () => {
    const expected = stripHeader(normalizedSql).replace(
      "using errcode = '42501'; end if; if p_quantity is null",
      `using errcode = '42501', hint = '${ADMIN_GRANT_REQUIRED_HINT}'; end if; if p_quantity is null`
    );

    expect(stripHeader(hintSql)).toBe(expected);
  });
});
