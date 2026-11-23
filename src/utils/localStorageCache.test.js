import { afterEach, describe, expect, it, vi } from "vitest";
import { getCachedValue, setCachedValue } from "./localStorageCache";

describe("localStorageCache", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("guarda y lee un valor", () => {
    const store = new Map();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key) => store.get(key) ?? null,
        setItem: (key, value) => store.set(key, value),
      },
    });

    setCachedValue("k", "v");

    expect(getCachedValue("k")).toBe("v");
  });

  it("devuelve null y no lanza si localStorage falla", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("denied");
        },
        setItem: () => {
          throw new Error("denied");
        },
      },
    });

    expect(() => setCachedValue("k", "v")).not.toThrow();
    expect(getCachedValue("k")).toBeNull();
  });

  it("devuelve null sin window", () => {
    vi.stubGlobal("window", undefined);

    expect(getCachedValue("k")).toBeNull();
    expect(() => setCachedValue("k", "v")).not.toThrow();
  });
});
