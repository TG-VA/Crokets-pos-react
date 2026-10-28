import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20261026120000_store_orders_receipt_notes.sql"
);

const rawSql = readFileSync(MIGRATION, "utf8");
const normalizedSql = rawSql.replace(/\s+/g, " ");

const OLD_RECEIVE_SIGNATURE =
  "public.receive_store_order(uuid, uuid, uuid, jsonb)";
const RECEIVE_SIGNATURE =
  "public.receive_store_order(uuid, uuid, uuid, jsonb, text)";

describe("contrato SQL de la nota de recepcion de pedidos", () => {
  it("agrega la columna receipt_notes de forma idempotente", () => {
    expect(normalizedSql).toMatch(
      /alter table public\.store_orders add column if not exists receipt_notes text/i
    );
  });

  it("reemplaza la firma anterior de receive_store_order", () => {
    expect(normalizedSql).toMatch(
      new RegExp(
        `drop function if exists ${OLD_RECEIVE_SIGNATURE.replace(/[()]/g, "\\$&")};`,
        "i"
      )
    );
    expect(normalizedSql).toMatch(
      /create or replace function public\.receive_store_order\(\s*p_order_id uuid,\s*p_to_branch_id uuid,\s*p_user_id uuid,\s*p_received_qty_map jsonb,\s*p_receipt_notes text default null\s*\)/i
    );
  });

  it("valida la nota en servidor: obligatoria con diferencias y maximo 500", () => {
    expect(normalizedSql).toMatch(
      /if v_has_difference and nullif\(trim\(p_receipt_notes\), ''\) is null then raise exception 'La nota de recepción es obligatoria cuando hay diferencias en el conteo\.';/i
    );
    expect(normalizedSql).toMatch(
      /if char_length\(coalesce\(trim\(p_receipt_notes\), ''\)\) > 500 then raise exception 'La nota de recepción no puede exceder 500 caracteres\.';/i
    );
  });

  it("guarda la nota normalizada sin tocar discrepancy_notes", () => {
    expect(normalizedSql).toMatch(
      /receipt_notes = nullif\(trim\(p_receipt_notes\), ''\)/i
    );
    expect(normalizedSql).toMatch(/discrepancy_notes = v_notes/i);
  });

  it("mantiene permisos sin anon y conserva la seguridad de la RPC", () => {
    expect(normalizedSql).toMatch(
      new RegExp(
        `revoke all on function ${RECEIVE_SIGNATURE.replace(/[()]/g, "\\$&")} from public, anon;`,
        "i"
      )
    );
    expect(normalizedSql).toMatch(
      new RegExp(
        `grant execute on function ${RECEIVE_SIGNATURE.replace(/[()]/g, "\\$&")} to authenticated, service_role;`,
        "i"
      )
    );
    expect(normalizedSql).not.toMatch(
      /grant execute on function[^;]*\bto\b[^;]*\banon\b/i
    );
    expect(normalizedSql).toMatch(/security definer/i);
    expect(normalizedSql).toMatch(/set search_path = public/i);
    expect(normalizedSql).toMatch(
      /coalesce\( auth\.uid\(\), case when auth\.role\(\) = 'service_role' then p_user_id end \)/i
    );
    expect(normalizedSql).toMatch(/_user_can_access_branch\(p_to_branch_id\)/i);
  });
});
