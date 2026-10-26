import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import OrderDetailModal from "./OrderDetailModal";

const order = {
  orderNumber: "PED-20261025-0001",
  orderName: "NAJAR",
  status: "pending",
  fromBranchName: "Huayacan",
  toBranchName: "Torres",
  sentAt: "2026-10-24T10:00:00.000Z",
  departments: [],
  items: [],
};

describe("OrderDetailModal", () => {
  it("separa el numero en el titulo y el nombre en el badge", () => {
    render(<OrderDetailModal order={order} onClose={() => {}} />);

    expect(
      screen.getByRole("heading", { name: "Pedido PED-20261025-0001" })
    ).toBeTruthy();
    expect(screen.getByText("NAJAR")).toBeTruthy();
  });
});
