import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../lib/supabaseClient", () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from "../lib/supabaseClient";
import {
  BRANCH_TYPES,
  isOperationalBranch,
  isAdminBranch,
  fetchOperationalBranches,
  fetchAllBranches,
} from "./branchScopeService";

const thenableQuery = ({ data, error }) => {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => Promise.resolve({ data, error })),
  };
  return query;
};

describe("BRANCH_TYPES", () => {
  it("expone los dos tipos congelados", () => {
    expect(BRANCH_TYPES).toEqual({
      OPERATIONAL: "operational",
      ADMIN: "admin",
    });
    expect(Object.isFrozen(BRANCH_TYPES)).toBe(true);
  });
});

describe("isOperationalBranch", () => {
  it("acepta una sucursal operativa", () => {
    expect(isOperationalBranch({ branch_type: "operational" })).toBe(true);
  });

  it("rechaza una sucursal admin", () => {
    expect(isOperationalBranch({ branch_type: "admin" })).toBe(false);
  });

  it("trata la sucursal sin branch_type como operativa (default de BD)", () => {
    expect(isOperationalBranch({ id: "b1" })).toBe(true);
    expect(isOperationalBranch({ id: "b1", branch_type: null })).toBe(true);
  });

  it("devuelve false con null, undefined o valores no objeto", () => {
    expect(isOperationalBranch(null)).toBe(false);
    expect(isOperationalBranch(undefined)).toBe(false);
    expect(isOperationalBranch("operational")).toBe(false);
  });

  it("rechaza un tipo desconocido", () => {
    expect(isOperationalBranch({ branch_type: "otro" })).toBe(false);
  });
});

describe("isAdminBranch", () => {
  it("solo es true con branch_type admin", () => {
    expect(isAdminBranch({ branch_type: "admin" })).toBe(true);
    expect(isAdminBranch({ branch_type: "operational" })).toBe(false);
    expect(isAdminBranch({})).toBe(false);
    expect(isAdminBranch(null)).toBe(false);
  });
});

describe("fetchOperationalBranches", () => {
  beforeEach(() => supabase.from.mockReset());

  it("filtra por branch_type operational y ordena por nombre", async () => {
    const query = thenableQuery({ data: [{ id: "b1" }], error: null });
    supabase.from.mockReturnValue(query);

    const result = await fetchOperationalBranches({ columns: "id, name" });

    expect(supabase.from).toHaveBeenCalledWith("branches");
    expect(query.select).toHaveBeenCalledWith("id, name");
    expect(query.eq).toHaveBeenCalledWith("branch_type", "operational");
    expect(query.eq).not.toHaveBeenCalledWith("is_active", true);
    expect(query.order).toHaveBeenCalledWith("name", { ascending: true });
    expect(result).toEqual({ data: [{ id: "b1" }], error: null });
  });

  it("agrega is_active cuando se pide activeOnly", async () => {
    const query = thenableQuery({ data: [], error: null });
    supabase.from.mockReturnValue(query);

    await fetchOperationalBranches({ activeOnly: true });

    expect(query.select).toHaveBeenCalledWith("id, name, code");
    expect(query.eq).toHaveBeenCalledWith("is_active", true);
  });

  it("devuelve data vacia y el error de Supabase", async () => {
    const error = { message: "boom" };
    supabase.from.mockReturnValue(thenableQuery({ data: null, error }));

    const result = await fetchOperationalBranches();

    expect(result).toEqual({ data: [], error });
  });
});

describe("fetchAllBranches", () => {
  beforeEach(() => supabase.from.mockReset());

  it("no filtra por tipo", async () => {
    const query = thenableQuery({ data: [{ id: "adm" }], error: null });
    supabase.from.mockReturnValue(query);

    const result = await fetchAllBranches({ activeOnly: true });

    expect(query.eq).toHaveBeenCalledTimes(1);
    expect(query.eq).toHaveBeenCalledWith("is_active", true);
    expect(result.data).toEqual([{ id: "adm" }]);
  });
});
