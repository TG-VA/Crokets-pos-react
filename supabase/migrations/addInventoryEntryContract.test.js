import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20261117230000_add_inventory_entry_rpc.sql"
);

const normalizedSql = readFileSync(MIGRATION, "utf8").replace(/\s+/g, " ");

const SIGNATURE = "public.add_inventory_entry(uuid, uuid, numeric, numeric)";

const NON_FINITE =
  /\('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric\)/;

describe("contrato SQL del alta transaccional de inventario", () => {
  it("declara la RPC como security definer con search_path fijo", () => {
    expect(normalizedSql).toMatch(
      /create or replace function public\.add_inventory_entry\( p_branch_id uuid, p_product_id uuid, p_quantity numeric, p_incoming_cost numeric default null \) returns jsonb language plpgsql security definer set search_path = public/i
    );
  });

  it("valida el acceso a la sucursal del usuario autenticado", () => {
    expect(normalizedSql).toMatch(
      /not public\._user_can_access_branch\(p_branch_id\)/i
    );
  });

  it("rechaza cantidades y costos no finitos", () => {
    expect(normalizedSql).toMatch(
      new RegExp(`p_quantity in ${NON_FINITE.source}`, "i")
    );
    expect(normalizedSql).toMatch(
      new RegExp(`p_incoming_cost in ${NON_FINITE.source}`, "i")
    );
  });

  it("exige cantidad entera positiva y costo dentro del tope", () => {
    expect(normalizedSql).toMatch(/if p_quantity <= 0 then raise exception/i);
    expect(normalizedSql).toMatch(
      /if p_quantity <> trunc\(p_quantity\) then raise exception/i
    );
    expect(normalizedSql).toMatch(
      /if p_incoming_cost < 0 then raise exception/i
    );
    expect(normalizedSql).toMatch(
      /if p_incoming_cost > 1000000 then raise exception/i
    );
  });

  it("bloquea la fila antes de leer el stock vigente", () => {
    const lock = normalizedSql.search(
      /perform pg_advisory_xact_lock\(hashtext\('branch_inventory:'/i
    );
    const read = normalizedSql.search(
      /from public\.branch_inventory where branch_id = p_branch_id and product_id = p_product_id for update;/i
    );

    expect(lock).toBeGreaterThan(-1);
    expect(lock).toBeLessThan(read);
  });

  it("sin costo de compra valoriza al CPP vigente", () => {
    expect(normalizedSql).toContain(
      "v_cost := round(coalesce(p_incoming_cost, v_current_cost), 2);"
    );
  });

  it("pondera el CPP y toma el lote entrante sin stock previo", () => {
    expect(normalizedSql).toMatch(
      /if v_previous <= 0 then v_new_cost := v_cost;/i
    );
    expect(normalizedSql).toMatch(
      /\(v_previous \* v_current_cost \+ p_quantity \* v_cost\) \/ \(v_previous \+ p_quantity\)/i
    );
  });

  it("conserva los motivos Entrada común y Alta inicial", () => {
    expect(normalizedSql).toContain("then 'Entrada común' else 'Alta inicial'");
  });

  it("registra el movimiento en la misma funcion", () => {
    expect(normalizedSql).toMatch(/insert into public\.inventory_movements/i);
    expect(normalizedSql).toMatch(/'entry',/);
  });

  it("fecha el movimiento con la hora local de la sucursal", () => {
    expect(normalizedSql).toContain(
      "select now() at time zone coalesce(b.timezone, 'America/Cancun')"
    );
    expect(normalizedSql).toMatch(
      /round\(v_cost \* p_quantity, 2\), v_local_now \);/
    );
  });

  it("revoca anon y concede authenticated", () => {
    expect(normalizedSql).toContain(
      `revoke all on function ${SIGNATURE} from public, anon;`
    );
    expect(normalizedSql).toContain(
      `grant execute on function ${SIGNATURE} to authenticated, service_role;`
    );
  });
});
