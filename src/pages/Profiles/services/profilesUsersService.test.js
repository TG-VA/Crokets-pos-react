import { describe, it, expect, beforeEach, vi } from "vitest";
import { supabase } from "../../../lib/supabaseClient";
import {
  fetchProfilesUsers,
  normalizeRoleName,
  normalizeUserRow,
} from "./profilesUsersService";

vi.mock("../../../lib/supabaseClient", () => ({
  supabase: { from: vi.fn() },
}));

describe("profilesUsersService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("normalizeRoleName", () => {
    it("extrae el nombre de un arreglo de roles", () => {
      expect(normalizeRoleName([{ name: "admin" }])).toBe("admin");
      expect(normalizeRoleName([])).toBeNull();
    });

    it("extrae el nombre de un objeto de rol único", () => {
      expect(normalizeRoleName({ name: "cajero" })).toBe("cajero");
      expect(normalizeRoleName(null)).toBeNull();
    });
  });

  describe("normalizeUserRow", () => {
    it("normaliza una fila completa con rol y estado", () => {
      const row = {
        id: "usr-1",
        username: "valeria",
        email: "valeria@crokets.test",
        status: true,
        roles: { name: "admin" },
        created_at: "2026-03-01T12:00:00Z",
      };

      expect(normalizeUserRow(row)).toEqual({
        id: "usr-1",
        username: "valeria",
        email: "valeria@crokets.test",
        status: true,
        roleName: "admin",
        createdAt: "2026-03-01T12:00:00Z",
      });
    });

    it("aplica los valores de respaldo cuando faltan campos", () => {
      const row = {};

      expect(normalizeUserRow(row)).toEqual({
        id: "SIN USUARIO",
        username: "SIN USUARIO",
        email: "SIN CORREO",
        status: null,
        roleName: "SIN ROL",
        createdAt: null,
      });
    });
  });

  describe("fetchProfilesUsers", () => {
    it("devuelve los usuarios normalizados cuando el primer intento tiene éxito", async () => {
      const order = vi.fn().mockResolvedValue({
        data: [
          {
            id: "u1",
            username: "carlos",
            email: "carlos@crokets.test",
            status: true,
            created_at: "2026-01-01",
            roles: [{ name: "cajero" }],
          },
        ],
        error: null,
      });
      const select = vi.fn().mockReturnValue({ order });
      supabase.from.mockReturnValue({ select });

      const users = await fetchProfilesUsers();

      expect(supabase.from).toHaveBeenCalledWith("users");
      expect(select).toHaveBeenCalledWith(
        "id, username, email, status, created_at, roles ( name )"
      );
      expect(users).toHaveLength(1);
      expect(users[0]).toEqual({
        id: "u1",
        username: "carlos",
        email: "carlos@crokets.test",
        status: true,
        roleName: "cajero",
        createdAt: "2026-01-01",
      });
    });

    it("reintenta sin la relación roles si el primer query falla", async () => {
      const orderFirst = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "permission denied for table roles" },
      });
      const orderSecond = vi.fn().mockResolvedValue({
        data: [
          {
            id: "u2",
            username: "diana",
            email: "diana@crokets.test",
            status: false,
            created_at: "2026-02-01",
          },
        ],
        error: null,
      });

      const select = vi
        .fn()
        .mockReturnValueOnce({ order: orderFirst })
        .mockReturnValueOnce({ order: orderSecond });

      supabase.from.mockReturnValue({ select });

      const users = await fetchProfilesUsers();

      expect(select).toHaveBeenCalledTimes(2);
      expect(users).toHaveLength(1);
      expect(users[0].roleName).toBe("SIN ROL");
    });

    it("lanza el último error si todos los candidatos fallan", async () => {
      const orderFails = vi.fn().mockResolvedValue({
        data: null,
        error: new Error("conexion rechazada"),
      });
      const select = vi.fn().mockReturnValue({ order: orderFails });
      supabase.from.mockReturnValue({ select });

      await expect(fetchProfilesUsers()).rejects.toThrow("conexion rechazada");
    });
  });
});
