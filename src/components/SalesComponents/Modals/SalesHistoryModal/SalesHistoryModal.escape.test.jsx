import { beforeEach, describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const historyState = vi.hoisted(() => ({ notesOpen: false }));

vi.mock("../../../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));

vi.mock("../../../../contexts/BranchContext", () => ({
  useBranch: () => ({ branch: { id: "b1" } }),
}));

vi.mock("./useSalesHistory", () => ({
  useSalesHistory: () => ({
    searchFolio: "",
    setSearchFolio: vi.fn(),
    selectedTicket: {
      id: "t1",
      folio: "1042",
      cashier: "Ana",
      client: "Juan Perez",
      date: "2026-10-28T14:32:00.000Z",
      status: "completed",
      notes: "Entregar bolsa extra.",
      items: [],
      payments: [],
    },
    dateFilter: "2026-10-28",
    setDateFilter: vi.fn(),
    cashierFilter: "",
    setCashierFilter: vi.fn(),
    tickets: [],
    cashiers: [],
    paymentMethods: [],
    loadingTickets: false,
    loadingDetail: false,
    cancelProcessing: false,
    printProcessing: false,
    cancelReason: "",
    setCancelReason: vi.fn(),
    refundMethodId: "",
    setRefundMethodId: vi.fn(),
    isPartialReturnOpen: false,
    setIsPartialReturnOpen: vi.fn(),
    appModal: { isOpen: false },
    isNotesModalOpen: historyState.notesOpen,
    setIsNotesModalOpen: vi.fn(),
    closeAppModal: vi.fn(),
    handleSelectTicket: vi.fn(),
    handleCancelSale: vi.fn(),
    handlePartialReturnCreated: vi.fn(),
    handlePrintCopy: vi.fn(),
  }),
}));

import SalesHistoryModal from "./SalesHistoryModal";

describe("SalesHistoryModal: Escape con capas internas", () => {
  beforeEach(() => {
    historyState.notesOpen = false;
  });

  it("cierra el historial con Escape cuando no hay capas internas", () => {
    const onClose = vi.fn();
    render(<SalesHistoryModal isOpen onClose={onClose} />);

    fireEvent.keyDown(window, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("no cierra el historial con Escape mientras las notas estan abiertas", () => {
    historyState.notesOpen = true;
    const onClose = vi.fn();
    render(<SalesHistoryModal isOpen onClose={onClose} />);

    expect(screen.getByText(/Notas del ticket 1042/)).toBeTruthy();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(onClose).not.toHaveBeenCalled();
  });
});
