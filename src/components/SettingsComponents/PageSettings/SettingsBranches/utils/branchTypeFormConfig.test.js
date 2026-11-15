import { describe, it, expect } from "vitest";

import {
  BRANCH_TYPE_OPTIONS,
  isBranchFieldVisible,
  isValidBranchType,
} from "./branchTypeFormConfig";

describe("branchTypeFormConfig", () => {
  it("ofrece los tipos operativa y administrativa", () => {
    expect(BRANCH_TYPE_OPTIONS.map((option) => option.value)).toEqual([
      "operational",
      "admin",
    ]);
  });

  it("valida solo los tipos conocidos", () => {
    expect(isValidBranchType("operational")).toBe(true);
    expect(isValidBranchType("admin")).toBe(true);
    expect(isValidBranchType("otro")).toBe(false);
    expect(isValidBranchType(undefined)).toBe(false);
  });

  it.each(["phone", "email", "address"])(
    "oculta %s solo en una sucursal admin",
    (field) => {
      expect(isBranchFieldVisible("admin", field)).toBe(false);
      expect(isBranchFieldVisible("operational", field)).toBe(true);
    }
  );

  it("mantiene visibles los campos generales en ambos tipos", () => {
    ["code", "name", "city", "state", "timezone"].forEach((field) => {
      expect(isBranchFieldVisible("admin", field)).toBe(true);
      expect(isBranchFieldVisible("operational", field)).toBe(true);
    });
  });
});
