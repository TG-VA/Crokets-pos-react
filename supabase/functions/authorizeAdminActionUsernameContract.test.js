import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const source = readFileSync(
  join(process.cwd(), "supabase/functions/authorize-admin-action/index.ts"),
  "utf8"
);

describe("authorize-admin-action busca el username sin distinguir mayusculas", () => {
  it("normaliza el username antes de consultar", () => {
    expect(source).toContain("normalizeUsername(body?.username)");
  });

  it("busca por igualdad en lugar de un patron LIKE", () => {
    expect(source).toMatch(/\.eq\("username", username\)/);
    expect(source).not.toMatch(/\.ilike\(/);
    expect(source).not.toContain("escapeLikePattern");
  });

  it("conserva el mensaje generico de credenciales incorrectas", () => {
    expect(source).toContain("Usuario administrador o contraseña incorrectos.");
  });
});
