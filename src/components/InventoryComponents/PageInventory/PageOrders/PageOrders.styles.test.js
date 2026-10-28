import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const MODULE_DIR = __dirname;

const readModuleCss = (file) => readFileSync(join(MODULE_DIR, file), "utf8");

const cssFiles = readdirSync(MODULE_DIR).filter((file) =>
  file.endsWith(".module.css")
);

const classesByFile = Object.fromEntries(
  cssFiles.map((file) => [
    file,
    new Set(
      Array.from(readModuleCss(file).matchAll(/\.([A-Za-z][\w-]*)/g)).map(
        (match) => match[1]
      )
    ),
  ])
);

const allCss = cssFiles.map(readModuleCss).join("\n");

const getBlock = (className) => {
  const match = allCss.match(
    new RegExp(`(?:^|\\n)\\.${className} \\{([^}]*)\\}`)
  );

  return match ? match[1] : "";
};

const sourceFiles = readdirSync(join(MODULE_DIR, "components")).filter(
  (file) => file.endsWith(".jsx") && !file.endsWith(".test.jsx")
);

describe("estilos del modulo de pedidos", () => {
  it("todas las clases usadas en los componentes existen en su CSS", () => {
    const missing = [];

    sourceFiles.forEach((file) => {
      const source = readFileSync(join(MODULE_DIR, "components", file), "utf8");
      const aliases = Object.fromEntries(
        Array.from(
          source.matchAll(/import (\w+) from "\.\.\/([\w]+\.module\.css)"/g)
        ).map((match) => [match[1], match[2]])
      );

      Object.entries(aliases).forEach(([alias, cssFile]) => {
        Array.from(
          source.matchAll(new RegExp(`\\b${alias}\\.([A-Za-z]\\w*)`, "g"))
        ).forEach((match) => {
          if (!classesByFile[cssFile]?.has(match[1])) {
            missing.push(`${file}: ${alias}.${match[1]}`);
          }
        });
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
      "orderNameBadge",
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
