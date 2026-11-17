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
    expect(source).toContain('message: "No se pudo registrar la autorización."');
  });
});
