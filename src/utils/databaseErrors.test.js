import { describe, expect, it } from "vitest";
import {
  getDatabaseErrorMessage,
  isMissingColumnError,
  isMissingRelationError,
} from "./databaseErrors";

describe("databaseErrors", () => {
  it("normaliza message, details o hint", () => {
    expect(getDatabaseErrorMessage({ message: " Bad " })).toBe("bad");
    expect(getDatabaseErrorMessage({ details: "X" })).toBe("x");
    expect(getDatabaseErrorMessage({ hint: "Y" })).toBe("y");
    expect(getDatabaseErrorMessage(null)).toBe("");
  });

  it("detecta columna faltante", () => {
    expect(isMissingColumnError({ message: "column foo does not exist" })).toBe(
      true
    );
    expect(isMissingColumnError({ message: "timeout" })).toBe(false);
  });

  it("detecta relacion faltante", () => {
    expect(isMissingRelationError({ message: "relation x" })).toBe(true);
    expect(isMissingRelationError({ message: "table does not exist" })).toBe(
      true
    );
    expect(isMissingRelationError({ message: "timeout" })).toBe(false);
  });
});
