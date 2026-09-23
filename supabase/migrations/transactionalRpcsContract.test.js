import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect, vi } from "vitest";

vi.mock("../../src/lib/supabaseClient", () => ({
  supabase: { rpc: vi.fn() },
}));

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20260917200000_harden_transactional_rpcs.sql"
);

const rawSql = readFileSync(MIGRATION, "utf8");
const normalizedSql = rawSql.replace(/\s+/g, " ");

const FIX_SEARCH_PATH_MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20260923130000_fix_create_sale_transaction_search_path.sql"
);

const fixedRawSql = readFileSync(FIX_SEARCH_PATH_MIGRATION, "utf8");
const fixedNormSql = fixedRawSql.replace(/\s+/g, " ");

const FIX_CANCEL_RETURN_MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20260923140000_fix_cancel_and_return_search_path.sql"
);

const fixedCancelRawSql = readFileSync(FIX_CANCEL_RETURN_MIGRATION, "utf8");
const fixedCancelNormSql = fixedCancelRawSql.replace(/\s+/g, " ");

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

const hasRevoke = (name, paramsString, role) =>
  normalizedSql.includes(
    `revoke execute on function public.${name}(${paramsString}) from ${role};`
  );

const SALE_PARAMS =
  "p_branch_id uuid, p_user_id uuid, p_customer_id uuid, p_subtotal numeric, p_tax numeric, p_total numeric, p_sale_date timestamp with time zone, p_products jsonb, p_payments jsonb, p_client_sale_token uuid, p_notes text";

const SALE_PARAMS_9 =
  "p_branch_id uuid, p_user_id uuid, p_customer_id uuid, p_subtotal numeric, p_tax numeric, p_total numeric, p_sale_date timestamp with time zone, p_products jsonb, p_payments jsonb";

const SALE_PARAMS_10 = `${SALE_PARAMS_9}, p_client_sale_token uuid`;

const TRANSFER_PARAMS =
  "p_from_branch_id uuid, p_to_branch_id uuid, p_user_id uuid, p_notes text, p_folio text, p_items jsonb";

const CANCEL_PARAMS =
  "p_sale_id uuid, p_user_id uuid, p_branch_id uuid, p_cancel_reason text, p_refund_method_uuid uuid";

const RETURN_PARAMS =
  "p_sale_id uuid, p_user_id uuid, p_branch_id uuid, p_return_reason text, p_refund_method_id uuid, p_items jsonb";

