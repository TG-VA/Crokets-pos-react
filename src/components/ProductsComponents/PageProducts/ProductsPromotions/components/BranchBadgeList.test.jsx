import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import BranchBadgeList from "./BranchBadgeList";

describe("BranchBadgeList", () => {
  it("renderiza un badge por sucursal", () => {
    const { getByText } = render(
      <BranchBadgeList
        branches={[
          { id: 1, name: "Coba" },
          { id: 2, name: "Huayacan" },
        ]}
      />
    );

    expect(getByText("Coba")).toBeTruthy();
    expect(getByText("Huayacan")).toBeTruthy();
  });

  it("no falla con sucursales indefinidas", () => {
    const { container } = render(<BranchBadgeList />);

    expect(container.querySelectorAll("span")).toHaveLength(0);
  });
});
