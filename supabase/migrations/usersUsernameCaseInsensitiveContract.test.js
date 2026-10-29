import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20261029120000_users_username_case_insensitive.sql"
);

const sql = readFileSync(MIGRATION, "utf8");
const normalizedSql = sql.replace(/\s+/g, " ");

describe("contrato SQL de username insensible a mayusculas", () => {
  it("aborta antes de normalizar cuando hay colisiones al ignorar mayusculas", () => {
    const collisionCheck = normalizedSql.indexOf("having count(*) > 1");
    const normalization = normalizedSql.indexOf(
      "update public.users set username = lower(btrim(username))"
    );

    expect(collisionCheck).toBeGreaterThan(-1);
    expect(normalizedSql).toMatch(
      /group by lower\(btrim\(username\)\) having count\(\*\) > 1/i
    );
    expect(normalizedSql).toMatch(/raise exception/i);
    expect(collisionCheck).toBeLessThan(normalization);
  });

  it("normaliza los usernames existentes a minusculas sin espacios", () => {
    expect(normalizedSql).toMatch(
      /update public\.users set username = lower\(btrim\(username\)\) where username <> lower\(btrim\(username\)\)/i
    );
  });

  it("crea un indice unico sobre lower(username) sin quitar el UNIQUE existente", () => {
    expect(normalizedSql).toMatch(
      /create unique index if not exists users_username_lower_key on public\.users \(lower\(username\)\)/i
    );
    expect(normalizedSql).not.toMatch(/drop constraint users_username_key/i);
  });

  it("documenta que el casing original no se puede restaurar", () => {
    expect(sql).toMatch(/reversion/i);
    expect(sql).toMatch(/no se puede restaurar/i);
  });
});
