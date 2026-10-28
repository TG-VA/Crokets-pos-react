import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import BranchBadge from "./BranchBadge";

describe("BranchBadge", () => {
  it("muestra el rol de origen junto al nombre", () => {
    render(<BranchBadge role="origin" name="Huayacan" />);

    expect(screen.getByText("Origen")).toBeTruthy();
    expect(screen.getByText("HUAYACAN")).toBeTruthy();
  });

  it("muestra el rol de destino junto al nombre", () => {
    render(<BranchBadge role="destination" name="Torres" />);

    expect(screen.getByText("Destino")).toBeTruthy();
  });

  it("muestra primero el nombre en mayusculas y despues el rol", () => {
    const { container } = render(<BranchBadge role="origin" name="Huayacan" />);

    expect(container.firstElementChild.textContent).toBe("HUAYACANOrigen");
    expect(container.firstElementChild.firstElementChild.textContent).toBe(
      "HUAYACAN"
    );
  });

  it("usa clases distintas por rol", () => {
    const { container: origin } = render(
      <BranchBadge role="origin" name="A" />
    );
    const { container: destination } = render(
      <BranchBadge role="destination" name="B" />
    );

    expect(origin.firstElementChild.className).not.toBe(
      destination.firstElementChild.className
    );
  });

  it("oculta la etiqueta de rol cuando showRole es falso", () => {
    render(<BranchBadge role="origin" name="Huayacan" showRole={false} />);

    expect(screen.queryByText("Origen")).toBeNull();
  });
});
