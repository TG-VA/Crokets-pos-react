import { beforeEach, describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const historyState = vi.hoisted(() => ({
  notesOpen: false,
  partialReturnOpen: false,
  appModal: { isOpen: false },
  ticketOverrides: {},
  setPartialReturnOpen: null,
  ticketsIncomplete: false,
  retryLoadTickets: vi.fn(),
  retryingTickets: false,
  loadingTickets: false,
}));

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
      ...historyState.ticketOverrides,
    },
    dateFilter: "2026-10-28",
    setDateFilter: vi.fn(),
    cashierFilter: "",
    setCashierFilter: vi.fn(),
    tickets: [],
    ticketsIncomplete: historyState.ticketsIncomplete,
    retryLoadTickets: historyState.retryLoadTickets,
    retryingTickets: historyState.retryingTickets,
    cashiers: [],
    paymentMethods: [],
    loadingTickets: historyState.loadingTickets,
    loadingDetail: false,
    cancelProcessing: false,
    printProcessing: false,
    cancelReason: "",
    setCancelReason: vi.fn(),
    refundMethodId: "",
    setRefundMethodId: vi.fn(),
    isPartialReturnOpen: historyState.partialReturnOpen,
    setIsPartialReturnOpen: historyState.setPartialReturnOpen,
    appModal: historyState.appModal,
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
    historyState.partialReturnOpen = false;
    historyState.appModal = { isOpen: false };
    historyState.ticketOverrides = {};
    historyState.setPartialReturnOpen = vi.fn();
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

  it("cierra solo la devolucion parcial con Escape y regresa al historial", () => {
    historyState.partialReturnOpen = true;
    const onClose = vi.fn();
    render(<SalesHistoryModal isOpen onClose={onClose} />);

    expect(screen.getByText("DEVOLUCIÓN PARCIAL")).toBeTruthy();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(historyState.setPartialReturnOpen).toHaveBeenCalledWith(false);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("cierra la devolucion parcial con Escape aunque el foco este dentro del modal", () => {
    historyState.partialReturnOpen = true;
    const onClose = vi.fn();
    render(<SalesHistoryModal isOpen onClose={onClose} />);

    // Con el foco dentro del modal, la tecla nace en un elemento del overlay.
    fireEvent.keyDown(screen.getByText("DEVOLUCIÓN PARCIAL"), {
      key: "Escape",
    });

    expect(historyState.setPartialReturnOpen).toHaveBeenCalledWith(false);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("no cierra el historial con Escape mientras hay un aviso abierto", () => {
    historyState.appModal = {
      isOpen: true,
      type: "warning",
      title: "Aviso",
      message: "Revisa los datos",
    };
    const onClose = vi.fn();
    render(<SalesHistoryModal isOpen onClose={onClose} />);

    fireEvent.keyDown(window, { key: "Escape" });

    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("SalesHistoryModal: resumen de puntos del cliente", () => {
  beforeEach(() => {
    historyState.notesOpen = false;
    historyState.partialReturnOpen = false;
    historyState.setPartialReturnOpen = vi.fn();
    historyState.appModal = { isOpen: false };
    historyState.ticketOverrides = { pointsEarned: 12 };
  });

  it("muestra el resumen para un cliente con nombre propio", () => {
    render(<SalesHistoryModal isOpen onClose={vi.fn()} />);

    expect(screen.getByText("Puntos del cliente")).toBeTruthy();
  });

  it.each(["PÚBLICO EN GENERAL", "Publico en general"])(
    "oculta el resumen cuando el cliente es %j",
    (client) => {
      historyState.ticketOverrides = { pointsEarned: 12, client };
      render(<SalesHistoryModal isOpen onClose={vi.fn()} />);

      expect(screen.queryByText("Puntos del cliente")).toBeNull();
    }
  );
});

describe("SalesHistoryModal: aviso de historial incompleto", () => {
  beforeEach(() => {
    historyState.notesOpen = false;
    historyState.partialReturnOpen = false;
    historyState.appModal = { isOpen: false };
    historyState.ticketOverrides = {};
    historyState.ticketsIncomplete = false;
    historyState.retryLoadTickets = vi.fn();
    historyState.retryingTickets = false;
    historyState.loadingTickets = false;
  });

  it("no muestra el aviso si los datos llegaron completos", () => {
    render(<SalesHistoryModal isOpen onClose={vi.fn()} />);

    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("muestra el aviso y reintenta la carga al pulsar Reintentar", () => {
    historyState.ticketsIncomplete = true;
    render(<SalesHistoryModal isOpen onClose={vi.fn()} />);

    expect(screen.getByRole("alert").textContent).toMatch(
      /No se pudieron cargar todos los datos/
    );
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(historyState.retryLoadTickets).toHaveBeenCalledTimes(1);
  });

  it("oculta el aviso mientras la lista carga", () => {
    historyState.ticketsIncomplete = true;
    historyState.loadingTickets = true;
    render(<SalesHistoryModal isOpen onClose={vi.fn()} />);

    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("deshabilita Reintentar mientras el reintento esta en curso", () => {
    historyState.ticketsIncomplete = true;
    historyState.retryingTickets = true;
    render(<SalesHistoryModal isOpen onClose={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Reintentar" }).disabled).toBe(
      true
    );
  });
});
