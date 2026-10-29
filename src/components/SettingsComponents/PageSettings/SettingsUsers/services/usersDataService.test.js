import { describe, it, expect, beforeEach, vi } from "vitest";
import { supabase } from "../../../../../lib/supabaseClient";
import {
  createUser,
  fetchRoles,
  fetchUsers,
  normalizeRoleName,
  normalizeUserRow,
  updateUser,
  updateUserPassword,
  updateUserStatus,
} from "./usersDataService";

vi.mock("../../../../../lib/supabaseClient", () => ({
  supabase: {
    from: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
    auth: {
      getSession: vi.fn(),
      signUp: vi.fn(),
      setSession: vi.fn(),
    },
  },
}));

describe("usersDataService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("normalizeRoleName", () => {
    it("extrae el nombre de un arreglo de roles", () => {
      expect(normalizeRoleName([{ name: "admin" }])).toBe("admin");
      expect(normalizeRoleName([])).toBeNull();
    });

    it("extrae el nombre de un objeto de rol unico", () => {
      expect(normalizeRoleName({ name: "cajero" })).toBe("cajero");
      expect(normalizeRoleName(null)).toBeNull();
    });
  });

  describe("normalizeUserRow", () => {
    it("normaliza una fila completa", () => {
      const row = {
        id: "usr-1",
        name: "Valeria Gomez",
        username: "valeria",
        email: "valeria@crokets.test",
        status: true,
        role_id: "role-admin",
        roles: { name: "admin" },
        created_at: "2026-03-01T12:00:00Z",
      };

      expect(normalizeUserRow(row)).toEqual({
        id: "usr-1",
        name: "Valeria Gomez",
        username: "valeria",
        email: "valeria@crokets.test",
        status: true,
        roleId: "role-admin",
        roleName: "admin",
        createdAt: "2026-03-01T12:00:00Z",
      });
    });

    it("aplica valores de respaldo cuando faltan campos", () => {
      expect(normalizeUserRow({})).toEqual({
        id: "SIN USUARIO",
        name: "",
        username: "SIN USUARIO",
        email: "",
        status: null,
        roleId: null,
        roleName: "SIN ROL",
        createdAt: null,
      });
    });
  });

  describe("fetchUsers", () => {
    it("devuelve los usuarios normalizados en el primer intento", async () => {
      const order = vi.fn().mockResolvedValue({
        data: [
          {
            id: "u1",
            name: "Carlos",
            username: "carlos",
            email: "carlos@crokets.test",
            status: true,
            role_id: "role-admin",
            created_at: "2026-01-01",
            roles: [{ name: "admin" }],
          },
        ],
        error: null,
      });
      const select = vi.fn().mockReturnValue({ order });
      supabase.from.mockReturnValue({ select });

      const result = await fetchUsers();

      expect(supabase.from).toHaveBeenCalledWith("users");
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].roleName).toBe("admin");
      expect(result.data[0].roleId).toBe("role-admin");
    });

    it("reintenta con un select mas simple si la columna name no existe", async () => {
      const orderFirst = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "column users.name does not exist" },
      });
      const orderSecond = vi.fn().mockResolvedValue({
        data: [
          {
            id: "u2",
            username: "diana",
            email: "diana@crokets.test",
            status: false,
            role_id: "role-cashier",
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

      const result = await fetchUsers();

      expect(select).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
      expect(result.data[0].name).toBe("");
      expect(result.data[0].roleName).toBe("SIN ROL");
    });

    it("agota los candidatos y reporta error", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const order = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "conexion rechazada" },
      });
      const select = vi.fn().mockReturnValue({ order });
      supabase.from.mockReturnValue({ select });

      const result = await fetchUsers();

      expect(result.success).toBe(false);
      expect(result.error).toBe("conexion rechazada");
      expect(select).toHaveBeenCalledTimes(4);
      expect(consoleError).toHaveBeenCalled();

      consoleError.mockRestore();
    });
  });

  describe("fetchRoles", () => {
    it("devuelve los roles ordenados", async () => {
      const order = vi.fn().mockResolvedValue({
        data: [
          { id: "r1", name: "admin" },
          { id: "r2", name: "cajero" },
        ],
        error: null,
      });
      const select = vi.fn().mockReturnValue({ order });
      supabase.from.mockReturnValue({ select });

      const result = await fetchRoles();

      expect(supabase.from).toHaveBeenCalledWith("roles");
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it("reporta el error de Supabase", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const order = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "sin acceso a roles" },
      });
      const select = vi.fn().mockReturnValue({ order });
      supabase.from.mockReturnValue({ select });

      const result = await fetchRoles();

      expect(result.success).toBe(false);
      expect(result.error).toBe("sin acceso a roles");
      expect(consoleError).toHaveBeenCalled();

      consoleError.mockRestore();
    });
  });

  describe("updateUser", () => {
    const buildUpdateMock = (response) => {
      const maybeSingle = vi.fn().mockResolvedValue(response);
      const select = vi.fn().mockReturnValue({ maybeSingle });
      const eq = vi.fn().mockReturnValue({ select });
      const update = vi.fn().mockReturnValue({ eq });
      supabase.from.mockReturnValue({ update });
      return { update, eq, select, maybeSingle };
    };

    it("actualiza nombre y rol y devuelve la fila normalizada", async () => {
      const { update, eq } = buildUpdateMock({
        data: {
          id: "u1",
          name: "Ana Actualizada",
          username: "ana",
          email: "ana@crokets.test",
          status: true,
          role_id: "role-cashier",
          created_at: "2026-01-01",
        },
        error: null,
      });

      const result = await updateUser({
        id: "u1",
        name: "  Ana Actualizada  ",
        roleId: "role-cashier",
      });

      expect(update).toHaveBeenCalledWith({
        name: "Ana Actualizada",
        role_id: "role-cashier",
      });
      expect(eq).toHaveBeenCalledWith("id", "u1");
      expect(result.success).toBe(true);
      expect(result.data.roleId).toBe("role-cashier");
    });

    it("envia el username recortado y en minusculas", async () => {
      const { update } = buildUpdateMock({
        data: {
          id: "u1",
          name: "Ana",
          username: "nueva",
          email: "ana@crokets.test",
          status: true,
          role_id: "role-admin",
          created_at: "2026-01-01",
        },
        error: null,
      });

      const result = await updateUser({
        id: "u1",
        name: "Ana",
        username: "  NUEVA  ",
        roleId: "role-admin",
      });

      expect(update).toHaveBeenCalledWith({
        name: "Ana",
        username: "nueva",
        role_id: "role-admin",
      });
      expect(result.success).toBe(true);
      expect(result.data.username).toBe("nueva");
    });

    it("no consulta si no hay campos que actualizar", async () => {
      const result = await updateUser({ id: "u1" });

      expect(result).toEqual({ success: true, data: null, error: null });
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it("rechaza la actualizacion sin id", async () => {
      const result = await updateUser({ name: "X" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("identificador");
    });

    it("propaga el error de Supabase", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      buildUpdateMock({ data: null, error: { message: "fallo update" } });

      const result = await updateUser({ id: "u1", name: "X" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("fallo update");
      expect(consoleError).toHaveBeenCalled();

      consoleError.mockRestore();
    });
  });

  describe("updateUserStatus", () => {
    const buildStatusMock = (response) => {
      const maybeSingle = vi.fn().mockResolvedValue(response);
      const select = vi.fn().mockReturnValue({ maybeSingle });
      const eq = vi.fn().mockReturnValue({ select });
      const update = vi.fn().mockReturnValue({ eq });
      supabase.from.mockReturnValue({ update });
      return { update };
    };

    it("desactiva a un usuario", async () => {
      const { update } = buildStatusMock({
        data: { id: "u1", status: false, username: "ana" },
        error: null,
      });

      const result = await updateUserStatus({ id: "u1", status: false });

      expect(update).toHaveBeenCalledWith({ status: false });
      expect(result.success).toBe(true);
      expect(result.data.status).toBe(false);
    });

    it("rechaza estados no booleanos", async () => {
      const result = await updateUserStatus({ id: "u1", status: "false" });

      expect(result.success).toBe(false);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it("propaga el error de Supabase", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      buildStatusMock({ data: null, error: { message: "fallo estado" } });

      const result = await updateUserStatus({ id: "u1", status: true });

      expect(result.success).toBe(false);
      expect(result.error).toBe("fallo estado");
      expect(consoleError).toHaveBeenCalled();

      consoleError.mockRestore();
    });
  });

  describe("updateUserPassword", () => {
    it("invoca la edge function admin-reset-user-password", async () => {
      supabase.functions.invoke.mockResolvedValue({
        data: { ok: true, targetId: "u1" },
        error: null,
      });

      const result = await updateUserPassword({
        id: "u1",
        password: "nuevaClave1",
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        "admin-reset-user-password",
        { body: { targetId: "u1", newPassword: "nuevaClave1" } }
      );
      expect(result).toEqual({
        success: true,
        data: { id: "u1" },
        error: null,
      });
    });

    it("rechaza la operacion sin identificador", async () => {
      const result = await updateUserPassword({ password: "nuevaClave1" });

      expect(result.success).toBe(false);
      expect(supabase.functions.invoke).not.toHaveBeenCalled();
    });

    it("rechaza contrasenas menores a 6 caracteres", async () => {
      const result = await updateUserPassword({ id: "u1", password: "123" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("6 caracteres");
      expect(supabase.functions.invoke).not.toHaveBeenCalled();
    });

    it("propaga el rechazo de la edge function", async () => {
      supabase.functions.invoke.mockResolvedValue({
        data: { ok: false, message: "Solo un administrador puede..." },
        error: null,
      });

      const result = await updateUserPassword({
        id: "u1",
        password: "nuevaClave1",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Solo un administrador");
    });

    it("propaga el error de la invocacion", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      supabase.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: "fallo de red" },
      });

      const result = await updateUserPassword({
        id: "u1",
        password: "nuevaClave1",
      });

      expect(result.success).toBe(false);
      expect(consoleError).toHaveBeenCalled();

      consoleError.mockRestore();
    });
  });

  describe("createUser", () => {
    it("invoca la edge function admin-create-user sin exigir confirmacion", async () => {
      supabase.functions.invoke.mockResolvedValue({
        data: { ok: true, data: { id: "new-1" } },
        error: null,
      });

      const result = await createUser({
        name: "Nuevo Usuario",
        username: "nuevo",
        email: "NUEVO@crokets.test",
        roleId: "role-cashier",
        password: "secreto123",
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        "admin-create-user",
        {
          body: {
            name: "Nuevo Usuario",
            username: "nuevo",
            email: "nuevo@crokets.test",
            roleId: "role-cashier",
            password: "secreto123",
          },
        }
      );
      expect(result).toEqual({
        success: true,
        data: { id: "new-1" },
        requiresConfirmation: false,
        error: null,
      });
    });

    it("rechaza la creacion sin los datos obligatorios", async () => {
      const result = await createUser({ name: "X", username: "x" });

      expect(result.success).toBe(false);
      expect(supabase.functions.invoke).not.toHaveBeenCalled();
    });

    it("rechaza la creacion sin contrasena", async () => {
      const result = await createUser({
        name: "X",
        username: "x",
        email: "x@crokets.test",
        roleId: "role-admin",
      });

      expect(result.success).toBe(false);
      expect(supabase.functions.invoke).not.toHaveBeenCalled();
    });

    it("propaga el error de la invocacion", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      supabase.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: "fallo de red" },
      });

      const result = await createUser({
        name: "X",
        username: "x",
        email: "x@crokets.test",
        roleId: "role-admin",
        password: "secreto123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("fallo de red");
      expect(consoleError).toHaveBeenCalled();

      consoleError.mockRestore();
    });

    it("propaga el rechazo de la edge function", async () => {
      supabase.functions.invoke.mockResolvedValue({
        data: { ok: false, message: "correo ya registrado" },
        error: null,
      });

      const result = await createUser({
        name: "X",
        username: "x",
        email: "x@crokets.test",
        roleId: "role-admin",
        password: "secreto123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("correo ya registrado");
    });
  });
});
