import { describe, it, expect, beforeEach, vi } from "vitest";

const bindings = [];
let removedChannels = [];

vi.mock("../../../../lib/supabaseClient", () => {
  const channel = (name) => {
    const api = {
      name,
      on: (type, filter, callback) => {
        bindings.push({ name, type, filter: { ...filter }, callback });
        return api;
      },
      subscribe: () => {
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

import { subscribeToTableChanges } from "./customersRealtimeService";

const payloads = () => bindings.filter((b) => b.type === "postgres_changes");

describe("customersRealtimeService", () => {
  beforeEach(() => {
    bindings.length = 0;
    removedChannels = [];
  });

  it("envia la tabla observada al binding de postgres_changes", () => {
    subscribeToTableChanges({
      channelName: "points-history-branches-realtime",
      tables: ["branches"],
      onChange: () => {},
    });

    expect(payloads()).toHaveLength(1);
    expect(payloads()[0].filter).toEqual({
      event: "*",
      schema: "public",
      table: "branches",
    });
    expect(JSON.parse(JSON.stringify(payloads()[0].filter))).toHaveProperty(
      "table"
    );
  });

  it("acepta una tabla suelta sin envolverla en arreglo", () => {
    subscribeToTableChanges({
      channelName: "customers-list-realtime",
      tables: "customers",
      onChange: () => {},
    });

    expect(payloads()[0].filter.table).toBe("customers");
  });

  it("registra un binding por tabla sobre el mismo canal", () => {
    subscribeToTableChanges({
      channelName: "customers-list-realtime",
      tables: ["customers", "customer_points"],
      onChange: () => {},
    });

    expect(payloads()).toHaveLength(2);
    expect(payloads().map((b) => b.filter.table)).toEqual([
      "customers",
      "customer_points",
    ]);
    expect(payloads().every((b) => b.name === "customers-list-realtime")).toBe(
      true
    );
  });

  it("incluye el filtro de fila cuando se recibe rowFilter", () => {
    subscribeToTableChanges({
      channelName: "customer-points-query-abc",
      tables: ["customer_points"],
      rowFilter: "customer_id=eq.abc",
      onChange: () => {},
    });

    expect(payloads()[0].filter).toEqual({
      event: "*",
      schema: "public",
      table: "customer_points",
      filter: "customer_id=eq.abc",
    });
  });

  it("omite el filtro cuando no se recibe rowFilter", () => {
    subscribeToTableChanges({
      channelName: "rewards-settings-rewards-realtime",
      tables: ["rewards"],
      onChange: () => {},
    });

    expect(payloads()[0].filter).not.toHaveProperty("filter");
  });

  it("invoca onChange en cada evento recibido", () => {
    const onChange = vi.fn();

    subscribeToTableChanges({
      channelName: "rewards-query-rewards-realtime",
      tables: ["rewards"],
      onChange,
    });

    payloads()[0].callback();

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("suscribe el canal una sola vez con varias tablas", () => {
    subscribeToTableChanges({
      channelName: "customers-list-realtime",
      tables: ["customers", "customer_points"],
      onChange: () => {},
    });

    expect(bindings.filter((b) => b.type === "subscribe")).toHaveLength(1);
  });

  it("devuelve una limpieza que quita el canal", () => {
    const unsubscribe = subscribeToTableChanges({
      channelName: "rewards-settings-rewards-realtime",
      tables: ["rewards"],
      onChange: () => {},
    });

    unsubscribe();

    expect(removedChannels).toEqual(["rewards-settings-rewards-realtime"]);
  });

  it("no abre canal cuando no hay tablas que observar", () => {
    const unsubscribe = subscribeToTableChanges({
      channelName: "sin-tablas",
      tables: [],
      onChange: () => {},
    });

    expect(bindings).toHaveLength(0);

    expect(() => unsubscribe()).not.toThrow();
  });
});
