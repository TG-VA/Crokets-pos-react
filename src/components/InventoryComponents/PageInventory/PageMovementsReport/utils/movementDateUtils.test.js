import { describe, expect, it } from "vitest";

import { getServerDateWindow } from "./movementDateUtils";

describe("getServerDateWindow", () => {
  it("ensancha el rango local un dia por lado y cierra el final exclusivo", () => {
    const window = getServerDateWindow("2026-02-10", "2026-02-12");

    expect(window).toEqual({
      startISO: new Date(2026, 1, 9).toISOString(),
      endISO: new Date(2026, 1, 14).toISOString(),
    });
  });

  it("normaliza un rango invertido", () => {
    expect(getServerDateWindow("2026-02-12", "2026-02-10")).toEqual(
      getServerDateWindow("2026-02-10", "2026-02-12")
    );
  });
});
