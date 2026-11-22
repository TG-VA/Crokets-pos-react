import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";

vi.mock("../../../../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("../../../../../lib/permissionsService", () => ({
  checkUserIsAdmin: vi.fn(),
}));

vi.mock(
  "../../../../../services/customers/customerPointsBalanceService",
  () => ({
    fetchPointsBalanceByCustomer: vi.fn(),
  })
);

vi.mock("../../services/customersRealtimeService", () => ({
  subscribeToTableChanges: vi.fn(),
}));

vi.mock("../services/customersListService", () => ({
  fetchPointsCustomers: vi.fn(),
  searchFiscalCustomerByPhone: vi.fn(),
  updateCustomerStatus: vi.fn(),
}));

import { fetchPointsBalanceByCustomer } from "../../../../../services/customers/customerPointsBalanceService";
import { subscribeToTableChanges } from "../../services/customersRealtimeService";
import { fetchPointsCustomers } from "../services/customersListService";
import {
  REALTIME_RELOAD_DEBOUNCE_MS,
  useCustomersList,
} from "./useCustomersList";

const ANA = { id: "c1", name: "ANA", phone: "5512345678", status: true };
const LUIS = { id: "c2", name: "LUIS", phone: "5587654321", status: true };

const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

// Deja correr las promesas pendientes del hook dentro de `act`.
const flush = () => act(async () => {});

describe("useCustomersList", () => {
  let emitRealtimeChange;
  let unsubscribe;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    unsubscribe = vi.fn();
    subscribeToTableChanges.mockImplementation(({ onChange }) => {
      emitRealtimeChange = onChange;
      return unsubscribe;
    });
    fetchPointsCustomers.mockResolvedValue([ANA]);
    fetchPointsBalanceByCustomer.mockResolvedValue({ c1: 40 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("realtime", () => {
    it("agrupa una rafaga de eventos en una sola recarga", async () => {
      renderHook(() => useCustomersList());
      await flush();
      expect(fetchPointsCustomers).toHaveBeenCalledTimes(1);

      act(() => {
        emitRealtimeChange();
        emitRealtimeChange();
        emitRealtimeChange();
      });
      await act(async () => {
        vi.advanceTimersByTime(REALTIME_RELOAD_DEBOUNCE_MS - 1);
      });
      expect(fetchPointsCustomers).toHaveBeenCalledTimes(1);

      await act(async () => {
        vi.advanceTimersByTime(1);
      });
      expect(fetchPointsCustomers).toHaveBeenCalledTimes(2);
    });

    it("recarga sin activar loadingCustomers", async () => {
      const { result } = renderHook(() => useCustomersList());
      await flush();

      const pending = deferred();
      fetchPointsCustomers.mockReturnValueOnce(pending.promise);

      act(() => emitRealtimeChange());
      await act(async () => {
        vi.advanceTimersByTime(REALTIME_RELOAD_DEBOUNCE_MS);
      });

      expect(fetchPointsCustomers).toHaveBeenCalledTimes(2);
      expect(result.current.loadingCustomers).toBe(false);
      expect(result.current.filteredCustomers).toEqual([ANA]);

      await act(async () => pending.resolve([ANA, LUIS]));
      expect(result.current.filteredCustomers).toEqual([ANA, LUIS]);
    });

    it("descarta una respuesta vieja que llega despues de una nueva", async () => {
      const { result } = renderHook(() => useCustomersList());
      await flush();

      const slow = deferred();
      fetchPointsCustomers
        .mockReturnValueOnce(slow.promise)
        .mockResolvedValueOnce([ANA, LUIS]);

      act(() => {
        result.current.loadCustomers();
      });
      await act(async () => result.current.loadCustomers());
      expect(result.current.filteredCustomers).toEqual([ANA, LUIS]);

      await act(async () => slow.resolve([]));
      expect(result.current.filteredCustomers).toEqual([ANA, LUIS]);
      expect(result.current.loadingCustomers).toBe(false);
    });

    it("cancela la recarga pendiente y el canal al desmontar", async () => {
      const { unmount } = renderHook(() => useCustomersList());
      await flush();

      act(() => emitRealtimeChange());
      unmount();
      await act(async () => {
        vi.advanceTimersByTime(REALTIME_RELOAD_DEBOUNCE_MS);
      });

      expect(unsubscribe).toHaveBeenCalledTimes(1);
      expect(fetchPointsCustomers).toHaveBeenCalledTimes(1);
    });
  });
});