describe("contrato SQL de RPCs transaccionales", () => {
  describe("create_sale_transaction", () => {
    const paramNames = [
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

    it("expone la sobrecarga efectiva de 11 parámetros que retorna uuid", () => {
      const fn = findByParams("create_sale_transaction", paramNames);

      expect(fn, "falta la sobrecarga de 11 parámetros").toBeDefined();
      expect(fn.returns).toBe("uuid");
    });

    it("declara los tipos esperados de cada parámetro", () => {
      const fn = findByParams("create_sale_transaction", paramNames);

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
    });

    it("revoca EXECUTE de anon y public para la sobrecarga efectiva", () => {
      expect(hasRevoke("create_sale_transaction", SALE_PARAMS, "anon")).toBe(
        true
      );
      expect(hasRevoke("create_sale_transaction", SALE_PARAMS, "public")).toBe(
        true
      );
    });

    it("el cliente envía solo parámetros declarados en la BD", async () => {
      const { supabase } = await import("../../src/lib/supabaseClient");
      const { createSaleTransaction } =
        await import("../../src/components/SalesComponents/services/salesTransactionService");

      supabase.rpc.mockReset();
      supabase.rpc.mockResolvedValue({ data: "sale-1", error: null });

      await createSaleTransaction({
        branchId: "branch-1",
        userId: "user-1",
        subtotal: 1,
        tax: 0,
        total: 1,
        saleDate: "2026-09-17T18:00:00.000Z",
        productsPayload: [{ product_id: "p-1" }],
        paymentsPayload: [],
        saleToken: "token-1",
      });

      const [rpcName, params] = supabase.rpc.mock.calls[0];
      const sqlParamNames = findByParams(
        "create_sale_transaction",
        paramNames
      ).params.map((param) => param.name);

      expect(rpcName).toBe("create_sale_transaction");
      expect(Object.keys(params).sort()).toEqual([...sqlParamNames].sort());
    });
  });

  describe("endurecimiento de search_path de las tres sobrecargas", () => {
    const overloads = [
      {
        label: "9 parámetros",
        params: SALE_PARAMS_9,
      },
      {
        label: "10 parámetros",
        params: SALE_PARAMS_10,
      },
      {
        label: "11 parámetros",
        params: `${SALE_PARAMS_10}, p_notes text DEFAULT NULL::text`,
      },
    ];

    it.each(overloads)(
      "$label — fija SET search_path TO 'public'",
      ({ params }) => {
        expect(
          fixedNormSql.includes(
            `FUNCTION public.create_sale_transaction(${params}) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'`
          )
        ).toBe(true);
      }
    );

    it.each(overloads)(
      "$label — revoca de anon/public y otorga EXECUTE a authenticated y service_role",
      ({ params }) => {
        const grantParams = params.replace(/\s+DEFAULT\s+.*$/i, "");

        expect(
          fixedRawSql.includes(
            `REVOKE ALL ON FUNCTION public.create_sale_transaction(${grantParams}) FROM public;`
          )
        ).toBe(true);
        expect(
          fixedRawSql.includes(
            `REVOKE ALL ON FUNCTION public.create_sale_transaction(${grantParams}) FROM anon;`
          )
        ).toBe(true);
        expect(
          fixedRawSql.includes(
            `GRANT EXECUTE ON FUNCTION public.create_sale_transaction(${grantParams}) TO authenticated;`
          )
        ).toBe(true);
        expect(
          fixedRawSql.includes(
            `GRANT EXECUTE ON FUNCTION public.create_sale_transaction(${grantParams}) TO service_role;`
          )
        ).toBe(true);
      }
    );
  });

  describe("endurecimiento de search_path de cancel y devolucion parcial", () => {
    const hardened = [
      {
        label: "cancel_sale_transaction",
        name: "cancel_sale_transaction",
        params: CANCEL_PARAMS,
      },
      {
        label: "create_partial_return_transaction",
        name: "create_partial_return_transaction",
        params: RETURN_PARAMS,
      },
    ];

    it.each(hardened)(
      "$label — fija SET search_path TO 'public'",
      ({ name, params }) => {
        expect(
          fixedCancelNormSql.includes(
            `FUNCTION public.${name}(${params}) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'`
          )
        ).toBe(true);
      }
    );

    it.each(hardened)(
      "$label — revoca de anon/public y otorga EXECUTE a authenticated y service_role",
      ({ name, params }) => {
        expect(
          fixedCancelRawSql.includes(
            `REVOKE ALL ON FUNCTION public.${name}(${params}) FROM public;`
          )
        ).toBe(true);
        expect(
          fixedCancelRawSql.includes(
            `REVOKE ALL ON FUNCTION public.${name}(${params}) FROM anon;`
          )
        ).toBe(true);
        expect(
          fixedCancelRawSql.includes(
            `GRANT EXECUTE ON FUNCTION public.${name}(${params}) TO authenticated;`
          )
        ).toBe(true);
        expect(
          fixedCancelRawSql.includes(
            `GRANT EXECUTE ON FUNCTION public.${name}(${params}) TO service_role;`
          )
        ).toBe(true);
      }
    );
  });

  describe("create_transfer_order", () => {
    const paramNames = [
      "p_from_branch_id",
      "p_to_branch_id",
      "p_user_id",
      "p_notes",
      "p_folio",
      "p_items",
    ];

    it("expone la firma esperada y retorna jsonb", () => {
      const fn = findByParams("create_transfer_order", paramNames);

      expect(
        fn,
        "falta create_transfer_order con la firma esperada"
      ).toBeDefined();
      expect(fn.returns).toBe("jsonb");
    });

    it("declara los tipos esperados de cada parámetro", () => {
      const fn = findByParams("create_transfer_order", paramNames);

      expect(fn.params).toEqual([
        { name: "p_from_branch_id", type: "uuid" },
        { name: "p_to_branch_id", type: "uuid" },
        { name: "p_user_id", type: "uuid" },
        { name: "p_notes", type: "text" },
        { name: "p_folio", type: "text" },
        { name: "p_items", type: "jsonb" },
      ]);
    });

    it("fija el search_path como parte del endurecimiento", () => {
      expect(
        normalizedSql.includes(
          `FUNCTION public.create_transfer_order(${TRANSFER_PARAMS}) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'`
        )
      ).toBe(true);
    });

    it("revoca EXECUTE de anon y public", () => {
      expect(hasRevoke("create_transfer_order", TRANSFER_PARAMS, "anon")).toBe(
        true
      );
      expect(
        hasRevoke("create_transfer_order", TRANSFER_PARAMS, "public")
      ).toBe(true);
    });
  });
});
