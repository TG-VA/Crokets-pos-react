import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const FILE_NAME = "20261119200000_movements_report_window_idx.sql";

const sql = readFileSync(
  join(process.cwd(), "supabase/migrations", FILE_NAME),
  "utf8"
).replace(/\s+/g, " ");

describe("contrato SQL de indices del reporte de movimientos", () => {
  it.each([
    ["inventory_movements", "branch_id, created_at"],
    ["inventory_movements", "created_at"],
    ["sales", "branch_id, sale_date"],
  ])("indexa %s por (%s)", (table, columns) => {
    expect(sql).toContain(`on public.${table} (${columns});`);
  });

  it("es idempotente", () => {
    expect(sql.match(/create index if not exists/gi)).toHaveLength(3);
  });
});
