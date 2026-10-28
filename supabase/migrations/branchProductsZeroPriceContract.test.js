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

describe("migracion 20261028190000 _apply_inventory_delta conserva sale_price", () => {
  const sql = read("20261028190000_apply_inventory_delta_keep_sale_price.sql");
  const norm = sql.replace(/\s+/g, " ");

  it("el ON CONFLICT DO UPDATE no reescribe sale_price", () => {
    const conflict = norm.slice(norm.indexOf("on conflict"));
    const updateSet = conflict.slice(0, conflict.indexOf("returning"));
    expect(updateSet).not.toMatch(/sale_price\s*=/);
  });

  it("el alta de fila nueva sigue fijando sale_price", () => {
    expect(norm).toMatch(/cost_price, sale_price, created_at, updated_at/);
  });
});
