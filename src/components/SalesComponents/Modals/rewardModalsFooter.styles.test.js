import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const readCss = (file) => readFileSync(join(__dirname, file), "utf8");

const getBlock = (css, selector) => {
  const match = css.match(
    new RegExp(`(?:^|\\n)${selector.replace(".", "\\.")} \\{([^}]*)\\}`)
  );

  return match ? match[1] : "";
};

describe("Modales de recompensas y descuento: pie", () => {
  it.each([
    [
      "Aplicar descuento",
      "ProductDiscountRewardModal/ProductDiscountRewardModal.module.css",
    ],
    [
      "Aplicar recompensas",
      "RewardProductSelectionModal/RewardProductSelectionModal.module.css",
    ],
  ])("%s alinea el boton de confirmar a la derecha", (_name, file) => {
    expect(getBlock(readCss(file), ".actions")).toMatch(
      /justify-content:\s*flex-end/
    );
  });
});
