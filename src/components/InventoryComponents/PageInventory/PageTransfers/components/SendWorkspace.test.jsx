import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import SendWorkspace from "./SendWorkspace";

const baseProps = {
  destinationBranchId: "",
  destinationOptions: [{ id: "b2", name: "Norte", code: "NTE" }],
  loadingBranches: false,
  submitting: false,
  productSearch: "",
  transferNotes: "",
  draftItems: [],
  draftTotals: { lines: 0, units: 0 },
  onDestinationChange: vi.fn(),
  onProductSearchChange: vi.fn(),
  onLookupProduct: vi.fn(),
  onOpenSearchModal: vi.fn(),
  onTransferNotesChange: vi.fn(),
  onDraftQuantityChange: vi.fn(),
  onRemoveDraftItem: vi.fn(),
  onSubmitTransfer: vi.fn(),
};

describe("SendWorkspace sucursal origen", () => {
  it("no muestra el selector de origen en una terminal operativa", () => {
    render(<SendWorkspace {...baseProps} canChooseOrigin={false} />);

    expect(screen.queryByText("Sucursal origen")).toBeNull();
  });

  it("lista las operativas como origen en una terminal admin", () => {
    const onOriginChange = vi.fn();
    render(
      <SendWorkspace
        {...baseProps}
        canChooseOrigin
        originBranchId=""
        originOptions={[
          { id: "b1", name: "Centro", code: "CTR" },
          { id: "b2", name: "Norte", code: "NTE" },
        ]}
        onOriginChange={onOriginChange}
      />
    );

    const select = screen
      .getByText("Sucursal origen")
      .closest("label")
      .querySelector("select");
    expect(select.value).toBe("");
    expect(select.options).toHaveLength(3);
    fireEvent.change(select, { target: { value: "b1" } });
    expect(onOriginChange).toHaveBeenCalledWith("b1");
  });
});
