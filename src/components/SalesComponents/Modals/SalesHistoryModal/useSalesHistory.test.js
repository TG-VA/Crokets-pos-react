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
  executeCancelSaleTransaction,
  buildCustomerPointsMaps,
  getPaymentSummary,
} from "../../services/salesHistoryService";
import { printTicket } from "../../../../utils/ticketPrinter";
import { useSalesHistory } from "./useSalesHistory";

const TICKETS = [
  { id: "s2", folio: "F-2", status: "completed", total: 200, payments: [] },
  { id: "s1", folio: "F-1", status: "completed", total: 100, payments: [] },
];

const complete = (tickets) => ({ tickets, incomplete: false });

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
    fetchHistoryTickets.mockResolvedValue(complete(TICKETS));
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

  it("el dia inicial es el local aunque ya sea el dia siguiente en UTC", async () => {
    // 23:30 locales: con TZ=America/Cancun (npm test) ya son las 04:30 UTC del
    // 26, y toISOString() devolvia ese dia, por lo que el historial abria vacio.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 25, 23, 30, 0));
    const { result } = renderSalesHistory();
    await waitFor(() => expect(result.current.selectedTicket?.id).toBe("s2"));

    expect(result.current.dateFilter).toBe("2026-10-25");
    expect(fetchHistoryTickets).toHaveBeenCalledWith(
      expect.objectContaining({ dateFilter: "2026-10-25" })
    );
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

  it("expone el aviso de datos incompletos y lo limpia al reintentar", async () => {
    fetchHistoryTickets.mockResolvedValue({
      tickets: TICKETS,
      incomplete: true,
    });
    const { result } = renderSalesHistory();

    await waitFor(() => expect(result.current.ticketsIncomplete).toBe(true));
    expect(result.current.tickets).toEqual(TICKETS);

    fetchHistoryTickets.mockResolvedValue(complete(TICKETS));
    await act(async () => {
      await result.current.retryLoadTickets();
    });

    expect(result.current.ticketsIncomplete).toBe(false);
  });

  it("deja la seleccion vacia si no hay ventas", async () => {
    fetchHistoryTickets.mockResolvedValue(complete([]));
    const { result } = renderSalesHistory();

    await waitFor(() => expect(result.current.loadingTickets).toBe(false));
    expect(result.current.selectedTicket).toBeNull();
  });

  it("no autoselecciona al cambiar el filtro si la primera carga vino vacia", async () => {
    fetchHistoryTickets.mockResolvedValueOnce(complete([]));
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
      resolveTickets(complete(TICKETS));
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

  it("al cambiar de dia selecciona la venta mas reciente de ese dia", async () => {
    fetchHistoryTickets.mockImplementation(({ dateFilter }) =>
      Promise.resolve(
        complete(dateFilter === "2026-03-16" ? [TICKETS[1]] : TICKETS)
      )
    );
    const { result } = renderSalesHistory();
    await waitFor(() => expect(result.current.selectedTicket?.id).toBe("s2"));

    await act(async () => {
      result.current.setDateFilter("2026-03-16");
    });

    await waitFor(() => expect(result.current.selectedTicket?.id).toBe("s1"));
    expect(fetchTicketDetailsData).toHaveBeenLastCalledWith("s1");
  });

  it("al cambiar a un dia sin ventas limpia la seleccion y no pide detalle", async () => {
    fetchHistoryTickets.mockImplementation(({ dateFilter }) =>
      Promise.resolve(complete(dateFilter === "2026-03-16" ? [] : TICKETS))
    );
    const { result } = renderSalesHistory();
    await waitFor(() => expect(result.current.selectedTicket?.id).toBe("s2"));
    const detailCallsBefore = fetchTicketDetailsData.mock.calls.length;

    await act(async () => {
      result.current.setDateFilter("2026-03-16");
    });

    await waitFor(() => expect(result.current.selectedTicket).toBeNull());
    expect(fetchTicketDetailsData).toHaveBeenCalledTimes(detailCallsBefore);
  });

  it("si la carga de un dia nuevo falla limpia la seleccion del dia anterior", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchHistoryTickets.mockImplementation(({ dateFilter }) =>
      dateFilter === "2026-03-16"
        ? Promise.reject(new Error("fallo de red"))
        : Promise.resolve(complete(TICKETS))
    );
    const { result } = renderSalesHistory();
    await waitFor(() => expect(result.current.selectedTicket?.id).toBe("s2"));
    const detailCallsBefore = fetchTicketDetailsData.mock.calls.length;

    await act(async () => {
      result.current.setDateFilter("2026-03-16");
    });

    await waitFor(() => expect(result.current.selectedTicket).toBeNull());
    expect(result.current.tickets).toEqual([]);
    expect(fetchTicketDetailsData).toHaveBeenCalledTimes(detailCallsBefore);
    errorSpy.mockRestore();
  });

  it("refresca en el mismo lugar el ticket recien cancelado", async () => {
    let currentTickets = TICKETS;
    fetchHistoryTickets.mockImplementation(() =>
      Promise.resolve(complete(currentTickets))
    );
    executeCancelSaleTransaction.mockResolvedValue(undefined);

    const { result } = renderSalesHistory();
    await waitFor(() => expect(result.current.selectedTicket?.id).toBe("s2"));

    act(() => {
      result.current.setCancelReason("Producto defectuoso");
      result.current.setRefundMethodId("pm-1");
    });
    act(() => {
      result.current.handleCancelSale();
    });

    expect(result.current.appModal.isOpen).toBe(true);

    currentTickets = [
      {
        ...TICKETS[0],
        status: "cancelled",
        cancelReason: "Producto defectuoso",
      },
      TICKETS[1],
    ];

    await act(async () => {
      await result.current.appModal.onConfirm();
    });

    expect(result.current.selectedTicket?.id).toBe("s2");
    expect(result.current.selectedTicket?.status).toBe("cancelled");
    expect(result.current.tickets[0].status).toBe("cancelled");
  });

  it("una respuesta tardia de otro dia no pisa la seleccion del dia actual", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 2, 15, 12, 0, 0));
    let resolveOldDay;
    fetchHistoryTickets.mockImplementation(({ dateFilter }) => {
      if (dateFilter === "2026-03-16") {
        return new Promise((resolve) => {
          resolveOldDay = resolve;
        });
      }
      if (dateFilter === "2026-03-17") {
        return Promise.resolve(
          complete([
            {
              id: "s3",
              folio: "F-3",
              status: "completed",
              total: 300,
              payments: [],
            },
          ])
        );
      }
      return Promise.resolve(complete(TICKETS));
    });
    const { result } = renderSalesHistory();
    await waitFor(() => expect(result.current.selectedTicket?.id).toBe("s2"));

    await act(async () => {
      result.current.setDateFilter("2026-03-16");
    });
    await act(async () => {
      result.current.setDateFilter("2026-03-17");
    });
    await waitFor(() => expect(result.current.selectedTicket?.id).toBe("s3"));

    await act(async () => {
      resolveOldDay(complete(TICKETS));
    });

    expect(result.current.selectedTicket?.id).toBe("s3");
  });
});

