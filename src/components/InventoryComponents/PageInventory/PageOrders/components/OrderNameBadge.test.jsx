import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import OrderNameBadge from "./OrderNameBadge";

describe("OrderNameBadge", () => {
  it("muestra el nombre en mayusculas", () => {
    render(<OrderNameBadge name="najar" />);

    expect(screen.getByText("NAJAR")).toBeTruthy();
  });

  it("no falla sin nombre", () => {
    const { container } = render(<OrderNameBadge name={null} />);

    expect(container.firstElementChild.textContent).toBe("");
  });

  it("aplica la clase de la pastilla sin espacios colgantes", () => {
    const { container } = render(<OrderNameBadge name="Najar" />);
    const { className } = container.firstElementChild;

    expect(className).toBeTruthy();
    expect(className).toBe(className.trim());
  });
});
