import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const MODULE_DIR = __dirname;
const css = readFileSync(join(MODULE_DIR, "PageOrders.module.css"), "utf8");

const definedClasses = new Set(
  Array.from(css.matchAll(/\.([A-Za-z][\w-]*)/g)).map((match) => match[1])
);

const getBlock = (className) => {
  const match = css.match(new RegExp(`(?:^|\\n)\\.${className} \\{([^}]*)\\}`));

  return match ? match[1] : "";
};

const sourceFiles = readdirSync(join(MODULE_DIR, "components")).filter(
  (file) => file.endsWith(".jsx") && !file.endsWith(".test.jsx")
);

describe("estilos del modulo de pedidos", () => {
  it("todas las clases usadas en los componentes existen en el CSS", () => {
    const missing = [];

    sourceFiles.forEach((file) => {
      const source = readFileSync(join(MODULE_DIR, "components", file), "utf8");

      Array.from(source.matchAll(/styles\.([A-Za-z]\w*)/g)).forEach((match) => {
        if (!definedClasses.has(match[1])) {
          missing.push(`${file}: ${match[1]}`);
        }
      });
    });

    expect(missing).toEqual([]);
  });

  it("todos los badges del modulo estan en negrita", () => {
    const badgeClasses = [
      "tabBadge",
      "statusBadge",
      "statusPending",
      "differenceBadge",
      "branchBadge",
      "deptBadge",
      "departmentChip",
      "statusPill",
      "routeBadge",
    ];

    const notBold = badgeClasses.filter(
      (className) => !/font-weight:\s*700/.test(getBlock(className))
    );

    expect(notBold).toEqual([]);
  });

  it("el contador de Recibidos usa el naranja de marca", () => {
    expect(getBlock("tabBadge")).toContain("var(--croketsOrange)");
  });
});
