import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20261025200000_store_orders_revoke_anon.sql"
);

const normalizedSql = readFileSync(MIGRATION, "utf8").replace(/\s+/g, " ");

const CREATE_SIG =
  "public.create_store_order\\(text, uuid, uuid, uuid, text, jsonb\\)";
const RECEIVE_SIG = "public.receive_store_order\\(uuid, uuid, uuid, jsonb\\)";

describe("contrato SQL de permisos de las RPC de pedidos", () => {
  it.each([
    ["create_store_order", CREATE_SIG],
    ["receive_store_order", RECEIVE_SIG],
  ])(
    "%s revoca anon y public y concede authenticated y service_role",
    (_n, sig) => {
      expect(normalizedSql).toMatch(
        new RegExp(`revoke all on function ${sig} from public, anon;`, "i")
      );
      expect(normalizedSql).toMatch(
        new RegExp(
          `grant execute on function ${sig} to authenticated, service_role;`,
          "i"
        )
      );
      expect(normalizedSql).not.toMatch(
        new RegExp(`grant execute on function ${sig} to [^;]*anon`, "i")
      );
    }
  );

  it("solo acepta p_user_id cuando el rol es service_role", () => {
    const matches = normalizedSql.match(
      /coalesce\( auth\.uid\(\), case when auth\.role\(\) = 'service_role' then p_user_id end \)/gi
    );
    expect(matches).toHaveLength(2);
    expect(normalizedSql).not.toMatch(/coalesce\(auth\.uid\(\), p_user_id\)/i);
  });

  it("conserva el rechazo sin actor y la validacion de acceso a sucursal", () => {
    expect(normalizedSql).toMatch(/if v_actor is null then/i);
    expect(normalizedSql).toMatch(
      /_user_can_access_branch\(p_from_branch_id\)/i
    );
    expect(normalizedSql).toMatch(/_user_can_access_branch\(p_to_branch_id\)/i);
    expect(normalizedSql).toMatch(/upper\(trim\(p_order_name\)\)/i);
  });
});
