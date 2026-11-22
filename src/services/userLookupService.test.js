import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/supabaseClient", () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from "../lib/supabaseClient";
import { loadUsers } from "./userLookupService";

const usersQuery = (response) => {
  const query = {
    select: vi.fn(() => query),
    in: vi.fn(() => query),
    order: vi.fn(() => query),
    gt: vi.fn(() => query),
    limit: vi.fn(() => Promise.resolve(response)),
  };
  return query;
};

describe("userLookupService.loadUsers", () => {
  beforeEach(() => {
    supabase.from.mockReset();
    window.localStorage.clear();
  });

  it("no consulta sin ids", async () => {
    expect(await loadUsers([])).toEqual([]);
    expect(await loadUsers(null)).toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("devuelve los usuarios de la tabla users", async () => {
    const query = usersQuery({
      data: [{ id: "u1", username: "cajero" }],
      error: null,
    });
    supabase.from.mockReturnValue(query);

    expect(await loadUsers(["u1"])).toEqual([{ id: "u1", username: "cajero" }]);
    expect(supabase.from).toHaveBeenCalledWith("users");
    expect(query.in).toHaveBeenCalledWith("id", ["u1"]);
  });

  it("reintenta con un select menor si falta una columna", async () => {
    supabase.from
      .mockReturnValueOnce(
        usersQuery({ data: null, error: { message: "column missing" } })
      )
      .mockReturnValueOnce(usersQuery({ data: [{ id: "u1" }], error: null }));

    expect(await loadUsers(["u1"])).toEqual([{ id: "u1" }]);
    expect(supabase.from).toHaveBeenCalledTimes(2);
  });

  it("guarda el select exitoso en la clave historica de cache", async () => {
    supabase.from
      .mockReturnValueOnce(
        usersQuery({ data: null, error: { message: "column missing" } })
      )
      .mockReturnValueOnce(usersQuery({ data: [{ id: "u1" }], error: null }));

    await loadUsers(["u1"]);

    expect(window.localStorage.getItem("movementsReportUsersSelect_v1")).toBe(
      "id"
    );
  });

  it("usa primero el select cacheado en la clave historica", async () => {
    window.localStorage.setItem(
      "movementsReportUsersSelect_v1",
      "id, username, full_name"
    );
    const query = usersQuery({ data: [{ id: "u1" }], error: null });
    supabase.from.mockReturnValue(query);

    await loadUsers(["u1"]);

    expect(query.select).toHaveBeenNthCalledWith(1, "id, username, full_name");
  });

  it("propaga errores que no son de columna", async () => {
    const error = { message: "permission denied" };
    supabase.from.mockReturnValue(usersQuery({ data: null, error }));

    await expect(loadUsers(["u1"])).rejects.toBe(error);
  });
});
