import { describe, it, expect, beforeEach, vi } from "vitest";

const bindings = [];
let removedChannels = [];
let subscribeCalls = 0;

vi.mock("../../../lib/supabaseClient", () => {
  const channel = (name) => {
    const api = {
      name,
      on: (type, filter, callback) => {
        bindings.push({ name, type, filter: { ...filter }, callback });
        return api;
      },
      subscribe: () => {
        subscribeCalls += 1;
        bindings.push({ name, type: "subscribe" });
        return api;
      },
    };

    return api;
  };

  return {
    supabase: {
      channel,
      removeChannel: (channel) => {
        removedChannels.push(channel.name);
      },
    },
  };
});

import {
  subscribeToTableChanges,
  subscribeToBranchInvoiceChanges,
} from "./invoicesRealtimeService";

const payloads = () => bindings.filter((b) => b.type === "postgres_changes");

describe("invoicesRealtimeService", () => {
  beforeEach(() => {
    bindings.length = 0;
    removedChannels = [];
    subscribeCalls = 0;
  });

  it("envia la tabla observada dentro del binding de postgres_changes", () => {
    subscribeToTableChanges({
      channelName: "invoice-customers-realtime",
      tables: ["customers"],
      onChange: () => {},
    });

    expect(payloads()).toHaveLength(1);
    expect(payloads()[0].filter).toEqual({
      event: "*",
      schema: "public",
      table: "customers",
    });
  });

  it("suscribe el canal al servidor", () => {
    // Sin `subscribe()` el servidor nunca recibe el `join` y la pantalla se
    // queda sin eventos en vivo. Este caso fija que la suscripcion ocurre.
    subscribeToTableChanges({
      channelName: "invoice-customers-realtime",
      tables: ["customers"],
      onChange: () => {},
    });

    expect(subscribeCalls).toBe(1);
  });

  it("acepta una tabla suelta ademas de un arreglo", () => {
    subscribeToTableChanges({
      channelName: "channel",
      tables: "customers",
      onChange: () => {},
    });

    expect(payloads()[0].filter.table).toBe("customers");
  });

  it("omite el filtro de fila cuando no se indica", () => {
    subscribeToTableChanges({
      channelName: "channel",
      tables: ["customers"],
      onChange: () => {},
    });

    expect(payloads()[0].filter).not.toHaveProperty("filter");
  });

  it("incluye el filtro de fila en cada tabla cuando se indica", () => {
    subscribeToTableChanges({
      channelName: "channel",
      tables: ["sales", "invoices"],
      rowFilter: "branch_id=eq.7",
      onChange: () => {},
    });

    expect(payloads().map((b) => b.filter.filter)).toEqual([
      "branch_id=eq.7",
      "branch_id=eq.7",
    ]);
  });

  it("registra un binding por tabla sobre un unico canal y una sola suscripcion", () => {
    subscribeToTableChanges({
      channelName: "channel",
      tables: ["sales", "invoices"],
      onChange: () => {},
    });

    expect(new Set(bindings.map((b) => b.name))).toEqual(new Set(["channel"]));
    expect(payloads()).toHaveLength(2);
    expect(subscribeCalls).toBe(1);
  });

  it("entrega el payload al callback para que la pantalla decida si recarga", () => {
    const onChange = vi.fn();
    const payload = { new: { id: 1 }, old: { is_billing_customer: false } };

    subscribeToTableChanges({
      channelName: "channel",
      tables: ["customers"],
      onChange,
    });

    payloads()[0].callback(payload);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(payload);
  });

  it("limpia el canal al desuscribirse", () => {
    const cleanup = subscribeToTableChanges({
      channelName: "invoice-customers-realtime",
      tables: ["customers"],
      onChange: () => {},
    });

    cleanup();

    expect(removedChannels).toEqual(["invoice-customers-realtime"]);
  });

  it("no abre canal cuando no hay tablas que observar", () => {
    const cleanup = subscribeToTableChanges({
      channelName: "channel",
      tables: [],
      onChange: () => {},
    });

    expect(bindings).toHaveLength(0);
    expect(subscribeCalls).toBe(0);
    expect(() => cleanup()).not.toThrow();
  });

  describe("subscribeToBranchInvoiceChanges", () => {
    it("observa sales e invoices de la sucursal con un unico canal", () => {
      subscribeToBranchInvoiceChanges({
        branchId: 3,
        channelName: "invoices-pending-3",
        onChange: () => {},
      });

      expect(payloads().map((b) => b.filter)).toEqual([
        {
          event: "*",
          schema: "public",
          table: "sales",
          filter: "branch_id=eq.3",
        },
        {
          event: "*",
          schema: "public",
          table: "invoices",
          filter: "branch_id=eq.3",
        },
      ]);
      expect(subscribeCalls).toBe(1);
    });

    it("no abre canal sin sucursal", () => {
      const cleanup = subscribeToBranchInvoiceChanges({
        branchId: null,
        channelName: "invoices-pending-null",
        onChange: () => {},
      });

      expect(bindings).toHaveLength(0);
      expect(() => cleanup()).not.toThrow();
    });
  });
});
