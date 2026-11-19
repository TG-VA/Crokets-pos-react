import { describe, expect, it } from "vitest";

import {
  normalizeAdjustmentQuantityInput,
  parseAdjustmentQuantity,
} from "./adjustmentQuantityCalculationService";

describe("normalizeAdjustmentQuantityInput", () => {
  it.each([
    ["", ""],
    [null, ""],
    ["-", "-"],
    ["abc", ""],
    ["12a3", "123"],
    ["-5", "-5"],
    ["5-", "5"],
    ["--7", "-7"],
    ["1.5", "15"],
  ])("%s -> %s", (input, expected) => {
    expect(normalizeAdjustmentQuantityInput(input)).toBe(expected);
  });
});

describe("parseAdjustmentQuantity", () => {
  it.each([
    ["", 0],
    [undefined, 0],
    ["-", 0],
    [" 8 ", 8],
    ["-3", -3],
    ["x", 0],
  ])("%s -> %s", (input, expected) => {
    expect(parseAdjustmentQuantity(input)).toBe(expected);
  });
});
