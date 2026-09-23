import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect, vi } from "vitest";

vi.mock("../../src/lib/supabaseClient", () => ({
  supabase: { rpc: vi.fn() },
}));

vi.mock("../../src/services/satClavesService", () => ({
  validateSatClaves: vi.fn(),
}));

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20260923160000_create_products_import_rpc.sql"
);

const rawSql = readFileSync(MIGRATION, "utf8");
const normalizedSql = rawSql.replace(/\s+/g, " ");

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
  [...normalizedSql.matchAll(FUNCTION_PATTERN)].map((match) => ({
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

const IMPORT_PARAMS = "p_rows jsonb, p_branch_id uuid, p_all_branches jsonb";

describe("contrato SQL de import_products_transaction", () => {
  const paramNames = ["p_rows", "p_branch_id", "p_all_branches"];

  it("expone la firma esperada y retorna jsonb", () => {
    const fn = findByParams("import_products_transaction", paramNames);

    expect(
      fn,
      "falta import_products_transaction con la firma esperada"
    ).toBeDefined();
    expect(fn.returns).toBe("jsonb");
  });

  it("declara los tipos esperados de cada parámetro", () => {
    const fn = findByParams("import_products_transaction", paramNames);

    expect(fn.params).toEqual([
      { name: "p_rows", type: "jsonb" },
      { name: "p_branch_id", type: "uuid" },
      { name: "p_all_branches", type: "jsonb" },
    ]);
  });

  it("fija el search_path como parte del endurecimiento", () => {
    const searchPathPattern =
      /FUNCTION public\.import_products_transaction\s*\(\s*p_rows\s+jsonb\s*,\s*p_branch_id\s+uuid\s*,\s*p_all_branches\s+jsonb\s*\)\s*RETURNS\s+jsonb\s+LANGUAGE\s+plpgsql\s+SECURITY\s+DEFINER\s+SET\s+search_path\s+TO\s+'public'/;

    expect(searchPathPattern.test(normalizedSql)).toBe(true);
  });

  it("revoca EXECUTE de anon y public y otorga a authenticated y service_role", () => {
    expect(
      rawSql.includes(
        `REVOKE ALL ON FUNCTION public.import_products_transaction(${IMPORT_PARAMS}) FROM public;`
      )
    ).toBe(true);
    expect(
      rawSql.includes(
        `REVOKE ALL ON FUNCTION public.import_products_transaction(${IMPORT_PARAMS}) FROM anon;`
      )
    ).toBe(true);
    expect(
      rawSql.includes(
        `GRANT EXECUTE ON FUNCTION public.import_products_transaction(${IMPORT_PARAMS}) TO authenticated;`
      )
    ).toBe(true);
    expect(
      rawSql.includes(
        `GRANT EXECUTE ON FUNCTION public.import_products_transaction(${IMPORT_PARAMS}) TO service_role;`
      )
    ).toBe(true);
  });

  it("el cliente envía solo parámetros declarados en la BD", async () => {
    const { supabase } = await import("../../src/lib/supabaseClient");
    const { processImportTransaction } =
      await import("../../src/components/ProductsComponents/PageProducts/ProductsImport/services/productsImportService");

    supabase.rpc.mockReset();
    supabase.rpc.mockResolvedValue({
      data: { created_products_count: 1, created_inventories_count: 1 },
      error: null,
    });

    await processImportTransaction(
      [
        {
          product: {
            barcode: "BC-1",
            name: "Croquetas",
            cost_price: 40,
            sale_price: 55,
            sale_type: "unidad",
            unit: "pieza",
            tracks_inventory: true,
            tax: 16,
            is_global: true,
            clave_sat: "01010101",
            status: true,
          },
          inventory: { stock: 5, min_stock: 1, max_stock: 9 },
        },
      ],
      "branch-1",
      [{ id: "branch-1" }, { id: "branch-2" }],
      {}
    );

    const [rpcName, params] = supabase.rpc.mock.calls[0];
    const sqlParamNames = findByParams(
      "import_products_transaction",
      paramNames
    ).params.map((param) => param.name);

    expect(rpcName).toBe("import_products_transaction");
    expect(Object.keys(params).sort()).toEqual([...sqlParamNames].sort());
  });
});
