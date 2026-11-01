import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const read = (name) =>
  readFileSync(join(process.cwd(), "supabase/migrations", name), "utf8");

describe("migracion branch_products_global_scope", () => {
  const sql = read("20261031140000_branch_products_global_scope.sql");

  it("recrea la funcion con las columnas de alcance", () => {
    expect(sql).toContain(
      "drop function if exists public.get_branch_products_paginated"
    );
    expect(sql).toContain("is_global");
    expect(sql).toContain("local_branch_names");
  });

  it("solo cuenta sucursales con inventario activo", () => {
    expect(sql).toContain("bi2.is_active = true");
  });

  it("no concede EXECUTE a anon", () => {
    expect(sql).toMatch(/revoke[^;]*from anon/i);
    expect(sql).toMatch(/grant execute[^;]*to authenticated/i);
    expect(sql).not.toMatch(/grant\s+execute[^;]*\banon\b/i);
  });
});