describe("useSalesHistory - copia impresa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchPaymentMethods.mockResolvedValue([]);
    fetchCashiers.mockResolvedValue([]);
    fetchTicketDetailsData.mockResolvedValue({ details: [], kits: [] });
    fetchProductsByIds.mockResolvedValue([]);
    fetchSaleReturnsData.mockResolvedValue({ returns: [], returnItems: [] });
    buildCustomerPointsMaps.mockResolvedValue({});
    getPaymentSummary.mockReturnValue({
      amountReceived: 0,
      changeAmount: 0,
      paymentsForPrint: [],
    });
    printTicket.mockResolvedValue({ success: true });
  });

  const printCopyFor = async (client) => {
    fetchHistoryTickets.mockResolvedValue(
      complete([{ ...TICKETS[0], client }])
    );
    const { result } = renderSalesHistory();
    await waitFor(() => expect(result.current.selectedTicket?.id).toBe("s2"));

    await act(async () => {
      await result.current.handlePrintCopy();
    });

    return printTicket.mock.calls[0][0];
  };

  it("imprime el nombre de un cliente con nombre propio", async () => {
    const ticketText = await printCopyFor("Juan Perez");

    expect(ticketText).toContain("Cliente: JUAN PEREZ");
  });

  it.each([
    "PÚBLICO EN GENERAL",
    "Publico en general",
    "  público en general ",
  ])("imprime el cliente generico cuando el nombre es %j", async (client) => {
    const ticketText = await printCopyFor(client);

    expect(ticketText).toContain("Cliente: PÚBLICO EN GENERAL");
  });
});
