import { describe, expect, it } from "vitest";

import { normalizeFilenameSegment } from "./inventoryReportUtils";

describe("normalizeFilenameSegment", () => {
  it("usa un valor neutro cuando no hay nombre de sucursal", () => {
    expect(normalizeFilenameSegment("")).toBe("SUCURSAL");
    expect(normalizeFilenameSegment(null)).toBe("SUCURSAL");
  });

  it("normaliza acentos, codigo entre parentesis y simbolos", () => {
    expect(normalizeFilenameSegment("Jardín Norte (JN)")).toBe("JARDIN NORTE");
  });
});
