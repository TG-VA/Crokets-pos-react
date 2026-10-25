import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20261025120000_store_orders_realtime.sql"
);

const normalizedSql = readFileSync(MIGRATION, "utf8").replace(/\s+/g, " ");

describe("contrato SQL de realtime de pedidos de abastecimiento", () => {
  it("agrega store_orders a la publicacion supabase_realtime", () => {
    expect(normalizedSql).toMatch(
      /alter publication supabase_realtime add table public\.store_orders/i
    );
  });

  it("es idempotente: verifica que la tabla no este publicada", () => {
    expect(normalizedSql).toMatch(
      /if not exists \( select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'store_orders' \)/i
    );
  });
});
