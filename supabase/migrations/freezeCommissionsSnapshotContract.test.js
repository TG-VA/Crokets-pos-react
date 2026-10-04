import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20260921170000_freeze_sale_details_commissions.sql"
);

const rawSql = readFileSync(MIGRATION, "utf8");
const normSql = rawSql.replace(/\s+/g, " ");
const lowSql = normSql.toLowerCase();

const reportStart = lowSql.indexOf(
  "create or replace function public.get_commissions_report_data"
);
const reportEnd = lowSql.indexOf(
  "revoke all on function public.get_commissions_report_data"
);
const reportRpcChunk = lowSql.slice(reportStart, reportEnd);

const saleStart = lowSql.indexOf(
  "create or replace function public.create_sale_transaction"
);
const saleEnd = lowSql.indexOf(
  "revoke all on function public.create_sale_transaction"
);
const saleRpcChunk = lowSql.slice(saleStart, saleEnd);

const FUNCTION_PATTERN =
  /CREATE OR REPLACE FUNCTION public\.(\w+)\s*\(([^)]*)\)\s*RETURNS\s+([a-z ]+?)\s+LANGUAGE plpgsql SECURITY DEFINER/gi;

const parseParams = (paramsString) =>
  paramsString
    .split(",")
    .map((part) => part.replace(/\s+DEFAULT\s+.*$/i, "").trim())
    .filter(Boolean)
    .map((part) => {
      const [name, ...typeParts] = part.split(" ");
      return { name, type: typeParts.join(" ") };
    });

const parseFunctions = () =>
  [...normSql.matchAll(FUNCTION_PATTERN)].map((match) => ({
    name: match[1],
    params: parseParams(match[2]),
    returns: match[3].trim(),
  }));

const functions = parseFunctions();

const findByParams = (name, paramNames) =>
  functions.find(
    (fn) =>
      fn.name === name &&
      fn.params.map((param) => param.name).join(",") === paramNames.join(",")
  );

const SALE_PARAM_NAMES = [
  "p_branch_id",
  "p_user_id",
  "p_customer_id",
  "p_subtotal",
  "p_tax",
  "p_total",
  "p_sale_date",
  "p_products",
  "p_payments",
  "p_client_sale_token",
  "p_notes",
];

const SALE_SIG =
  "p_branch_id uuid, p_user_id uuid, p_customer_id uuid, p_subtotal numeric, p_tax numeric, p_total numeric, p_sale_date timestamp with time zone, p_products jsonb, p_payments jsonb, p_client_sale_token uuid, p_notes text";

const COMMISSION_REPORT_SIG =
  "timestamptz, timestamptz, uuid, uuid, uuid, integer, integer";

const commissionColumns = [
  "commission_enabled boolean default false",
  "commission_type varchar default null",
  "commission_value numeric(12, 2) default null",
  "commission_amount numeric(12, 2) default 0",
];

describe("contrato SQL del snapshot de comision en sale_details", () => {
  it("agrega las cuatro columnas de comision a sale_details", () => {
    commissionColumns.forEach((col) => {
      expect(lowSql.includes(`add column if not exists ${col}`)).toBe(true);
    });
  });

  it("el INSERT de create_sale_transaction congelan las columnas de comision", () => {
    const insertIdx = saleRpcChunk.indexOf("insert into public.sale_details");
    expect(insertIdx).toBeGreaterThan(-1);
    const insertBlock = saleRpcChunk.slice(insertIdx, insertIdx + 800);
    commissionColumns.forEach((col) => {
      const columnName = col.split(" ")[0];
      expect(new RegExp(`\\b${columnName}\\b`).test(insertBlock)).toBe(true);
    });
  });

  it("mantiene intacta la firma de la sobrecarga efectiva con p_notes", () => {
    const fn = findByParams("create_sale_transaction", SALE_PARAM_NAMES);

    expect(fn, "falta la sobrecarga de 11 parámetros").toBeDefined();
    expect(fn.returns).toBe("uuid");
    expect(fn.params).toEqual([
      { name: "p_branch_id", type: "uuid" },
      { name: "p_user_id", type: "uuid" },
      { name: "p_customer_id", type: "uuid" },
      { name: "p_subtotal", type: "numeric" },
      { name: "p_tax", type: "numeric" },
      { name: "p_total", type: "numeric" },
      { name: "p_sale_date", type: "timestamp with time zone" },
      { name: "p_products", type: "jsonb" },
      { name: "p_payments", type: "jsonb" },
      { name: "p_client_sale_token", type: "uuid" },
      { name: "p_notes", type: "text" },
    ]);
    expect(normSql.includes("p_notes text DEFAULT NULL::text)")).toBe(true);
  });

  it("revoca EXECUTE de anon y public y otorga a authenticated para create_sale_transaction", () => {
    expect(
      lowSql.includes(
        `revoke all on function public.create_sale_transaction(${SALE_SIG}) from public;`
      )
    ).toBe(true);
    expect(
      lowSql.includes(
        `revoke all on function public.create_sale_transaction(${SALE_SIG}) from anon;`
      )
    ).toBe(true);
    expect(
      lowSql.includes(
        `grant execute on function public.create_sale_transaction(${SALE_SIG}) to authenticated;`
      )
    ).toBe(true);
  });

  it("get_commissions_report_data lee la comision desde sale_details en vez del catalogo vivo", () => {
    expect(reportRpcChunk.includes("sd.commission_enabled")).toBe(true);
    expect(reportRpcChunk.includes("sd.commission_amount")).toBe(true);
    expect(reportRpcChunk.includes("commission_percent")).toBe(false);
    expect(reportRpcChunk.includes("dept_commission_enabled")).toBe(false);
  });

  it("otorga EXECUTE solo a authenticated para get_commissions_report_data", () => {
    expect(
      lowSql.includes(
        `revoke all on function public.get_commissions_report_data(${COMMISSION_REPORT_SIG}) from public;`
      )
    ).toBe(true);
    expect(
      lowSql.includes(
        `grant execute on function public.get_commissions_report_data(${COMMISSION_REPORT_SIG}) to authenticated;`
      )
    ).toBe(true);
  });

  it("el backfill historico deshabilita y rehabilita trg_prevent_edit_sale_details", () => {
    expect(
      lowSql.includes(
        "alter table public.sale_details disable trigger trg_prevent_edit_sale_details"
      )
    ).toBe(true);
    expect(
      lowSql.includes(
        "alter table public.sale_details enable trigger trg_prevent_edit_sale_details"
      )
    ).toBe(true);
  });
});
