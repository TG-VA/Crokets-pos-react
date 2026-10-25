import { describe, it, expect } from "vitest";

import { getStatusToneClass } from "./ordersStatusClasses";

const styles = {
  statusPending: "pending-class",
  statusSuccess: "success-class",
  statusWarning: "warning-class",
  statusDanger: "danger-class",
};

describe("getStatusToneClass", () => {
  it("mapea cada tono a su clase", () => {
    expect(getStatusToneClass(styles, "success")).toBe("success-class");
    expect(getStatusToneClass(styles, "warning")).toBe("warning-class");
    expect(getStatusToneClass(styles, "danger")).toBe("danger-class");
  });

  it("usa la clase pendiente para tonos desconocidos o nulos", () => {
    expect(getStatusToneClass(styles, "neutral")).toBe("pending-class");
    expect(getStatusToneClass(styles, "desconocido")).toBe("pending-class");
    expect(getStatusToneClass(styles, null)).toBe("pending-class");
  });
});
