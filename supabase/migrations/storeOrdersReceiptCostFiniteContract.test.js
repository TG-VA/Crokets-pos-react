import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20261117180000_store_orders_receipt_cost_finite.sql"
);

const normalizedSql = readFileSync(MIGRATION, "utf8").replace(/\s+/g, " ");

const RECEIVE_SIGNATURE =
  "public.receive_store_order(uuid, uuid, uuid, jsonb, text, jsonb)";

const NON_FINITE =
  /\('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric\)/;

describe("contrato SQL de costos finitos en la recepcion de pedidos", () => {
  it("conserva la firma de 6 argumentos sin volver a eliminarla", () => {
    expect(normalizedSql).toMatch(
      /create or replace function public\.receive_store_order\( p_order_id uuid,/i
    );
    expect(normalizedSql).not.toMatch(/drop function/i);
  });

  it("rechaza cantidades recibidas no finitas", () => {
    expect(normalizedSql).toMatch(
      new RegExp(
        `if v_received in ${NON_FINITE.source} then raise exception`,
        "i"
      )
    );
  });

  it("rechaza costos no finitos antes de validar el signo", () => {
    const finiteCheck = normalizedSql.search(
      new RegExp(`if v_cost in ${NON_FINITE.source} then raise exception`, "i")
    );
    const negativeCheck = normalizedSql.search(
      /if v_cost < 0 then raise exception/i
    );

    expect(finiteCheck).toBeGreaterThan(-1);
    expect(finiteCheck).toBeLessThan(negativeCheck);
  });

  it("aplica el tope de costo por unidad antes de redondear", () => {
    const capCheck = normalizedSql.search(
      /if v_cost > 1000000 then raise exception/i
    );
    const rounding = normalizedSql.search(/v_cost := round\(v_cost, 2\);/i);

    expect(capCheck).toBeGreaterThan(-1);
    expect(capCheck).toBeLessThan(rounding);
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
