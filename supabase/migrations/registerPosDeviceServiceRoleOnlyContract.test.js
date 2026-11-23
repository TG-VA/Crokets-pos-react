import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path) => readFileSync(join(process.cwd(), path), "utf8");

const sql = read(
  "supabase/migrations/20261122130000_register_pos_device_service_role_only.sql"
)
  .replace(/--.*$/gm, "")
  .replace(/\s+/g, " ");

const edgeFunction = read("supabase/functions/authorize-admin-action/index.ts");

describe("register_pos_device solo con service role", () => {
  it("revoca execute a public, anon y authenticated", () => {
    expect(sql).toContain(
      "revoke execute on function public.register_pos_device(text, uuid, uuid) from public, anon, authenticated;"
    );
    expect(sql).toContain(
      "grant execute on function public.register_pos_device(text, uuid, uuid) to service_role;"
    );
    expect(sql).not.toMatch(/grant [^;]* to [^;]*\b(anon|authenticated)\b/);
  });

  it("la edge function registra el equipo con el admin que valido la contrasena", () => {
    expect(edgeFunction).toMatch(
      /supabaseAdmin\.rpc\(\s*"register_pos_device"/
    );
    expect(edgeFunction).toContain("p_admin_id: adminUser.id");
  });
});
