import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../../../../lib/supabaseClient", () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from "../../../../../lib/supabaseClient";
import {
  DEFAULT_POINTS_AMOUNT,
  POINTS_AMOUNT_SETTING_KEY,
  fetchOrCreatePointsAmountRule,
  fetchRewardsCatalog,
  savePointsAmountRule,
  updateRewardStatus,
} from "./rewardsSettingsService";

const thenableQuery = (resolve = { data: null, error: null }) => {
  const q = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    maybeSingle: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    order: vi.fn(),
  };

  Object.values(q).forEach((fn) => fn.mockReturnValue(q));
  q.then = (onFulfilled, onRejected) =>
    Promise.resolve(resolve).then(onFulfilled, onRejected);

  return q;
};

const lastInsert = (fromMock) => {
  const call = fromMock.mock.results.at(-1);
  return call.value.insert.mock.calls[0][0][0];
};

const lastUpdate = (fromMock) => {
  const call = fromMock.mock.results.at(-1);
  return {
    payload: call.value.update.mock.calls[0][0],
    // La misma cadena reutiliza el query mock, asi que el filtro del update es
    // la ultima llamada a eq (la primera es la de la lectura).
    filter: call.value.eq.mock.calls.at(-1),
  };
};

describe("rewardsSettingsService", () => {
  beforeEach(() => {
    supabase.from.mockReset();
    vi.stubGlobal("crypto", { randomUUID: () => "uuid-fijo" });
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T12:00:00.000Z"));
  });

  describe("constantes", () => {
    it("fija la llave y el valor por defecto de la regla", () => {
      expect(POINTS_AMOUNT_SETTING_KEY).toBe(
        "customer_points_amount_per_point"
      );
      expect(DEFAULT_POINTS_AMOUNT).toBe(50);
    });
  });

  describe("fetchRewardsCatalog", () => {
    it("devuelve la lista de recompensas con sus productos", async () => {
      const rewards = [{ id: "r1", name: "RECOMPENSA" }];
      const query = thenableQuery({ data: rewards, error: null });
      supabase.from.mockReturnValue(query);

      const result = await fetchRewardsCatalog();

      expect(supabase.from).toHaveBeenCalledWith("rewards");
      expect(result).toEqual(rewards);
    });

    it("propaga el error de la consulta", async () => {
      const failure = new Error("sin permisos");
      supabase.from.mockReturnValue(
        thenableQuery({ data: null, error: failure })
      );

      await expect(fetchRewardsCatalog()).rejects.toThrow("sin permisos");
    });

    it("devuelve lista vacia cuando la consulta no trae filas", async () => {
      supabase.from.mockReturnValue(thenableQuery({ data: null, error: null }));

      await expect(fetchRewardsCatalog()).resolves.toEqual([]);
    });
  });

  describe("fetchOrCreatePointsAmountRule", () => {
    it("devuelve el valor guardado en la fila global", async () => {
      supabase.from.mockReturnValue(
        thenableQuery({ data: { setting_value: "75" }, error: null })
      );

      await expect(fetchOrCreatePointsAmountRule()).resolves.toBe("75");
    });

    it("consulta la llave correcta y exige branch_id nulo", async () => {
      const query = thenableQuery({
        data: { setting_value: "75" },
        error: null,
      });
      supabase.from.mockReturnValue(query);

      await fetchOrCreatePointsAmountRule();

      expect(supabase.from).toHaveBeenCalledWith("system_settings");
      expect(query.eq).toHaveBeenCalledWith(
        "setting_key",
        POINTS_AMOUNT_SETTING_KEY
      );
      expect(query.is).toHaveBeenCalledWith("branch_id", null);
    });

    it("inserta el valor por defecto cuando la fila no existe", async () => {
      const query = thenableQuery({ data: null, error: null });
      supabase.from.mockReturnValue(query);

      await expect(fetchOrCreatePointsAmountRule()).resolves.toBe(
        String(DEFAULT_POINTS_AMOUNT)
      );

      const inserted = lastInsert(supabase.from);
      expect(inserted).toEqual({
        id: "uuid-fijo",
        setting_key: POINTS_AMOUNT_SETTING_KEY,
        setting_value: "50",
        value_type: "number",
        description: expect.any(String),
        branch_id: null,
        is_active: true,
        created_at: "2026-03-01T12:00:00.000Z",
        updated_at: "2026-03-01T12:00:00.000Z",
      });
    });

    it("cae al valor por defecto si la fila guardada esta vacia", async () => {
      supabase.from.mockReturnValue(
        thenableQuery({ data: { setting_value: null }, error: null })
      );

      await expect(fetchOrCreatePointsAmountRule()).resolves.toBe("50");
    });

    it("propaga el error de lectura", async () => {
      supabase.from.mockReturnValue(
        thenableQuery({ data: null, error: new Error("lectura") })
      );

      await expect(fetchOrCreatePointsAmountRule()).rejects.toThrow("lectura");
    });

    it("propaga el error de insercion del valor por defecto", async () => {
      const insertError = new Error("insercion");
      const insertQuery = thenableQuery({ data: null, error: null });
      insertQuery.insert = vi.fn(() =>
        Promise.resolve({ data: null, error: insertError })
      );

      supabase.from
        .mockReturnValueOnce(thenableQuery({ data: null, error: null }))
        .mockReturnValueOnce(insertQuery);

      await expect(fetchOrCreatePointsAmountRule()).rejects.toThrow(
        "insercion"
      );
    });
  });

  describe("savePointsAmountRule", () => {
    it("actualiza la fila existente en vez de insertar otra", async () => {
      const query = thenableQuery({
        data: { id: "setting-1" },
        error: null,
      });
      supabase.from.mockReturnValue(query);

      await savePointsAmountRule("60");

      const { payload, filter } = lastUpdate(supabase.from);
      expect(filter).toEqual(["id", "setting-1"]);
      expect(payload).toEqual({
        setting_value: "60",
        value_type: "number",
        description: expect.any(String),
        is_active: true,
        updated_at: "2026-03-01T12:00:00.000Z",
      });
    });

    it("inserta cuando la regla todavia no existe", async () => {
      supabase.from.mockReturnValue(thenableQuery({ data: null, error: null }));

      await savePointsAmountRule("60");

      expect(lastInsert(supabase.from)).toEqual({
        id: "uuid-fijo",
        setting_key: POINTS_AMOUNT_SETTING_KEY,
        setting_value: "60",
        value_type: "number",
        description: expect.any(String),
        branch_id: null,
        is_active: true,
        created_at: "2026-03-01T12:00:00.000Z",
        updated_at: "2026-03-01T12:00:00.000Z",
      });
    });

    it("normaliza el monto a texto", async () => {
      supabase.from.mockReturnValue(thenableQuery({ data: null, error: null }));

      await savePointsAmountRule(60);

      expect(lastInsert(supabase.from).setting_value).toBe("60");
    });

    it("propaga el error de actualizacion", async () => {
      supabase.from
        .mockReturnValueOnce(
          thenableQuery({ data: { id: "setting-1" }, error: null })
        )
        .mockReturnValueOnce(
          thenableQuery({ data: null, error: new Error("actualizacion") })
        );

      await expect(savePointsAmountRule("60")).rejects.toThrow("actualizacion");
    });

    it("propaga el error de lectura previa", async () => {
      supabase.from.mockReturnValue(
        thenableQuery({ data: null, error: new Error("consulta") })
      );

      await expect(savePointsAmountRule("60")).rejects.toThrow("consulta");
    });
  });

  describe("updateRewardStatus", () => {
    it("escribe is_active y actualiza la marca de tiempo", async () => {
      const query = thenableQuery({ data: null, error: null });
      supabase.from.mockReturnValue(query);

      await updateRewardStatus({ rewardId: "r1", nextStatus: false });

      expect(supabase.from).toHaveBeenCalledWith("rewards");
      expect(query.update).toHaveBeenCalledWith({
        is_active: false,
        updated_at: "2026-03-01T12:00:00.000Z",
      });
      expect(query.eq).toHaveBeenCalledWith("id", "r1");
    });

    it("reactiva la recompensa", async () => {
      const query = thenableQuery({ data: null, error: null });
      supabase.from.mockReturnValue(query);

      await updateRewardStatus({ rewardId: "r1", nextStatus: true });

      expect(query.update).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: true })
      );
    });

    it("propaga el error de la actualizacion", async () => {
      supabase.from.mockReturnValue(
        thenableQuery({ data: null, error: new Error("actualizacion") })
      );

      await expect(
        updateRewardStatus({ rewardId: "r1", nextStatus: true })
      ).rejects.toThrow("actualizacion");
    });
  });
});
