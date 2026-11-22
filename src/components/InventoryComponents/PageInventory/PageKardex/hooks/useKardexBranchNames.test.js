import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

vi.mock("../../../../../services/branchScopeService", () => ({
  fetchAllBranches: vi.fn(),
}));

import { fetchAllBranches } from "../../../../../services/branchScopeService";

import useKardexBranchNames from "./useKardexBranchNames";

describe("useKardexBranchNames", () => {
  beforeEach(() => {
    fetchAllBranches.mockReset();
  });

  it("mapea id a nombre en mayusculas", async () => {
    fetchAllBranches.mockResolvedValue({
      data: [{ id: "b1", name: "Centro" }],
      error: null,
    });

    const { result } = renderHook(() => useKardexBranchNames());

    await waitFor(() => expect(result.current.get("b1")).toBe("CENTRO"));

    expect(fetchAllBranches).toHaveBeenCalledWith({ columns: "id, name" });
  });

  it("deja el mapa vacio si la consulta falla", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    fetchAllBranches.mockResolvedValue({ data: [], error: new Error("x") });

    const { result } = renderHook(() => useKardexBranchNames());

    await waitFor(() => expect(consoleError).toHaveBeenCalled());

    expect(result.current.size).toBe(0);

    consoleError.mockRestore();
  });

  it("no consulta deshabilitado", () => {
    renderHook(() => useKardexBranchNames({ enabled: false }));

    expect(fetchAllBranches).not.toHaveBeenCalled();
  });
});
