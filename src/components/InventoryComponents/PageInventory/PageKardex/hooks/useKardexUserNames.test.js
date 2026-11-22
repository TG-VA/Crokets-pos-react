import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

vi.mock("../../PageMovementsReport/services/movementsReportService", () => ({
  loadUsers: vi.fn(),
}));

import { loadUsers } from "../../PageMovementsReport/services/movementsReportService";

import useKardexUserNames from "./useKardexUserNames";

describe("useKardexUserNames", () => {
  beforeEach(() => {
    loadUsers.mockReset();
  });

  it("pide los ids unicos en un solo lote y mapea el username", async () => {
    loadUsers.mockResolvedValue([{ id: "u1", username: "cajero" }]);

    const { result } = renderHook(() => useKardexUserNames(["u1", null, "u1"]));

    await waitFor(() => expect(result.current.get("u1")).toBe("CAJERO"));

    expect(loadUsers).toHaveBeenCalledTimes(1);
    expect(loadUsers).toHaveBeenCalledWith(["u1"]);
  });

  it("solo pide los ids nuevos al cambiar la lista", async () => {
    loadUsers.mockResolvedValue([]);

    const { rerender } = renderHook(({ ids }) => useKardexUserNames(ids), {
      initialProps: { ids: ["u1"] },
    });

    rerender({ ids: ["u1", "u2"] });

    await waitFor(() => expect(loadUsers).toHaveBeenCalledTimes(2));

    expect(loadUsers).toHaveBeenLastCalledWith(["u2"]);
  });

  it("no consulta sin ids y reporta el error sin romper", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    loadUsers.mockRejectedValue(new Error("boom"));

    const { result, rerender } = renderHook(
      ({ ids }) => useKardexUserNames(ids),
      {
        initialProps: { ids: [] },
      }
    );

    expect(loadUsers).not.toHaveBeenCalled();

    rerender({ ids: ["u9"] });

    await waitFor(() => expect(consoleError).toHaveBeenCalled());

    expect(result.current.size).toBe(0);

    consoleError.mockRestore();
  });

  it("vuelve a pedir un id cuya carga fallo", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    loadUsers.mockRejectedValueOnce(new Error("boom"));
    loadUsers.mockResolvedValueOnce([{ id: "u9", username: "admin" }]);

    const { result, rerender } = renderHook(
      ({ ids }) => useKardexUserNames(ids),
      {
        initialProps: { ids: ["u9"] },
      }
    );

    await waitFor(() => expect(consoleError).toHaveBeenCalled());

    rerender({ ids: ["u9", "u10"] });

    await waitFor(() => expect(result.current.get("u9")).toBe("ADMIN"));

    expect(loadUsers).toHaveBeenCalledTimes(2);
    expect(loadUsers).toHaveBeenLastCalledWith(["u10", "u9"]);

    consoleError.mockRestore();
  });
});
