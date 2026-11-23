import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const raw = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20261122120000_revoke_anon_grants.sql"
  ),
  "utf8"
);
const sql = raw.replace(/--.*$/gm, "").replace(/\s+/g, " ");

const statements = sql
  .split(";")
  .map((statement) => statement.trim())
  .filter(Boolean);

const grantsToAnon = statements.filter(
  (statement) => statement.startsWith("grant ") && /\bto anon\b/.test(statement)
);

describe("acceso de anon a public", () => {
  it("revoca todo a anon antes de volver a otorgar", () => {
    const revokes = [
      "revoke all on all tables in schema public from anon",
      "revoke all on all sequences in schema public from anon",
      "revoke execute on all functions in schema public from anon, public",
    ];

    for (const revoke of revokes) {
      expect(statements).toContain(revoke);
    }

    const lastRevoke = Math.max(
      ...revokes.map((revoke) => statements.indexOf(revoke))
    );
    for (const grant of grantsToAnon) {
      expect(statements.indexOf(grant)).toBeGreaterThan(lastRevoke);
    }
  });

  it("solo otorga a anon lo que el login lee antes de la sesion", () => {
    expect(grantsToAnon).toEqual([
      "grant select on table public.branches to anon",
      "grant select (id, username) on table public.users to anon",
      "grant select (id, user_id, branch_id, status, ended_at) on table public.user_sessions to anon",
      "grant execute on function public.get_email_by_username(text) to anon",
      "grant execute on function public.get_branch_by_device(text) to anon",
      "grant execute on function public.register_pos_device(text, uuid, uuid) to anon",
    ]);
  });

  it("no toca los privilegios de authenticated ni service_role", () => {
    expect(sql).not.toMatch(/from [^;]*\bauthenticated\b/);
    expect(sql).not.toMatch(/from [^;]*\bservice_role\b/);
  });

  it("los objetos nuevos ya no nacen abiertos para anon", () => {
    expect(statements).toContain(
      "alter default privileges for role postgres in schema public revoke all on tables from anon"
    );
    expect(statements).toContain(
      "alter default privileges for role postgres in schema public revoke all on sequences from anon"
    );
    expect(statements).toContain(
      "alter default privileges for role postgres in schema public revoke execute on functions from anon, public"
    );
  });
});
