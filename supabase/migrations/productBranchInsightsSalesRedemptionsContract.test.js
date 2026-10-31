import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20261030140000_product_branch_insights_sales_redemptions.sql"
  ),
  "utf8"
).replace(/\s+/g, " ");

describe("get_product_branch_insights con canjes y maximo", () => {
  it("recrea la funcion porque cambia el tipo de retorno", () => {
    expect(sql).toContain(
      "DROP FUNCTION IF EXISTS public.get_product_branch_insights(uuid, timestamptz, timestamptz)"
    );
    expect(sql).toContain("max_stock numeric");
    expect(sql).toContain("redeemed_units numeric");
  });

  it("separa canjes no revertidos de ventas completadas", () => {
    expect(sql).toContain("FROM public.sale_reward_redemptions r");
    expect(sql).toContain("r.status = 'applied'");
    expect(sql).toContain("r.reversed_at IS NULL");
    expect(sql).toContain("s.status = 'completed'");
  });

  it("resta los canjes de las unidades vendidas sin bajar de cero", () => {
    expect(sql).toContain(
      "GREATEST( COALESCE(sold.line_units, 0) - COALESCE(redeemed.redeemed_qty, 0), 0 )"
    );
  });

  it("ordena de mayor a menor stock", () => {
    expect(sql).toContain("ORDER BY COALESCE(bi.stock, 0) DESC, b.name");
  });

  it("mantiene SECURITY INVOKER y grants restringidos", () => {
    expect(sql).toContain("SECURITY INVOKER");
    expect(sql).not.toContain("SECURITY DEFINER");
    expect(sql).toContain("FROM anon");
    expect(sql).toContain("TO authenticated");
  });
});
