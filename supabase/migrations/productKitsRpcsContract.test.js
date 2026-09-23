import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect, vi } from "vitest";

vi.mock("../../src/lib/supabaseClient", () => ({
  supabase: { rpc: vi.fn() },
}));

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20260923150000_create_product_kits_rpcs.sql"
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

const CREATE_PARAMS = "p_kit_product jsonb, p_kit_items jsonb";
const UPDATE_PARAMS =
  "p_kit_id uuid, p_kit_product_id uuid, p_kit_product jsonb, p_kit_items jsonb";
const DELETE_PARAMS = "p_kit_id uuid, p_kit_product_id uuid";

describe("contrato SQL de RPCs de kits de productos", () => {
  describe("create_kit_transaction", () => {
    const paramNames = ["p_kit_product", "p_kit_items"];

    it("expone la firma esperada y retorna uuid", () => {
      const fn = findByParams("create_kit_transaction", paramNames);

      expect(
        fn,
        "falta create_kit_transaction con la firma esperada"
      ).toBeDefined();
      expect(fn.returns).toBe("uuid");
    });

    it("declara los tipos esperados de cada parámetro", () => {
      const fn = findByParams("create_kit_transaction", paramNames);

      expect(fn.params).toEqual([
        { name: "p_kit_product", type: "jsonb" },
        { name: "p_kit_items", type: "jsonb" },
      ]);
    });

    it("fija el search_path como hardening", () => {
      expect(
        normalizedSql.includes(
          `FUNCTION public.create_kit_transaction(${CREATE_PARAMS}) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'`
        )
      ).toBe(true);
    });

    it("revoca EXECUTE de anon y public y otorga a authenticated y service_role", () => {
      expect(
        rawSql.includes(
          `REVOKE ALL ON FUNCTION public.create_kit_transaction(${CREATE_PARAMS}) FROM public;`
        )
      ).toBe(true);
      expect(
        rawSql.includes(
          `REVOKE ALL ON FUNCTION public.create_kit_transaction(${CREATE_PARAMS}) FROM anon;`
        )
      ).toBe(true);
      expect(
        rawSql.includes(
          `GRANT EXECUTE ON FUNCTION public.create_kit_transaction(${CREATE_PARAMS}) TO authenticated;`
        )
      ).toBe(true);
      expect(
        rawSql.includes(
          `GRANT EXECUTE ON FUNCTION public.create_kit_transaction(${CREATE_PARAMS}) TO service_role;`
        )
      ).toBe(true);
    });

    it("el cliente envía solo parámetros declarados en la BD", async () => {
      const { supabase } = await import("../../src/lib/supabaseClient");
      const { createNewKitTransaction } = await import(
        "../../src/components/ProductsComponents/PageProducts/ProductsPromotions/services/productKitsService"
      );

      supabase.rpc.mockReset();
      supabase.rpc.mockResolvedValue({ data: "kit-1", error: null });

      await createNewKitTransaction(
        { barcode: "KIT1", description: "Pack", price: 100, max_kits_per_sale: 1 },
        [{ id: "c1", quantity: 1 }]
      );

      const [rpcName, params] = supabase.rpc.mock.calls[0];
      const sqlParamNames = findByParams(
        "create_kit_transaction",
        paramNames
      ).params.map((param) => param.name);

      expect(rpcName).toBe("create_kit_transaction");
      expect(Object.keys(params).sort()).toEqual([...sqlParamNames].sort());
    });
  });

  describe("update_kit_transaction", () => {
    const paramNames = ["p_kit_id", "p_kit_product_id", "p_kit_product", "p_kit_items"];

    it("expone la firma esperada y retorna boolean", () => {
      const fn = findByParams("update_kit_transaction", paramNames);

      expect(
        fn,
        "falta update_kit_transaction con la firma esperada"
      ).toBeDefined();
      expect(fn.returns).toBe("boolean");
    });

    it("declara los tipos esperados de cada parámetro", () => {
      const fn = findByParams("update_kit_transaction", paramNames);

      expect(fn.params).toEqual([
        { name: "p_kit_id", type: "uuid" },
        { name: "p_kit_product_id", type: "uuid" },
        { name: "p_kit_product", type: "jsonb" },
        { name: "p_kit_items", type: "jsonb" },
      ]);
    });

    it("fija el search_path como hardening", () => {
      expect(
        normalizedSql.includes(
          `FUNCTION public.update_kit_transaction(${UPDATE_PARAMS}) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'`
        )
      ).toBe(true);
    });

    it("revoca EXECUTE de anon y public y otorga a authenticated y service_role", () => {
      expect(
        rawSql.includes(
          `REVOKE ALL ON FUNCTION public.update_kit_transaction(${UPDATE_PARAMS}) FROM public;`
        )
      ).toBe(true);
      expect(
        rawSql.includes(
          `REVOKE ALL ON FUNCTION public.update_kit_transaction(${UPDATE_PARAMS}) FROM anon;`
        )
      ).toBe(true);
      expect(
        rawSql.includes(
          `GRANT EXECUTE ON FUNCTION public.update_kit_transaction(${UPDATE_PARAMS}) TO authenticated;`
        )
      ).toBe(true);
      expect(
        rawSql.includes(
          `GRANT EXECUTE ON FUNCTION public.update_kit_transaction(${UPDATE_PARAMS}) TO service_role;`
        )
      ).toBe(true);
    });

    it("el cliente envía solo parámetros declarados en la BD", async () => {
      const { supabase } = await import("../../src/lib/supabaseClient");
      const { updateKitTransaction } = await import(
        "../../src/components/ProductsComponents/PageProducts/ProductsPromotions/services/productKitsService"
      );

      supabase.rpc.mockReset();
      supabase.rpc.mockResolvedValue({ data: true, error: null });

      await updateKitTransaction(
        { id: "kit-1", kit_product_id: "prod-1" },
        { barcode: "KIT1", description: "Pack", price: 120, max_kits_per_sale: 2 },
        [{ id: "c1", quantity: 1 }]
      );

      const [rpcName, params] = supabase.rpc.mock.calls[0];
      const sqlParamNames = findByParams(
        "update_kit_transaction",
        paramNames
      ).params.map((param) => param.name);

      expect(rpcName).toBe("update_kit_transaction");
      expect(Object.keys(params).sort()).toEqual([...sqlParamNames].sort());
    });
  });

  describe("delete_kit_transaction", () => {
    const paramNames = ["p_kit_id", "p_kit_product_id"];

    it("expone la firma esperada y retorna boolean", () => {
      const fn = findByParams("delete_kit_transaction", paramNames);

      expect(
        fn,
        "falta delete_kit_transaction con la firma esperada"
      ).toBeDefined();
      expect(fn.returns).toBe("boolean");
    });

    it("declara los tipos esperados de cada parámetro", () => {
      const fn = findByParams("delete_kit_transaction", paramNames);

      expect(fn.params).toEqual([
        { name: "p_kit_id", type: "uuid" },
        { name: "p_kit_product_id", type: "uuid" },
      ]);
    });

    it("fija el search_path como hardening", () => {
      expect(
        normalizedSql.includes(
          `FUNCTION public.delete_kit_transaction(${DELETE_PARAMS}) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'`
        )
      ).toBe(true);
    });

    it("revoca EXECUTE de anon y public y otorga a authenticated y service_role", () => {
      expect(
        rawSql.includes(
          `REVOKE ALL ON FUNCTION public.delete_kit_transaction(${DELETE_PARAMS}) FROM public;`
        )
      ).toBe(true);
      expect(
        rawSql.includes(
          `REVOKE ALL ON FUNCTION public.delete_kit_transaction(${DELETE_PARAMS}) FROM anon;`
        )
      ).toBe(true);
      expect(
        rawSql.includes(
          `GRANT EXECUTE ON FUNCTION public.delete_kit_transaction(${DELETE_PARAMS}) TO authenticated;`
        )
      ).toBe(true);
      expect(
        rawSql.includes(
          `GRANT EXECUTE ON FUNCTION public.delete_kit_transaction(${DELETE_PARAMS}) TO service_role;`
        )
      ).toBe(true);
    });

    it("el cliente envía solo parámetros declarados en la BD", async () => {
      const { supabase } = await import("../../src/lib/supabaseClient");
      const { softDeleteKitTransaction } = await import(
        "../../src/components/ProductsComponents/PageProducts/ProductsPromotions/services/productKitsService"
      );

      supabase.rpc.mockReset();
      supabase.rpc.mockResolvedValue({ data: true, error: null });

      await softDeleteKitTransaction("kit-1", "prod-1");

      const [rpcName, params] = supabase.rpc.mock.calls[0];
      const sqlParamNames = findByParams(
        "delete_kit_transaction",
        paramNames
      ).params.map((param) => param.name);

      expect(rpcName).toBe("delete_kit_transaction");
      expect(Object.keys(params).sort()).toEqual([...sqlParamNames].sort());
    });
  });
});
