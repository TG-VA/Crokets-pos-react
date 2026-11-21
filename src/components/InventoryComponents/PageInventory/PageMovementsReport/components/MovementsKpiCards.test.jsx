import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import MovementsKpiCards from "./MovementsKpiCards";

describe("MovementsKpiCards", () => {
  it("pinta una tarjeta por descriptor con signo en neto y ajustes", () => {
    render(
      <MovementsKpiCards
        kpis={{
          entries: { units: 1200, count: 3 },
          exits: { units: 5, count: 1 },
          adjustments: { units: -2, count: 2 },
          net: 1193,
        }}
      />
    );

    expect(screen.getByText("Entradas")).toBeTruthy();
    expect(screen.getByText("1,200")).toBeTruthy();
    expect(screen.getByText("1 movimiento")).toBeTruthy();
    expect(screen.getByText("-2")).toBeTruthy();
    expect(screen.getByText("+1,193")).toBeTruthy();
  });
});
