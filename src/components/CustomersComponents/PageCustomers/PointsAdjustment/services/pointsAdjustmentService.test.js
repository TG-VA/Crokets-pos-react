import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../../../../lib/supabaseClient", () => ({
  supabase: { from: vi.fn(), auth: { getUser: vi.fn() } },
}));

import { supabase } from "../../../../../lib/supabaseClient";
import {
  fetchCurrentAuthUser,
  fetchCustomerPointMovements,
  fetchUserProfileWithRole,
  insertPointsMovement,
  searchPointsCustomers,
} from "./pointsAdjustmentService";

const thenableQuery = (resolve = { data: null, error: null }) => {
  const q = {
    select: vi.fn(),
    eq: vi.fn(),
    or: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn(),
    insert: vi.fn(),
  };

  Object.values(q).forEach((fn) => fn.mockReturnValue(q));
  q.then = (onFulfilled, onRejected) =>
    Promise.resolve(resolve).then(onFulfilled, onRejected);

  return q;
};

describe("pointsAdjustmentService", () => {
  beforeEach(() => {
    supabase.from.mockReset();
    supabase.auth.getUser.mockReset();
  });

  describe("fetchCurrentAuthUser", () => {
    it("devuelve el usuario de la sesion", async () => {
      const user = { id: "u1" };
      supabase.auth.getUser.mockResolvedValue({ data: { user }, error: null });

      await expect(fetchCurrentAuthUser()).resolves.toEqual(user);
    });

    it("devuelve null sin sesion iniciada", async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(fetchCurrentAuthUser()).resolves.toBeNull();
    });

    it("propaga el error de autenticacion", async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error("sesion"),
      });

      await expect(fetchCurrentAuthUser()).rejects.toThrow("sesion");
    });
  });

  describe("fetchUserProfileWithRole", () => {
    it("consulta el perfil con el rol resuelto", async () => {
      const profile = { id: "u1", status: true, roles: { name: "admin" } };
      const query = thenableQuery({ data: profile, error: null });
      supabase.from.mockReturnValue(query);

      await expect(fetchUserProfileWithRole("u1")).resolves.toEqual(profile);
      expect(supabase.from).toHaveBeenCalledWith("users");
      expect(query.eq).toHaveBeenCalledWith("id", "u1");
    });

    it("devuelve null cuando el perfil no existe", async () => {
      supabase.from.mockReturnValue(thenableQuery({ data: null, error: null }));

      await expect(fetchUserProfileWithRole("u9")).resolves.toBeNull();
    });

    it("propaga el error de la consulta", async () => {
      supabase.from.mockReturnValue(
        thenableQuery({ data: null, error: new Error("perfil") })
      );

      await expect(fetchUserProfileWithRole("u1")).rejects.toThrow("perfil");
    });
  });

  describe("searchPointsCustomers", () => {
    it("filtra por clientes de puntos activos y busca en los tres campos", async () => {
      const customers = [{ id: "c1", name: "ANA" }];
      const query = thenableQuery({ data: customers, error: null });
      supabase.from.mockReturnValue(query);

      await expect(searchPointsCustomers("an")).resolves.toEqual(customers);

      expect(supabase.from).toHaveBeenCalledWith("customers");
      expect(query.eq).toHaveBeenCalledWith("status", true);
      expect(query.eq).toHaveBeenCalledWith("is_points_customer", true);
      expect(query.or).toHaveBeenCalledWith(
        "name.ilike.%an%,phone.ilike.%an%,email.ilike.%an%"
      );
      expect(query.order).toHaveBeenCalledWith("name", {
        ascending: true,
        nullsFirst: false,
      });
      expect(query.limit).toHaveBeenCalledWith(10);
    });

    it("no consulta con menos de dos caracteres", async () => {
      await expect(searchPointsCustomers("a")).resolves.toEqual([]);
      await expect(searchPointsCustomers("   ")).resolves.toEqual([]);
      await expect(searchPointsCustomers(null)).resolves.toEqual([]);

      expect(supabase.from).not.toHaveBeenCalled();
    });

    it("respeta el limite indicado", async () => {
      const query = thenableQuery({ data: [], error: null });
      supabase.from.mockReturnValue(query);

      await searchPointsCustomers("ana", 25);

      expect(query.limit).toHaveBeenCalledWith(25);
    });

    it("devuelve lista vacia cuando la busqueda no trae filas", async () => {
      supabase.from.mockReturnValue(thenableQuery({ data: null, error: null }));

      await expect(searchPointsCustomers("ana")).resolves.toEqual([]);
    });

    it("propaga el error de la busqueda", async () => {
      supabase.from.mockReturnValue(
        thenableQuery({ data: null, error: new Error("busqueda") })
      );

      await expect(searchPointsCustomers("ana")).rejects.toThrow("busqueda");
    });
  });

  describe("fetchCustomerPointMovements", () => {
    it("pide solo los puntos del cliente", async () => {
      const movements = [{ points: 100 }, { points: -30 }];
      const query = thenableQuery({ data: movements, error: null });
      supabase.from.mockReturnValue(query);

      await expect(fetchCustomerPointMovements("c1")).resolves.toEqual(
        movements
      );

      expect(supabase.from).toHaveBeenCalledWith("customer_points");
      expect(query.eq).toHaveBeenCalledWith("customer_id", "c1");
    });

    it("no consulta sin cliente seleccionado", async () => {
      await expect(fetchCustomerPointMovements(null)).resolves.toEqual([]);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it("devuelve lista vacia cuando el cliente no tiene movimientos", async () => {
      supabase.from.mockReturnValue(thenableQuery({ data: null, error: null }));

      await expect(fetchCustomerPointMovements("c1")).resolves.toEqual([]);
    });

    it("propaga el error de la consulta", async () => {
      supabase.from.mockReturnValue(
        thenableQuery({ data: null, error: new Error("movimientos") })
      );

      await expect(fetchCustomerPointMovements("c1")).rejects.toThrow(
        "movimientos"
      );
    });
  });

  describe("insertPointsMovement", () => {
    it("inserta el movimiento ya firmado", async () => {
      const query = thenableQuery({ data: null, error: null });
      supabase.from.mockReturnValue(query);

      const payload = {
        id: "m1",
        customer_id: "c1",
        points: -50,
        movement_type: "redeem",
        source: "manual",
      };

      await insertPointsMovement(payload);

      expect(supabase.from).toHaveBeenCalledWith("customer_points");
      expect(query.insert).toHaveBeenCalledWith([payload]);
    });

    it("propaga el error de la insercion", async () => {
      supabase.from.mockReturnValue(
        thenableQuery({ data: null, error: new Error("insercion") })
      );

      await expect(insertPointsMovement({ id: "m1" })).rejects.toThrow(
        "insercion"
      );
    });
  });
});
