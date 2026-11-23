import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const packageJson = JSON.parse(
  readFileSync(resolve(__dirname, "..", "package.json"), "utf8")
);

describe("build.publish del auto-updater", () => {
  const githubEntries = (packageJson.build?.publish ?? []).filter(
    (entry) => entry.provider === "github"
  );

  it("declara al menos un feed de GitHub", () => {
    expect(githubEntries.length).toBeGreaterThan(0);
  });

  it("usa el provider publico sin private ni token", () => {
    githubEntries.forEach((entry) => {
      expect(entry.private).not.toBe(true);
      expect(entry).not.toHaveProperty("token");
    });
  });
});
