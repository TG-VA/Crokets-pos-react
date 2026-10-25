import { describe, it, expect } from "vitest";

import { isNetworkError } from "./isNetworkError";

describe("isNetworkError", () => {
  it("reconoce TypeError de fetch aunque el mensaje varie", () => {
    expect(isNetworkError(new TypeError("Failed to fetch"))).toBe(true);
    expect(isNetworkError(new TypeError("Fetch failed"))).toBe(true);
    expect(
      isNetworkError(Object.assign(new Error("request"), { name: "TypeError" }))
    ).toBe(false);
    expect(
      isNetworkError(
        Object.assign(new Error("network request failed"), {
          name: "TypeError",
        })
      )
    ).toBe(true);
  });

  it("reconoce errores de red sin importar el constructor", () => {
    expect(isNetworkError(new Error("NetworkError when attempting"))).toBe(
      true
    );
    expect(isNetworkError(new Error("ERR_INTERNET_DISCONNECTED"))).toBe(true);
  });

  it("descarta errores de negocio, nulos y mensajes vacios", () => {
    expect(isNetworkError(new Error("PGRST205 schema not found"))).toBe(false);
    expect(isNetworkError({ code: "23505" })).toBe(false);
    expect(isNetworkError(null)).toBe(false);
    expect(isNetworkError(undefined)).toBe(false);
    expect(isNetworkError(new Error(""))).toBe(false);
  });
});
