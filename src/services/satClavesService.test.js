import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../lib/supabaseClient", () => ({
  supabase: { from: vi.fn() },
}));

vi.mock("./supabase/paginatedQuery", async (importOriginal) => {
  const { withSmallPages } = await import("./supabase/fakePostgrest.testUtils");
  return withSmallPages(await importOriginal());
});

import { supabase } from "../lib/supabaseClient";
import { createFakePostgrest } from "./supabase/fakePostgrest.testUtils";
import { fetchSatClaves, validateSatClaves } from "./satClavesService";

/*
  Lotes y paginas de 2 con el doble de PostgREST: una importacion con varias
  claves SAT se consulta en varios lotes de .in() paginados sobre clave.
*/

describe("validateSatClaves", () => {
  let fake;

  beforeEach(() => {
    fake = createFakePostgrest({
      sat_claves_productos_servicios: [
        "10101500",
        "10101501",
        "10101502",
        "10101503",
        "10101504",
      ].map((clave) => ({ clave, status: true })),
    });
    supabase.from.mockImplementation(fake.from);
  });

  it("devuelve las claves existentes de todos los lotes", async () => {
    const result = await validateSatClaves([
      "10101500",
      "10101501",
      "10101501",
      "10101503",
      "99999999",
      "10101504",
    ]);

    expect(result.map((row) => row.clave)).toEqual([
      "10101500",
      "10101501",
      "10101503",
      "10101504",
    ]);
    expect(fake.calls.every((call) => call.orders[0].column === "clave")).toBe(
      true
    );
  });

  it("no consulta sin claves", async () => {
    expect(await validateSatClaves([])).toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("lanza el error de un lote", async () => {
    const failure = { message: "boom" };
    supabase.from.mockImplementation(() => {
      const query = {
        select: () => query,
        in: () => query,
        order: () => query,
        limit: () => Promise.resolve({ data: null, error: failure }),
      };
      return query;
    });

    await expect(validateSatClaves(["10101500"])).rejects.toBe(failure);
  });
});

describe("fetchSatClaves", () => {
  it("lee todas las paginas de claves activas y ordena por descripcion", async () => {
    const fake = createFakePostgrest({
      sat_claves_productos_servicios: [
        { clave: "10101500", descripcion: "Perros", status: true },
        { clave: "10101501", descripcion: "Alimento", status: true },
        { clave: "10101502", descripcion: "Gatos", status: false },
        { clave: "10101503", descripcion: "Correas", status: true },
        { clave: "10101504", descripcion: "Bebederos", status: true },
      ],
    });
    supabase.from.mockImplementation(fake.from);

    const result = await fetchSatClaves();

    expect(result.map((row) => row.descripcion)).toEqual([
      "Alimento",
      "Bebederos",
      "Correas",
      "Perros",
    ]);
    expect(fake.calls.length).toBeGreaterThan(1);
    expect(fake.calls.every((call) => call.orders[0].column === "clave")).toBe(
      true
    );
  });

  it("lanza el error de Supabase", async () => {
    const error = { message: "boom" };
    supabase.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: null, error }),
          }),
        }),
      }),
    });

    await expect(fetchSatClaves()).rejects.toBe(error);
  });
});
