import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const source = readFileSync(
  join(process.cwd(), "supabase/functions/authorize-admin-action/index.ts"),
  "utf8"
);

describe("authorize-admin-action registra las autorizaciones que valida la BD", () => {
  it("registra inventory_add_access por 12 horas", () => {
    expect(source).toMatch(/inventory_add_access: 12,/);
  });

  it("toma a quien recibe la autorizacion del token de la sesion", () => {
    expect(source).toContain('req.headers.get("Authorization")');
    expect(source).toContain("supabaseAdmin.auth.getUser(token)");
  });

  it("inserta en admin_action_grants con sucursal, usuario y administrador", () => {
    expect(source).toContain('.from("admin_action_grants")');
    expect(source).toMatch(
      /branch_id: branchId,\s+granted_to: callerId,\s+granted_by: adminUser\.id,/
    );
  });

  it("no autoriza si no puede registrar el permiso", () => {
    expect(source).toMatch(
      /if \(grantError\) \{[\s\S]*?return jsonResponse\(\{\s+ok: false,\s+message: "No se pudo registrar la autorización\.",\s+\}\);/
    );
  });

  it("no autoriza sin la sesion del llamador o sin la sucursal", () => {
    expect(source).toMatch(
      /if \(!callerId \|\| !branchId\) \{\s+return jsonResponse\(\{\s+ok: false,/
    );
  });

  it("calcula la vigencia en horas", () => {
    expect(source).toContain("Date.now() + grantHours * 60 * 60 * 1000");
  });

  it("solo toma vigencias propias del mapa, no del prototipo", () => {
    expect(source).toMatch(
      /Object\.hasOwn\(DB_ENFORCED_GRANT_HOURS, action\)\s+\? DB_ENFORCED_GRANT_HOURS\[action\]\s+: null/
    );
  });

  it("responde el fallo del registro con 200 y ok: false para que la UI muestre el motivo", () => {
    expect(source).not.toMatch(
      /message: "No se pudo registrar la autorización\.",\s+\},\s+500/
    );
  });
});
