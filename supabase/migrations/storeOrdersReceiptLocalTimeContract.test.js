import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20261118120000_store_orders_receipt_local_time.sql"
);

const normalizedSql = readFileSync(MIGRATION, "utf8").replace(/\s+/g, " ");

const RECEIVE_SIGNATURE =
  "public.receive_store_order(uuid, uuid, uuid, jsonb, text, jsonb)";

describe("contrato SQL de la hora local en la recepcion de pedidos", () => {
  it("conserva la firma de 6 argumentos sin eliminarla", () => {
    expect(normalizedSql).toMatch(
      /create or replace function public\.receive_store_order\( p_order_id uuid,/i
    );
    expect(normalizedSql).not.toMatch(/drop function/i);
  });

  it("resuelve la hora con la zona de la sucursal destino", () => {
    expect(normalizedSql).toContain(
      "select now() at time zone coalesce(b.timezone, 'America/Cancun') into v_local_now from public.branches b where b.id = p_to_branch_id;"
    );
  });

  it("cae en America/Cancun si no encuentra la sucursal", () => {
    expect(normalizedSql).toContain(
      "v_local_now := coalesce(v_local_now, now() at time zone 'America/Cancun');"
    );
  });

  it("fecha el movimiento de entrada con la hora local", () => {
    expect(normalizedSql).toMatch(
      /round\(v_cost \* v_received, 2\), v_local_now \);/
    );
  });

  it("mantiene permisos: sin anon y con authenticated", () => {
    expect(normalizedSql).toContain(
      `revoke all on function ${RECEIVE_SIGNATURE} from public, anon;`
    );
    expect(normalizedSql).toContain(
      `grant execute on function ${RECEIVE_SIGNATURE} to authenticated, service_role;`
    );
  });
});
