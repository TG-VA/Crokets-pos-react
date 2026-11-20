import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20261117120000_store_orders_receipt_cost.sql"
);

const normalizedSql = readFileSync(MIGRATION, "utf8").replace(/\s+/g, " ");

const RECEIVE_SIGNATURE =
  "public.receive_store_order(uuid, uuid, uuid, jsonb, text, jsonb)";

describe("contrato SQL del costo de recepcion de pedidos", () => {
  it("agrega received_unit_cost de forma idempotente", () => {
    expect(normalizedSql).toMatch(
      /alter table public\.store_order_items add column if not exists received_unit_cost numeric\(18, 4\)/i
    );
  });

  it("reemplaza la firma de 5 argumentos por una con mapa de costos opcional", () => {
    expect(normalizedSql).toMatch(
      /drop function if exists public\.receive_store_order\(uuid, uuid, uuid, jsonb, text\);/i
    );
    expect(normalizedSql).toMatch(
      /p_receipt_notes text default null, p_received_cost_map jsonb default null \)/i
    );
  });

  it("cae al snapshot del pedido cuando no llega costo", () => {
    expect(normalizedSql).toMatch(
      /if v_cost_raw is null or trim\(v_cost_raw\) = '' then v_cost := coalesce\(v_item\.cost_price, 0\);/i
    );
  });

  it("rechaza costos negativos y los redondea a 2 decimales", () => {
    expect(normalizedSql).toMatch(/if v_cost < 0 then raise exception/i);
    expect(normalizedSql).toMatch(/v_cost := round\(v_cost, 2\);/i);
  });

  it("recalcula el costo promedio ponderado de la sucursal destino", () => {
    expect(normalizedSql).toMatch(
      /if v_previous <= 0 then v_new_cost := v_cost;/i
    );
    expect(normalizedSql).toMatch(
      /\(v_previous \* greatest\(coalesce\(v_current_cost, 0\), 0\) \+ v_received \* v_cost\) \/ \(v_previous \+ v_received\)/i
    );
    expect(normalizedSql).toMatch(/cost_price = v_new_cost,/i);
  });

  it("registra el costo capturado en el movimiento de entrada", () => {
    expect(normalizedSql).toMatch(
      /v_cost, round\(v_cost \* v_received, 2\), now\(\)/i
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
