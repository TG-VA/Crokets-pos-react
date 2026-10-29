import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const MIGRATIONS_DIR = join(process.cwd(), "supabase/migrations");
const FILE_NAME = "20261029130000_users_username_lowercase_check.sql";

const sql = readFileSync(join(MIGRATIONS_DIR, FILE_NAME), "utf8");
const normalizedSql = sql.replace(/\s+/g, " ");

describe("contrato SQL del CHECK de username en minusculas", () => {
  it("llega despues de la migracion que normalizo los usernames", () => {
    expect(
      FILE_NAME > "20261029120000_users_username_case_insensitive.sql"
    ).toBe(true);

    const applied = readdirSync(MIGRATIONS_DIR).filter((name) =>
      name.endsWith(".sql")
    );

    expect(applied).toContain(FILE_NAME);
  });

  it("aborta si queda algun username fuera del formato canonico", () => {
    expect(normalizedSql).toMatch(
      /where username <> lower\(btrim\(username\)\)/i
    );
    expect(normalizedSql).toMatch(/raise exception/i);
  });

  it("agrega la restriccion que exige minusculas y sin espacios", () => {
    expect(normalizedSql).toMatch(
      /alter table public\.users add constraint users_username_lowercase_check check \(username = lower\(btrim\(username\)\)\)/i
    );
  });

  it("documenta la reversion de la restriccion", () => {
    expect(normalizedSql).toMatch(
      /alter table public\.users drop constraint users_username_lowercase_check/i
    );
  });
});
