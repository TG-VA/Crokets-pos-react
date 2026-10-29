import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const source = readFileSync(
  join(process.cwd(), "supabase/functions/admin-create-user/index.ts"),
  "utf8"
);

describe("admin-create-user normaliza el username en origen", () => {
  it("guarda el username normalizado con el helper compartido", () => {
    expect(source).toMatch(
      /const cleanUsername = normalizeUsername\(body\?\.username\);/
    );
  });

  it("rechaza en el servidor un username con formato invalido", () => {
    expect(source).toMatch(/!isValidUsername\(cleanUsername\)/);
  });

  it("usa el username normalizado en user_metadata y en users.insert", () => {
    expect(source).toMatch(
      /user_metadata: \{ name: cleanName, username: cleanUsername \}/
    );
    expect(source).toMatch(/username: cleanUsername,/);
  });
});
