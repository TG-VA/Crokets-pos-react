import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const css = readFileSync(
  join(__dirname, "SalesHistoryModal.module.css"),
  "utf8"
);

const getBlock = (selector) => {
  const match = css.match(
    new RegExp(`(?:^|\\n)${selector.replace(".", "\\.")} \\{([^}]*)\\}`)
  );

  return match ? match[1] : "";
};

describe("SalesHistoryModal: botones de accion del ticket", () => {
  it("se acomodan en filas que se envuelven y reparten el ancho", () => {
    expect(getBlock(".leftActions")).toMatch(/flex-wrap:\s*wrap/);
  });

  it("cada boton ocupa un tercio de la fila y crece para llenar la ultima", () => {
    const block = getBlock(".actionBtn");

    expect(block).toMatch(/flex:\s*1 1 calc\(\(100% - 24px\) \/ 3 - 1px\)/);
  });

  it("mantiene todos los botones con esquinas redondeadas y separados", () => {
    expect(getBlock(".leftActions")).toMatch(/gap:\s*12px/);
    expect(css).not.toMatch(/\.actionBtn:first-child/);
    expect(css).not.toMatch(/\.actionBtn:last-child/);
  });
});
