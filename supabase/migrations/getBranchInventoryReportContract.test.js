import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const sql = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20261119190000_get_branch_inventory_report.sql"
  ),
  "utf8"
);

describe("migracion get_branch_inventory_report", () => {
  it("devuelve un solo jsonb para que PostgREST no trunque las filas", () => {
    expect(sql).toMatch(/returns jsonb/i);
    expect(sql).toContain("jsonb_agg(");
    expect(sql).not.toMatch(/\blimit\b/i);
  });

  it("solo cuenta filas activas de la sucursal y productos activos", () => {
    expect(sql).toContain("bi.branch_id = p_branch_id");
    expect(sql).toContain("bi.is_active = true");
    expect(sql).toContain("p.status = true");
  });

  it("clasifica las filas en los tres tipos del reporte", () => {
    expect(sql).toContain("'inventory'");
    expect(sql).toContain("'no_branch_record'");
    expect(sql).toContain("'no_stock'");
  });

  it("no usa security definer y no concede EXECUTE a anon", () => {
    expect(sql).not.toMatch(/security definer/i);
    expect(sql).toMatch(/revoke[^;]*from anon/i);
    expect(sql).toMatch(/grant execute[^;]*to authenticated/i);
    expect(sql).not.toMatch(/grant\s+execute[^;]*\banon\b/i);
  });
});
