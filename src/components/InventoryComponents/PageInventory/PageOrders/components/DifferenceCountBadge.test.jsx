import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import DifferenceCountBadge from "./DifferenceCountBadge";

describe("DifferenceCountBadge", () => {
  it("usa singular y plural en la etiqueta accesible", () => {
    render(<DifferenceCountBadge summary={{ shortages: 1, overages: 3 }} />);

    expect(screen.getByLabelText("1 producto con faltante")).toBeTruthy();
    expect(screen.getByLabelText("3 productos con sobrante")).toBeTruthy();
  });

  it("muestra un guion sin recepcion y 0 sin diferencias", () => {
    const { rerender } = render(<DifferenceCountBadge summary={null} />);

    expect(screen.getByText("—")).toBeTruthy();

    rerender(<DifferenceCountBadge summary={{ shortages: 0, overages: 0 }} />);

    expect(screen.getByLabelText("Sin diferencias").textContent).toBe("0");
  });
});
