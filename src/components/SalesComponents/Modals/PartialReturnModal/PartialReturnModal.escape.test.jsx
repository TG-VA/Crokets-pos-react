import { beforeEach, describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const hookState = vi.hoisted(() => ({
  processing: false,
  appModal: { isOpen: false },
  closeAppModal: null,
}));

vi.mock("./usePartialReturn", async (importOriginal) => ({
  ...(await importOriginal()),
  usePartialReturn: () => ({
    itemsWithLimits: [],
    quantities: {},
    returnReason: "",
    setReturnReason: vi.fn(),
    refundMethodId: "",
    setRefundMethodId: vi.fn(),
    processing: hookState.processing,
    summary: { totalRefund: 0, totalUnitsAfterReturn: 1 },
    appModal: hookState.appModal,
    closeAppModal: hookState.closeAppModal,
    handleQtyChange: vi.fn(),
    handleDecreaseQty: vi.fn(),
    handleIncreaseQty: vi.fn(),
    handleSave: vi.fn(),
  }),
}));

import PartialReturnModal from "./PartialReturnModal";

const renderModal = () => {
  const onClose = vi.fn();

  render(
    <PartialReturnModal
      isOpen
      onClose={onClose}
      selectedTicket={{ folio: "1042" }}
    />
  );

  return { onClose };
};

describe("PartialReturnModal: Escape", () => {
  beforeEach(() => {
    hookState.processing = false;
    hookState.appModal = { isOpen: false };
    hookState.closeAppModal = vi.fn();
  });

  it("se cierra con Escape aunque el foco este dentro del modal", () => {
    const { onClose } = renderModal();

    fireEvent.keyDown(screen.getByText("DEVOLUCIÓN PARCIAL"), {
      key: "Escape",
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("no se cierra con Escape mientras se procesa la devolucion", () => {
    hookState.processing = true;
    const { onClose } = renderModal();

    fireEvent.keyDown(screen.getByText("DEVOLUCIÓN PARCIAL"), {
      key: "Escape",
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("con un aviso abierto Escape cierra solo el aviso", () => {
    hookState.appModal = {
      isOpen: true,
      type: "warning",
      title: "Aviso",
      message: "Revisa los datos",
    };
    const { onClose } = renderModal();

    fireEvent.keyDown(screen.getByText("DEVOLUCIÓN PARCIAL"), {
      key: "Escape",
    });

    expect(hookState.closeAppModal).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });
});
