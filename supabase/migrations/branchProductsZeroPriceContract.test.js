import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const read = (name) =>
  readFileSync(join(process.cwd(), "supabase/migrations", name), "utf8");

describe("migracion 20261028180000 fallback de precio 0", () => {
  const sql = read("20261028180000_branch_products_zero_price_fallback.sql");

  it("trata sale_price = 0 de sucursal como sin override", () => {
    expect(sql).toContain(
      "coalesce(nullif(bi.sale_price, 0), p.sale_price, 0)"
    );
  });

  it("no reabre el grant a anon", () => {
    expect(sql).not.toMatch(/grant\s+execute[^;]*\banon\b/i);
  });
});

describe("migracion 20261028180100 backfill de precio 0", () => {
  const sql = read("20261028180100_backfill_zero_branch_sale_price.sql");

  it("solo corrige filas en 0 con precio de catalogo positivo", () => {
    expect(sql).toContain("bi.sale_price = 0");
    expect(sql).toContain("p.sale_price > 0");
  });
});
