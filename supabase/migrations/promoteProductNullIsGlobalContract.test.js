import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (name) =>
  readFileSync(join(process.cwd(), "supabase/migrations", name), "utf8");

const sql = read("20261031130000_promote_product_null_is_global.sql").replace(
  /\s+/g,
  " "
);

describe("promote_product_to_global trata NULL como no global", () => {
  it("solo rechaza como ya global cuando is_global es true", () => {
    expect(sql).toContain("coalesce(v_product.is_global, false)");
    expect(sql).not.toContain("coalesce(v_product.is_global, true)");
  });

  it("conserva SECURITY DEFINER, is_admin y grants restringidos", () => {
    expect(sql).toContain("security definer");
    expect(sql).toContain("public.is_admin()");
    expect(sql).toContain(
      "revoke all on function public.promote_product_to_global(uuid) from public"
    );
    expect(sql).toContain(
      "grant execute on function public.promote_product_to_global(uuid) to authenticated"
    );
  });
});
