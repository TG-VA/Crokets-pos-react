import { describe, it, expect } from "vitest";

import { mapWithConcurrency } from "./asyncUtils";

const tick = () => new Promise((resolve) => setTimeout(resolve, 1));

describe("mapWithConcurrency", () => {
  it("devuelve [] sin items", async () => {
    await expect(mapWithConcurrency([], 3, async () => 1)).resolves.toEqual([]);
  });

  it("preserva el orden de los resultados", async () => {
    const items = [1, 2, 3, 4, 5];

    const results = await mapWithConcurrency(items, 2, async (n) => {
      await tick();
      return n * 2;
    });

    expect(results).toEqual([2, 4, 6, 8, 10]);
  });

  it("limita el numero de promesas en vuelo", async () => {
    const items = [1, 2, 3, 4, 5, 6, 7];
    let active = 0;
    let maxActive = 0;

    await mapWithConcurrency(items, 3, async (n) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await tick();
      active -= 1;
      return n;
    });

    expect(maxActive).toBe(3);
  });

  it("no excede la concurrencia cuando hay menos items que el limite", async () => {
    let active = 0;
    let maxActive = 0;

    await mapWithConcurrency([1, 2], 5, async (n) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await tick();
      active -= 1;
      return n;
    });

    expect(maxActive).toBe(2);
  });

  it("rechaza si el mapper lanza", async () => {
    await expect(
      mapWithConcurrency([1, 2], 2, async () => {
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");
  });
});
