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

const getMediaBlock = (query, selector) => {
  const start = css.indexOf(`@media (${query}) {`);
  if (start === -1) return "";
  const rest = css.slice(start);
  const match = rest.match(
    new RegExp(`\\n  ${selector.replace(".", "\\.")} \\{([^}]*)\\}`)
  );

  return match ? match[1] : "";
};

describe("SalesHistoryModal: botones de accion del ticket", () => {
  it("se acomodan en filas que se envuelven y reparten el ancho", () => {
    expect(getBlock(".leftActions")).toMatch(/flex-wrap:\s*wrap/);
  });

  it("el ancho base descuenta exactamente los huecos entre las columnas", () => {
    const basis = getBlock(".actionBtn").match(
      /flex:\s*1 1 calc\(\(100% - (\d+) \* var\(--actions-gap\)\) \/ (\d+)/
    );

    expect(basis).not.toBeNull();

    const [, gaps, columns] = basis.map(Number);

    // Con N columnas hay N - 1 huecos; el reparto es de tres botones por fila.
    expect(columns).toBe(3);
    expect(gaps).toBe(columns - 1);
  });

  it("el hueco entre botones sale de una sola variable", () => {
    const block = getBlock(".leftActions");

    expect(block).toMatch(/--actions-gap:\s*\d+px/);
    expect(block).toMatch(/gap:\s*var\(--actions-gap\)/);
  });

  it("mantiene todos los botones con esquinas redondeadas", () => {
    expect(css).not.toMatch(/\.actionBtn:first-child/);
    expect(css).not.toMatch(/\.actionBtn:last-child/);
  });

  it("en pantallas angostas los botones se apilan a ancho completo", () => {
    expect(getMediaBlock("max-width: 768px", ".leftActions")).toMatch(
      /flex-direction:\s*column/
    );
    expect(getMediaBlock("max-width: 768px", ".actionBtn")).toMatch(
      /flex:\s*1 1 auto/
    );
  });
});
