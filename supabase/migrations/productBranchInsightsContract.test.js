import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20261030120000_product_branch_insights.sql"
  ),
  "utf8"
).replace(/\s+/g, " ");

describe("get_product_branch_insights", () => {
  it("firma con producto y rango, sin elevar privilegios", () => {
    expect(sql).toContain(
      "FUNCTION public.get_product_branch_insights( p_product_id uuid, p_from timestamptz, p_to timestamptz )"
    );
    expect(sql).toContain("SECURITY INVOKER");
    expect(sql).not.toContain("SECURITY DEFINER");
  });

  it("solo cuenta ventas completadas dentro del rango", () => {
    expect(sql).toContain("s.status = 'completed'");
    expect(sql).toContain("s.created_at >= p_from");
    expect(sql).toContain("s.created_at <= p_to");
  });

  it("restringe la ejecucion a usuarios autenticados", () => {
    expect(sql).toContain("FROM anon");
    expect(sql).toContain("TO authenticated");
  });
});
