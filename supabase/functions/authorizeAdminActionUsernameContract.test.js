import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const source = readFileSync(
  join(process.cwd(), "supabase/functions/authorize-admin-action/index.ts"),
  "utf8"
);

describe("authorize-admin-action busca el username sin distinguir mayusculas", () => {
  it("usa ilike en lugar de una comparacion sensible a mayusculas", () => {
    expect(source).toMatch(/\.ilike\("username",/);
    expect(source).not.toMatch(/\.eq\("username",/);
  });

  it("escapa los comodines de ilike antes de armar el patron", () => {
    expect(source).toMatch(/\[\\\\%_\]/);
    expect(source).toContain("escapeLikePattern(username)");
  });

  it("conserva el mensaje generico de credenciales incorrectas", () => {
    expect(source).toContain("Usuario administrador o contraseña incorrectos.");
  });
});
