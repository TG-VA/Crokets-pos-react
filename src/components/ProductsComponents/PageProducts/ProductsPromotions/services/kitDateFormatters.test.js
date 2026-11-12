import { describe, expect, it } from "vitest";
import { formatDateOnly, parseDateOnly } from "./kitDateFormatters";

describe("kitDateFormatters", () => {
  it("convierte YYYY-MM-DD en una fecha local sin desfase de zona horaria", () => {
    const date = parseDateOnly("2026-11-05");

    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(10);
    expect(date.getDate()).toBe(5);
  });

  it("devuelve null para valores vacios o invalidos", () => {
    expect(parseDateOnly("")).toBeNull();
    expect(parseDateOnly(null)).toBeNull();
    expect(parseDateOnly("05/11/2026")).toBeNull();
    expect(parseDateOnly("2026-02-31")).toBeNull();
  });

  it("formatea una fecha local como YYYY-MM-DD", () => {
    expect(formatDateOnly(new Date(2026, 0, 9))).toBe("2026-01-09");
  });

  it("devuelve cadena vacia cuando no hay fecha valida", () => {
    expect(formatDateOnly(null)).toBe("");
    expect(formatDateOnly(new Date("invalid"))).toBe("");
  });

  it("es reversible", () => {
    expect(formatDateOnly(parseDateOnly("2027-12-31"))).toBe("2027-12-31");
  });
});
