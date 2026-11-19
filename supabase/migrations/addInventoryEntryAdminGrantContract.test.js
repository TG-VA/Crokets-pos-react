import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect, vi } from "vitest";
import { ADMIN_GRANT_REQUIRED_HINT } from "../../src/components/InventoryComponents/PageInventory/PageAdd/services/inventoryAddService";

vi.mock("../../src/lib/supabaseClient", () => ({ supabase: {} }));

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20261117235000_add_inventory_entry_admin_or_grant.sql"
);

const normalizedSql = readFileSync(MIGRATION, "utf8").replace(/\s+/g, " ");

// Texto del rechazo en SQL. El cliente ya no lo compara (solo el hint), pero
// sigue fijando que 20261118170000 no cambio el mensaje.
const ADMIN_GRANT_REQUIRED_MESSAGE =
  "requiere la autorizacion de un administrador";

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

  it("rechaza con 42501 y el texto de autorizacion requerida", () => {
    expect(normalizedSql).toContain(
      `raise exception 'Agregar inventario ${ADMIN_GRANT_REQUIRED_MESSAGE}.' using errcode = '42501';`
    );
  });
});

const HINT_MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20261118170000_add_inventory_entry_grant_hint.sql"
);

const hintSql = readFileSync(HINT_MIGRATION, "utf8").replace(/\s+/g, " ");
const functionBody = (sql) =>
  sql.slice(
    sql.indexOf("create or replace function public.add_inventory_entry"),
    sql.indexOf(`grant execute on function ${SIGNATURE}`)
  );

describe("contrato SQL del hint de autorizacion vencida (20261118170000)", () => {
  it("rechaza la falta de autorizacion con el hint que compara el cliente", () => {
    expect(hintSql).toContain(
      `raise exception 'Agregar inventario ${ADMIN_GRANT_REQUIRED_MESSAGE}.' using errcode = '42501', hint = '${ADMIN_GRANT_REQUIRED_HINT}';`
    );
  });

  it("no cambia nada mas de la funcion respecto a 20261117235000", () => {
    const expected = functionBody(normalizedSql).replace(
      `${ADMIN_GRANT_REQUIRED_MESSAGE}.' using errcode = '42501';`,
      `${ADMIN_GRANT_REQUIRED_MESSAGE}.' using errcode = '42501', hint = '${ADMIN_GRANT_REQUIRED_HINT}';`
    );

    expect(functionBody(hintSql)).toBe(expected);
  });

  it("conserva los grants y no da acceso a anon", () => {
    expect(hintSql).toContain(
      `revoke all on function ${SIGNATURE} from public, anon;`
    );
    expect(hintSql).toContain(
      `grant execute on function ${SIGNATURE} to authenticated, service_role;`
    );
  });
});
