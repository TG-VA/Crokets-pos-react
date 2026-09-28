import { describe, it, expect, beforeEach, vi } from "vitest";

const fromCalls = [];
const chains = [];

const buildChain = (result) => {
  const builder = {
    select: vi.fn(() => builder),
    update: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    single: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
    then: (resolve) => resolve(result),
  };

  chains.push(builder);

  return builder;
};

let nextResult = { data: null, error: null };

vi.mock("../../../../../lib/supabaseClient", () => ({
  supabase: {
    from: (table) => {
      fromCalls.push(table);

      return buildChain(nextResult);
    },
  },
}));

import {
  fetchActiveCfdiSettings,
  saveCfdiSettings,
} from "./invoiceSettingsService";

const lastChain = () => chains[chains.length - 1];

describe("invoiceSettingsService", () => {
  beforeEach(() => {
    fromCalls.length = 0;
    chains.length = 0;
    nextResult = { data: null, error: null };
  });

  describe("fetchActiveCfdiSettings", () => {
    it("toma la configuracion activa mas reciente", async () => {
      nextResult = {
        data: { id: 1, issuer_rfc: "GODE561231GR8" },
        error: null,
      };

      const settings = await fetchActiveCfdiSettings();

      expect(fromCalls).toEqual(["cfdi_settings"]);
      expect(lastChain().eq).toHaveBeenCalledWith("status", true);
      expect(lastChain().order).toHaveBeenCalledWith("created_at", {
        ascending: false,
      });
      expect(lastChain().limit).toHaveBeenCalledWith(1);
      expect(settings).toMatchObject({ id: 1 });
    });

    it("devuelve null cuando el emisor aun no esta configurado", async () => {
      nextResult = { data: null, error: null };

      expect(await fetchActiveCfdiSettings()).toBeNull();
    });

    it("propaga el error de la consulta", async () => {
      nextResult = { data: null, error: new Error("settings boom") };

      await expect(fetchActiveCfdiSettings()).rejects.toThrow("settings boom");
    });
  });

  describe("saveCfdiSettings", () => {
    it("actualiza la fila existente y devuelve su id", async () => {
      const payload = { issuer_rfc: "GODE561231GR8" };

      const id = await saveCfdiSettings({ settingId: 7, payload });

      expect(fromCalls).toEqual(["cfdi_settings"]);
      expect(lastChain().update).toHaveBeenCalledWith(payload);
      expect(lastChain().eq).toHaveBeenCalledWith("id", 7);
      expect(lastChain().insert).not.toHaveBeenCalled();
      expect(id).toBe(7);
    });

    it("inserta una configuracion nueva y devuelve el id generado", async () => {
      nextResult = { data: { id: 9 }, error: null };

      const payload = { issuer_rfc: "GODE561231GR8" };
      const id = await saveCfdiSettings({ settingId: null, payload });

      expect(lastChain().insert).toHaveBeenCalledTimes(1);

      const inserted = lastChain().insert.mock.calls[0][0];

      expect(inserted).toMatchObject(payload);
      expect(Number.isNaN(Date.parse(inserted.created_at))).toBe(false);
      expect(id).toBe(9);
    });

    it("propaga el error del update para no perder lo capturado", async () => {
      nextResult = { data: null, error: new Error("update boom") };

      await expect(
        saveCfdiSettings({ settingId: 7, payload: {} })
      ).rejects.toThrow("update boom");
    });

    it("propaga el error del insert", async () => {
      nextResult = { data: null, error: new Error("insert boom") };

      await expect(
        saveCfdiSettings({ settingId: null, payload: {} })
      ).rejects.toThrow("insert boom");
    });
  });
});
