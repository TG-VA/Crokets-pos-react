import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20261117235000_add_inventory_entry_admin_or_grant.sql"
);

const normalizedSql = readFileSync(MIGRATION, "utf8").replace(/\s+/g, " ");

const SIGNATURE = "public.add_inventory_entry(uuid, uuid, numeric, numeric)";

describe("contrato SQL de add_inventory_entry con admin o autorizacion", () => {
  it("crea admin_action_grants con RLS y sin acceso del cliente", () => {
    expect(normalizedSql).toMatch(
      /create table if not exists public\.admin_action_grants \(/i
    );
    expect(normalizedSql).toContain(
      "alter table public.admin_action_grants enable row level security;"
    );
    expect(normalizedSql).toContain(
      "revoke all on table public.admin_action_grants from public, anon, authenticated;"
    );
    expect(normalizedSql).not.toMatch(/create policy/i);
  });

  it("exige admin o una autorizacion vigente del mismo usuario y sucursal", () => {
    expect(normalizedSql).toContain(
      "if v_actor is not null and not public.is_admin() and not exists ( select 1 from public.admin_action_grants g where g.granted_to = v_actor and g.action = 'inventory_add_access' and g.branch_id = p_branch_id and g.expires_at > now() ) then raise exception"
    );
  });

  it("comprueba el permiso antes de tocar el inventario", () => {
    const guard = normalizedSql.search(/not public\.is_admin\(\)/);
    const lock = normalizedSql.search(/perform pg_advisory_xact_lock/);

    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(lock);
  });

  it("conserva la firma y los grants de la RPC", () => {
    expect(normalizedSql).toMatch(
      /create or replace function public\.add_inventory_entry\( p_branch_id uuid, p_product_id uuid, p_quantity numeric, p_incoming_cost numeric default null \) returns jsonb language plpgsql security definer set search_path = public/i
    );
    expect(normalizedSql).toContain(
      `revoke all on function ${SIGNATURE} from public, anon;`
    );
    expect(normalizedSql).toContain(
      `grant execute on function ${SIGNATURE} to authenticated, service_role;`
    );
  });
});
