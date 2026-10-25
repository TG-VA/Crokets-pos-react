import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20261024120000_store_orders_integrity.sql"
);

const rawSql = readFileSync(MIGRATION, "utf8");
const normalizedSql = rawSql.replace(/\s+/g, " ");

const CREATE_SIGNATURE =
  "public.create_store_order(text, uuid, uuid, uuid, text, jsonb)";
const RECEIVE_SIGNATURE = "public.receive_store_order(uuid, uuid, uuid, jsonb)";

describe("contrato SQL de integridad de pedidos de abastecimiento", () => {
  it("crea el indice de historial por fecha de envio", () => {
    expect(normalizedSql).toMatch(
      /create index if not exists store_orders_sent_at_idx on public\.store_orders \(sent_at desc\)/i
    );
  });

  it("exige cantidades enteras en las partidas sin romper filas historicas", () => {
    expect(normalizedSql).toMatch(
      /add constraint store_order_items_expected_qty_integral check \(expected_qty = trunc\(expected_qty\)\) not valid/i
    );
    expect(normalizedSql).toMatch(
      /add constraint store_order_items_received_qty_integral check \(received_qty is null or received_qty = trunc\(received_qty\)\) not valid/i
    );
  });

  it("mantiene las firmas y la seguridad de las RPCs", () => {
    expect(normalizedSql).toMatch(
      /create or replace function public\.create_store_order\s*\(/i
    );
    expect(normalizedSql).toMatch(
      /create or replace function public\.receive_store_order\s*\(/i
    );
    expect(normalizedSql.match(/security definer/gi)).toHaveLength(2);
    expect(normalizedSql.match(/set search_path = public/gi)).toHaveLength(2);
  });

  it("rechaza cantidades fraccionarias al crear el pedido", () => {
    expect(normalizedSql).toMatch(
      /if v_expected <> trunc\(v_expected\) then raise exception 'La cantidad esperada debe ser un numero entero\.';/i
    );
  });

  it("rechaza cantidades fraccionarias al recibir el pedido", () => {
    expect(normalizedSql).toMatch(
      /if v_received <> trunc\(v_received\) then raise exception 'La cantidad recibida de % debe ser un numero entero\.', v_item\.product_name;/i
    );
  });

  it("valida la membresia de sucursal sin romper el uso con service_role", () => {
    expect(normalizedSql).toMatch(
      /if auth\.uid\(\) is not null and not public\._user_can_access_branch\(p_from_branch_id\) then raise exception 'No tienes acceso a la sucursal de origen\.'/i
    );
    expect(normalizedSql).toMatch(
      /if auth\.uid\(\) is not null and not public\._user_can_access_branch\(p_to_branch_id\) then raise exception 'No tienes acceso a esta sucursal\.'/i
    );
  });

  it("conserva los bloqueos de folio y de inventario", () => {
    expect(normalizedSql).toMatch(
      /perform pg_advisory_xact_lock\(hashtext\('store_orders:folio:' \|\| v_day\)\)/i
    );
    expect(normalizedSql).toMatch(
      /perform pg_advisory_xact_lock\(hashtext\('branch_inventory:' \|\| v_item\.product_id::text\)\)/i
    );
    expect(normalizedSql).toMatch(
      /from public\.store_orders where id = p_order_id for update/i
    );
    expect(normalizedSql).toMatch(
      /from public\.branch_inventory where branch_id = p_to_branch_id and product_id = v_item\.product_id for update/i
    );
  });

  it("restringe execute y solo lo concede a authenticated y service_role", () => {
    expect(normalizedSql).toMatch(
      new RegExp(
        `revoke all on function ${CREATE_SIGNATURE.replace(/[().]/g, "\\$&")} from public`,
        "i"
      )
    );
    expect(normalizedSql).toMatch(
      new RegExp(
        `revoke all on function ${RECEIVE_SIGNATURE.replace(/[().]/g, "\\$&")} from public`,
        "i"
      )
    );
    expect(normalizedSql).toMatch(
      new RegExp(
        `grant execute on function ${CREATE_SIGNATURE.replace(/[().]/g, "\\$&")} to authenticated, service_role`,
        "i"
      )
    );
    expect(normalizedSql).toMatch(
      new RegExp(
        `grant execute on function ${RECEIVE_SIGNATURE.replace(/[().]/g, "\\$&")} to authenticated, service_role`,
        "i"
      )
    );
    expect(normalizedSql).not.toMatch(
      /grant execute on function[^;]*\bto\b[^;]*\banon\b/i
    );
  });
});
