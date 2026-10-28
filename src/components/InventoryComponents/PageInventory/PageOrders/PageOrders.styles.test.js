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

const relativeLuminance = (hex) => {
  const channels = hex
    .replace("#", "")
    .match(/.{2}/g)
    .map((channel) => parseInt(channel, 16) / 255)
    .map((value) =>
      value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    );

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};

const contrastRatio = (foreground, background) => {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);

  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
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

  it("el nombre del pedido usa un chip suave con contraste AA", () => {
    const block = getBlock("orderNameBadge");
    const background = block.match(/background:\s*(#[0-9a-fA-F]{6})/)?.[1];
    const color = block.match(/color:\s*(#[0-9a-fA-F]{6})/)?.[1];

    expect(background).toBe("#eef2f5");
    expect(color).toBe("#26323b");
    expect(block).toContain("border: 1px solid #cfd8de");
    expect(contrastRatio(color, background)).toBeGreaterThanOrEqual(4.5);
  });
});
