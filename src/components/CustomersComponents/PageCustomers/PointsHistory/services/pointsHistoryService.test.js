import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../../../../lib/supabaseClient", () => ({
  supabase: { from: vi.fn() },
}));

vi.mock(
  "../../../../../services/supabase/paginatedQuery",
  async (importOriginal) => {
    const { withSmallPages } =
      await import("../../../../../services/supabase/fakePostgrest.testUtils");
    return withSmallPages(await importOriginal());
  }
);

import { supabase } from "../../../../../lib/supabaseClient";
import {
  buildId,
  createFakePostgrest,
} from "../../../../../services/supabase/fakePostgrest.testUtils";
import { fetchPointsMovements } from "./pointsHistoryService";

/*
  El doble corta cada respuesta en 2 filas: sin paginar, el historial de 5
  movimientos llegaria con solo 2.
*/

const buildMovement = (index, createdAt) => ({
  id: buildId("m", index),
  customer_id: "c-1",
  points: index,
  created_at: createdAt,
});

describe("pointsHistoryService", () => {
  beforeEach(() => {
    const fake = createFakePostgrest({
      customer_points: [
        buildMovement(0, "2026-01-01T00:00:00Z"),
        buildMovement(1, "2026-01-05T00:00:00Z"),
        buildMovement(2, "2026-01-03T00:00:00Z"),
        buildMovement(3, "2026-01-05T00:00:00Z"),
        buildMovement(4, "2026-01-02T00:00:00Z"),
      ],
    });
    supabase.from.mockImplementation(fake.from);
  });

  it("lee todas las paginas y ordena por created_at descendente con desempate por id", async () => {
    const result = await fetchPointsMovements();

    expect(result.map((row) => row.id)).toEqual([
      buildId("m", 3),
      buildId("m", 1),
      buildId("m", 2),
      buildId("m", 4),
      buildId("m", 0),
    ]);
  });
});
