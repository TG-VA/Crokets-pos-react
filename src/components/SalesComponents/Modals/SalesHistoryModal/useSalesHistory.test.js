import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

vi.mock("../../services/salesHistoryService", () => ({
  getPaymentMethodLabel: vi.fn(() => "EFECTIVO"),
  getPaymentSummary: vi.fn(),
  fetchPaymentMethods: vi.fn(),
  fetchCashiers: vi.fn(),
  buildCustomerPointsMaps: vi.fn(),
  fetchTicketDetailsData: vi.fn(),
  fetchProductsByIds: vi.fn(),
  fetchSaleReturnsData: vi.fn(),
  fetchCanceledSaleData: vi.fn(),
  formatCurrency: vi.fn(),
  executeCancelSaleTransaction: vi.fn(),
  fetchHistoryTickets: vi.fn(),
}));

vi.mock("../../../../utils/ticketPrinter", () => ({ printTicket: vi.fn() }));
vi.mock("../../../../services/printSettingsService", () => ({
  getTicketPrintProfile: vi.fn(),
  getSelectedPrinter: vi.fn(),
  getTicketCopies: vi.fn(),
  getTicketFeedLines: vi.fn(),
}));
vi.mock("../../../../services/ticketCustomizationService", () => ({
  getTicketCustomization: vi.fn(),
}));

import {
  fetchPaymentMethods,
  fetchCashiers,
  fetchTicketDetailsData,
  fetchProductsByIds,
  fetchSaleReturnsData,
  fetchHistoryTickets,
} from "../../services/salesHistoryService";
import { useSalesHistory } from "./useSalesHistory";

const TICKETS = [
  { id: "s2", folio: "F-2", status: "completed", total: 200, payments: [] },
  { id: "s1", folio: "F-1", status: "completed", total: 100, payments: [] },
];

const renderSalesHistory = (initialProps = { isOpen: true }) =>
  renderHook(
    ({ isOpen }) =>
      useSalesHistory({
        isOpen,
        branchId: "b1",
        user: { id: "u1" },
        branch: { id: "b1" },
        onSaleCancelled: vi.fn(),
      }),
    { initialProps }
  );

describe("useSalesHistory - seleccion inicial", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchPaymentMethods.mockResolvedValue([]);
    fetchCashiers.mockResolvedValue([]);
    fetchHistoryTickets.mockResolvedValue(TICKETS);
    fetchTicketDetailsData.mockResolvedValue({ details: [], kits: [] });
    fetchProductsByIds.mockResolvedValue([]);
    fetchSaleReturnsData.mockResolvedValue({ returns: [], returnItems: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("al cerrar y reabrir el modal el filtro de fecha vuelve a hoy", async () => {
    // Solo se simula Date: los temporizadores reales siguen sirviendo a waitFor.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 2, 15, 12, 0, 0));
    const { result, rerender } = renderSalesHistory();
    await waitFor(() => expect(result.current.selectedTicket?.id).toBe("s2"));
    expect(result.current.dateFilter).toBe("2026-03-15");

    await act(async () => {
      result.current.setDateFilter("2026-01-01");
    });
    expect(result.current.dateFilter).toBe("2026-01-01");

    rerender({ isOpen: false });
    rerender({ isOpen: true });

    expect(result.current.dateFilter).toBe("2026-03-15");
    await waitFor(() => expect(result.current.loadingTickets).toBe(false));
  });

  it("selecciona la venta mas reciente al abrir el modal", async () => {
    const { result } = renderSalesHistory();

    await waitFor(() => expect(result.current.selectedTicket?.id).toBe("s2"));
    expect(fetchTicketDetailsData).toHaveBeenCalledWith("s2");
  });

  it("no reemplaza la seleccion del usuario cuando la lista se recarga", async () => {
    const { result } = renderSalesHistory();
    await waitFor(() => expect(result.current.selectedTicket?.id).toBe("s2"));

    await act(async () => {
      await result.current.handleSelectTicket(TICKETS[1]);
    });
    const callsBeforeReload = fetchHistoryTickets.mock.calls.length;
    await act(async () => {
      result.current.setCashierFilter("u9");
    });

    await waitFor(() =>
      expect(fetchHistoryTickets.mock.calls.length).toBeGreaterThan(
        callsBeforeReload
      )
    );
    await waitFor(() => expect(result.current.loadingTickets).toBe(false));
    expect(result.current.selectedTicket?.id).toBe("s1");
  });

  it("deja la seleccion vacia si no hay ventas", async () => {
    fetchHistoryTickets.mockResolvedValue([]);
    const { result } = renderSalesHistory();

    await waitFor(() => expect(result.current.loadingTickets).toBe(false));
    expect(result.current.selectedTicket).toBeNull();
  });

  it("no autoselecciona al cambiar el filtro si la primera carga vino vacia", async () => {
    fetchHistoryTickets.mockResolvedValueOnce([]);
    const { result } = renderSalesHistory();
    await waitFor(() => expect(result.current.loadingTickets).toBe(false));

    await act(async () => {
      result.current.setCashierFilter("u9");
    });

    await waitFor(() =>
      expect(fetchHistoryTickets.mock.calls.length).toBeGreaterThan(1)
    );
    await waitFor(() => expect(result.current.loadingTickets).toBe(false));
    expect(result.current.selectedTicket).toBeNull();
    expect(fetchTicketDetailsData).not.toHaveBeenCalled();
  });

  it("una respuesta tardia no selecciona una venta con el modal cerrado", async () => {
    let resolveTickets;
    fetchHistoryTickets.mockReturnValue(
      new Promise((resolve) => {
        resolveTickets = resolve;
      })
    );
    const { result, rerender } = renderSalesHistory();

    rerender({ isOpen: false });
    await act(async () => {
      resolveTickets(TICKETS);
    });

    expect(result.current.selectedTicket).toBeNull();
    expect(fetchTicketDetailsData).not.toHaveBeenCalled();
  });

  it("vuelve a seleccionar la mas reciente al reabrir el modal", async () => {
    const { result, rerender } = renderSalesHistory();
    await waitFor(() => expect(result.current.selectedTicket?.id).toBe("s2"));

    rerender({ isOpen: false });
    expect(result.current.selectedTicket).toBeNull();

    rerender({ isOpen: true });
    await waitFor(() => expect(result.current.selectedTicket?.id).toBe("s2"));
  });
});
