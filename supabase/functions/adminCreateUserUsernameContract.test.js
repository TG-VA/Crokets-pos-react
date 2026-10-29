import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const source = readFileSync(
  join(process.cwd(), "supabase/functions/admin-create-user/index.ts"),
  "utf8"
);

describe("admin-create-user normaliza el username en origen", () => {
  it("guarda el username en minusculas y sin espacios", () => {
    expect(source).toMatch(
      /const cleanUsername = String\(body\?\.username \|\| ""\)\s*\.trim\(\)\s*\.toLowerCase\(\);/
    );
  });

  it("usa el username normalizado en user_metadata y en users.insert", () => {
    expect(source).toMatch(
      /user_metadata: \{ name: cleanName, username: cleanUsername \}/
    );
    expect(source).toMatch(/username: cleanUsername,/);
  });
});
