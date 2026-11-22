import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

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

  it("ignora la respuesta de una carga ya descartada", async () => {
    let resolveStale;

    fetchAllBranches
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveStale = resolve;
          })
      )
      .mockResolvedValueOnce({
        data: [{ id: "b1", name: "Nuevo" }],
        error: null,
      });

    const { result, rerender } = renderHook(
      ({ enabled }) => useKardexBranchNames({ enabled }),
      { initialProps: { enabled: true } }
    );

    rerender({ enabled: false });
    rerender({ enabled: true });

    await waitFor(() => expect(result.current.get("b1")).toBe("NUEVO"));

    await act(async () => {
      resolveStale({ data: [{ id: "b1", name: "Viejo" }], error: null });
    });

    expect(result.current.get("b1")).toBe("NUEVO");
  });

  it("no consulta deshabilitado", () => {
    renderHook(() => useKardexBranchNames({ enabled: false }));

    expect(fetchAllBranches).not.toHaveBeenCalled();
  });
});
