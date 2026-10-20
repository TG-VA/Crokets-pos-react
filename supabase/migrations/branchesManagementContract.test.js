import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20261020120000_branches_is_active_management.sql"
);

const rawSql = readFileSync(MIGRATION, "utf8");
const normalizedSql = rawSql.replace(/\s+/g, " ");

const FUNCTION_PATTERN =
  /CREATE OR REPLACE FUNCTION public\.(\w+)\s*\(([^)]*)\)\s*RETURNS\s+([a-z ]+?)\s+LANGUAGE plpgsql SECURITY DEFINER/gi;

const parseParams = (paramsString) =>
  paramsString
    .split(",")
    .map((part) => part.replace(/\s+DEFAULT\s+.*$/i, "").trim())
    .filter(Boolean)
    .map((part) => {
      const [name, ...typeParts] = part.split(" ");
      return { name, type: typeParts.join(" ") };
    });

const functions = [...normalizedSql.matchAll(FUNCTION_PATTERN)].map(
  (match) => ({
    name: match[1],
    params: parseParams(match[2]),
    returns: match[3].trim(),
  })
);

const findByParams = (name, paramNames) =>
  functions.find(
    (fn) =>
      fn.name === name &&
      fn.params.map((p) => p.name).join(",") === paramNames.join(",")
  );

const CREATE_PARAMS = [
  "p_code",
  "p_name",
  "p_admin_id",
  "p_phone",
  "p_email",
  "p_address",
  "p_city",
  "p_state",
  "p_timezone",
];

const TOGGLE_PARAMS = ["p_branch_id", "p_is_active", "p_admin_id"];

describe("contrato SQL de gestión de sucursales (is_active)", () => {
  it("agrega la columna is_active con default true y sin nulos", () => {
    expect(normalizedSql).toMatch(
      /ALTER TABLE public\.branches ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true/i
    );
  });

  it("crea el índice por is_active", () => {
    expect(normalizedSql).toMatch(
      /CREATE INDEX IF NOT EXISTS idx_branches_is_active ON public\.branches\(is_active\)/i
    );
  });

  describe("create_branch", () => {
    const paramNames = CREATE_PARAMS;

    it("expone la firma esperada y retorna jsonb", () => {
      const fn = findByParams("create_branch", paramNames);
      expect(fn, "falta create_branch con la firma esperada").toBeDefined();
      expect(fn.returns).toBe("jsonb");
    });

    it("valida unicidad de code y name antes de insertar", () => {
      expect(normalizedSql).toMatch(/Ya existe una sucursal con ese código/i);
      expect(normalizedSql).toMatch(/Ya existe una sucursal con ese nombre/i);
    });

    it("inserta con is_active = true", () => {
      expect(normalizedSql).toMatch(
        /insert into public\.branches \(code, name, phone, email, address, city, state, timezone, is_active\) values/i
      );
    });

    it("valida que el administrador este activo con rol admin", () => {
      expect(normalizedSql).toMatch(
        /join public\.roles r on r\.id = u\.role_id where u\.id = v_admin_id and u\.status = true and r\.name = 'admin'/i
      );
    });

    it("fija el actor server-side con coalesce(auth.uid(), p_admin_id)", () => {
      expect(normalizedSql).toMatch(
        /v_admin_id uuid := coalesce\(auth\.uid\(\), p_admin_id\)/i
      );
    });

    it("restringe execute y solo lo concede a authenticated y service_role", () => {
      expect(normalizedSql).toMatch(
        /revoke all on function public\.create_branch\(text, text, uuid, text, text, text, text, text, text\) from public/i
      );
      expect(normalizedSql).toMatch(
        /grant execute on function public\.create_branch\(text, text, uuid, text, text, text, text, text, text\) to authenticated, service_role/i
      );
      expect(normalizedSql).not.toMatch(
        /grant execute on function public\.create_branch[^;]*anon/i
      );
    });
  });

  describe("set_branch_active", () => {
    const paramNames = TOGGLE_PARAMS;

    it("expone la firma esperada y retorna jsonb", () => {
      const fn = findByParams("set_branch_active", paramNames);
      expect(fn, "falta set_branch_active con la firma esperada").toBeDefined();
      expect(fn.returns).toBe("jsonb");
    });

    it("bloquea la desactivacion con sesiones de caja abiertas", () => {
      expect(normalizedSql).toMatch(
        /from public\.cash_register_sessions crs where crs\.branch_id = p_branch_id and crs\.status = 'open'/i
      );
      expect(normalizedSql).toMatch(/openCashSessions/);
    });

    it("bloquea la desactivacion con traspasos en transito", () => {
      expect(normalizedSql).toMatch(
        /from public\.inventory_transfers t where \(t\.from_branch_id = p_branch_id or t\.to_branch_id = p_branch_id\) and t\.status in \('pending_receipt', 'pending'\)/i
      );
      expect(normalizedSql).toMatch(/inTransitTransfers/);
    });

    it("emite advertencia de terminales POS vinculadas sin bloquear", () => {
      expect(normalizedSql).toMatch(
        /from public\.pos_devices pd where pd\.branch_id = p_branch_id and pd\.is_active = true/i
      );
      expect(normalizedSql).toMatch(/activePosDevices/);
      expect(normalizedSql).toMatch(
        /update public\.branches set is_active = false where id = p_branch_id/i
      );
    });

    it("nunca borra fisicamente la sucursal", () => {
      expect(normalizedSql).not.toMatch(/delete from public\.branches/i);
    });

    it("fija el actor server-side para impedir suplantacion de admin", () => {
      const fn = normalizedSql.match(
        /CREATE OR REPLACE FUNCTION public\.set_branch_active[\s\S]*?end; \$\$/i
      );
      expect(fn, "falta el cuerpo de set_branch_active").not.toBeNull();
      expect(fn[0]).toMatch(
        /v_admin_id uuid := coalesce\(auth\.uid\(\), p_admin_id\)/i
      );
      expect(fn[0]).toMatch(/where u\.id = v_admin_id/i);
      expect(fn[0]).not.toMatch(/where u\.id = p_admin_id/i);
    });

    it("restringe execute y solo lo concede a authenticated y service_role", () => {
      expect(normalizedSql).toMatch(
        /revoke all on function public\.set_branch_active\(uuid, boolean, uuid\) from public/i
      );
      expect(normalizedSql).toMatch(
        /grant execute on function public\.set_branch_active\(uuid, boolean, uuid\) to authenticated, service_role/i
      );
      expect(normalizedSql).not.toMatch(
        /grant execute on function public\.set_branch_active[^;]*anon/i
      );
    });
  });
});
