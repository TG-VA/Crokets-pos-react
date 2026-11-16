import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (name) =>
  readFileSync(join(process.cwd(), "supabase/migrations", name), "utf8");

const raw = read("20261115130000_create_branch_branch_type.sql");
const sql = raw.replace(/--.*$/gm, "").replace(/\s+/g, " ");
const previous = read("20261020120000_branches_is_active_management.sql");

const SIGNATURE_10 =
  "(text, text, uuid, text, text, text, text, text, text, text)";

describe("create_branch con branch_type", () => {
  it("reemplaza la firma de 9 parametros por la de 10", () => {
    expect(sql).toContain(
      "drop function if exists public.create_branch(text, text, uuid, text, text, text, text, text, text);"
    );
    expect(sql).toContain("p_branch_type text DEFAULT 'operational' )");
  });

  it("valida el tipo y lo inserta en branches", () => {
    expect(sql).toContain(
      "if v_branch_type not in ('operational', 'admin') then"
    );
    expect(sql).toContain(
      "insert into public.branches (code, name, phone, email, address, city, state, timezone, is_active, branch_type)"
    );
    expect(sql).toContain(
      "returning id, code, name, phone, email, address, city, state, timezone, is_active, branch_type"
    );
  });

  it("conserva SECURITY DEFINER, search_path y grants sin anon", () => {
    expect(sql).toContain("SECURITY DEFINER SET search_path = public");
    expect(sql).toContain(
      `revoke all on function public.create_branch${SIGNATURE_10} from public;`
    );
    expect(sql).toContain(
      `grant execute on function public.create_branch${SIGNATURE_10} to authenticated, service_role;`
    );
    expect(sql).not.toMatch(/\banon\b/);
  });

  it("conserva las validaciones de la definicion anterior", () => {
    [
      "El código de la sucursal es obligatorio.",
      "El nombre de la sucursal es obligatorio.",
      "El administrador no es válido.",
      "Ya existe una sucursal con ese código.",
      "Ya existe una sucursal con ese nombre.",
      "coalesce(auth.uid(), p_admin_id)",
    ].forEach((fragment) => {
      expect(previous).toContain(fragment);
      expect(sql).toContain(fragment);
    });
  });

  it("documenta el rollback", () => {
    expect(raw).toContain("Rollback:");
  });
});
