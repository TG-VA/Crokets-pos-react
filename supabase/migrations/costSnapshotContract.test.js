import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20261002124615_add_cost_tracking_and_sale_cost_snapshot.sql"
);

const rawSql = readFileSync(MIGRATION, "utf8");
const normSql = rawSql.replace(/\s+/g, " ").toLowerCase();

const OVERLOAD_PATTERN =
  /CREATE OR REPLACE FUNCTION public\.create_sale_transaction\(([^)]*)\)[\s\S]*?\$function\$;/g;

const SIGNATURES = [
  {
    label: "9 parámetros",
    params: 9,
    sig: "p_branch_id uuid, p_user_id uuid, p_customer_id uuid, p_subtotal numeric, p_tax numeric, p_total numeric, p_sale_date timestamp with time zone, p_products jsonb, p_payments jsonb",
  },
  {
    label: "10 parámetros",
    params: 10,
    sig: "p_branch_id uuid, p_user_id uuid, p_customer_id uuid, p_subtotal numeric, p_tax numeric, p_total numeric, p_sale_date timestamp with time zone, p_products jsonb, p_payments jsonb, p_client_sale_token uuid",
  },
  {
    label: "11 parámetros",
    params: 11,
    sig: "p_branch_id uuid, p_user_id uuid, p_customer_id uuid, p_subtotal numeric, p_tax numeric, p_total numeric, p_sale_date timestamp with time zone, p_products jsonb, p_payments jsonb, p_client_sale_token uuid, p_notes text DEFAULT NULL::text",
  },
];

const overloads = [...rawSql.matchAll(OVERLOAD_PATTERN)].map((match) => ({
  sig: match[1].replace(/\s+/g, " ").trim(),
  body: match[0],
  norm: match[0].replace(/\s+/g, " ").trim(),
}));

const parseList = (text) =>
  text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

const parseSaleDetailsInsert = (body) => {
  const start = body.indexOf("insert into public.sale_details (");
  const columnsOpen = body.indexOf("(", start) + 1;
  const columnsClose = body.indexOf("\n    )", columnsOpen);
  const valuesIdx = body.indexOf("values (", columnsClose);

  if (start === -1 || columnsClose === -1 || valuesIdx === -1) {
    throw new Error("no se encontro el INSERT en public.sale_details");
  }

  const columns = parseList(body.slice(columnsOpen, columnsClose));
  const valuesOpen = valuesIdx + "values (".length;
  const valuesClose = body.indexOf("\n    )", valuesOpen);

  if (valuesClose === -1) {
    throw new Error("no se encontro el cierre de la lista de valores");
  }

  return {
    columns,
    values: parseList(body.slice(valuesOpen, valuesClose)),
  };
};

const cases = overloads.map((overload, index) => ({
  ...SIGNATURES[index],
  overload,
}));

describe("contrato SQL del snapshot de costo de venta", () => {
  describe("columnas de costo", () => {
    it("agrega unit_cost y total_cost a inventory_movements", () => {
      expect(
        normSql.includes(
          "alter table public.inventory_movements add column if not exists unit_cost numeric null, add column if not exists total_cost numeric null;"
        )
      ).toBe(true);
    });

    it("agrega cost_price NOT NULL DEFAULT 0 a sale_details", () => {
      expect(
        normSql.includes(
          "alter table public.sale_details add column if not exists cost_price numeric not null default 0;"
        )
      ).toBe(true);
    });

    it("no hace backfill del costo historico de las partidas existentes", () => {
      expect(normSql).not.toMatch(/update\s+public\.sale_details/);
    });
  });

  it("redefine las tres sobrecargas vigentes de create_sale_transaction", () => {
    expect(overloads).toHaveLength(3);
  });

  it.each(cases)(
    "$label — conserva la firma y el retorno uuid",
    ({ sig, overload }) => {
      expect(overload.sig).toBe(sig);
      expect(overload.norm).toContain(
        ") RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER"
      );
    }
  );

  it.each(cases)(
    "$label — mantiene el hardening (SECURITY DEFINER + search_path)",
    ({ overload }) => {
      expect(
        overload.norm.includes(
          ") RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'"
        )
      ).toBe(true);
    }
  );

  it.each(cases)(
    "$label — revoca de anon/public y otorga EXECUTE a authenticated y service_role",
    ({ sig }) => {
      // El GRANT/REVOKE se declara sin el DEFAULT de p_notes.
      const fn = `public.create_sale_transaction(${sig.replace(
        /\s+DEFAULT\s+.*$/i,
        ""
      )})`;

      expect(rawSql).toContain(`REVOKE ALL ON FUNCTION ${fn} FROM public;`);
      expect(rawSql).toContain(`REVOKE ALL ON FUNCTION ${fn} FROM anon;`);
      expect(rawSql).toContain(
        `GRANT EXECUTE ON FUNCTION ${fn} TO authenticated;`
      );
      expect(rawSql).toContain(
        `GRANT EXECUTE ON FUNCTION ${fn} TO service_role;`
      );
    }
  );

  it.each(cases)(
    "$label — declara la variable v_cost_price",
    ({ overload }) => {
      expect(overload.body).toContain("v_cost_price numeric;");
    }
  );

  it.each(cases)(
    "$label — resuelve el costo de branch_inventory con fallback a products",
    ({ overload }) => {
      expect(overload.norm).toContain(
        "select coalesce(bi.cost_price, p.cost_price) into v_cost_price from public.products p left join public.branch_inventory bi on bi.product_id = p.id and bi.branch_id = p_branch_id where p.id = v_product_id;"
      );
      expect(overload.norm).toContain(
        "v_cost_price := round(coalesce(v_cost_price, 0), 2);"
      );
    }
  );

  it.each(cases)(
    "$label — congela el costo en el INSERT de sale_details antes de insertarlo",
    ({ overload }) => {
      const { columns, values } = parseSaleDetailsInsert(overload.body);

      const resolutionIdx = overload.norm.indexOf(
        "select coalesce(bi.cost_price, p.cost_price)"
      );
      const insertIdx = overload.norm.indexOf(
        "insert into public.sale_details ("
      );

      expect(resolutionIdx).toBeGreaterThan(-1);
      expect(resolutionIdx).toBeLessThan(insertIdx);
      expect(columns.at(-1)).toBe("cost_price");
      expect(values.at(-1)).toBe("v_cost_price");
      expect(columns).toHaveLength(values.length);
    }
  );

  it("conserva las columnas de comision en la sobrecarga efectiva de 11 parámetros", () => {
    const effective = cases.find(({ params }) => params === 11);
    const { columns, values } = parseSaleDetailsInsert(effective.overload.body);

    expect(columns).toEqual([
      "sale_id",
      "product_id",
      "branch_id",
      "quantity",
      "unit_price",
      "total_price",
      "original_unit_price",
      "final_unit_price",
      "discount_type",
      "discount_value",
      "discount_amount",
      "commission_enabled",
      "commission_type",
      "commission_value",
      "commission_amount",
      "cost_price",
    ]);
    expect(values.at(-2)).toBe("v_comm_amount");
  });
});
