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

import { checkUserIsAdmin } from "../../../../../lib/permissionsService";
import { fetchPointsBalanceByCustomer } from "../../../../../services/customers/customerPointsBalanceService";
import { subscribeToTableChanges } from "../../services/customersRealtimeService";
import {
  fetchPointsCustomers,
  searchFiscalCustomerByPhone,
  updateCustomerStatus,
} from "../services/customersListService";
import {
  REALTIME_RELOAD_DEBOUNCE_MS,
  useCustomersList,
} from "./useCustomersList";

const ANA = { id: "c1", name: "ANA", phone: "5512345678", status: true };
const LUIS = { id: "c2", name: "LUIS", phone: "5587654321", status: true };
const INACTIVE = { id: "c3", name: "EVA", phone: "5500000000", status: false };
const FISCAL = { id: "f1", name: "FISCAL SA", phone: "5599999999" };

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

  it("carga clientes y saldos al montar", async () => {
    const { result } = renderHook(() => useCustomersList());

    expect(result.current.loadingCustomers).toBe(true);
    await flush();

    expect(fetchPointsBalanceByCustomer).toHaveBeenCalledWith(["c1"]);
    expect(result.current.filteredCustomers).toEqual([ANA]);
    expect(result.current.pointsByCustomer).toEqual({ c1: 40 });
    expect(result.current.loadingCustomers).toBe(false);
  });

  describe("cambio de estado", () => {
    const confirm = () =>
      act(async () => {
        await result.current.appModal.onConfirm();
      });
    let result;

    beforeEach(async () => {
      updateCustomerStatus.mockResolvedValue();
      ({ result } = renderHook(() => useCustomersList()));
      await flush();
    });

    it("un admin desactiva tras confirmar, sin pedir autorizacion", async () => {
      checkUserIsAdmin.mockResolvedValue(true);

      await act(async () => result.current.handleToggleStatus(ANA));

      expect(checkUserIsAdmin).toHaveBeenCalledWith("user-1");
      expect(result.current.adminAuthOpen).toBe(false);
      expect(result.current.appModal.title).toBe("Desactivar cliente");
      expect(updateCustomerStatus).not.toHaveBeenCalled();

      await confirm();

      expect(updateCustomerStatus).toHaveBeenCalledWith({
        customerId: "c1",
        nextStatus: false,
      });
      expect(result.current.appModal.title).toBe("Cliente desactivado");
    });

    it("un no admin pasa por AdminAuthorizationModal y luego confirma", async () => {
      checkUserIsAdmin.mockResolvedValue(false);

      await act(async () => result.current.handleToggleStatus(ANA));

      expect(result.current.adminAuthOpen).toBe(true);
      expect(result.current.pendingDeactivateCustomer).toBe(ANA);
      expect(result.current.appModal.isOpen).toBe(false);

      await act(async () => result.current.handleAdminAuthorized());

      expect(result.current.adminAuthOpen).toBe(false);
      expect(result.current.pendingDeactivateCustomer).toBeNull();
      expect(result.current.appModal.title).toBe("Desactivar cliente");

      await confirm();

      expect(updateCustomerStatus).toHaveBeenCalledWith({
        customerId: "c1",
        nextStatus: false,
      });
    });

    it("cerrar la autorizacion no desactiva", async () => {
      checkUserIsAdmin.mockResolvedValue(false);

      await act(async () => result.current.handleToggleStatus(ANA));
      act(() => result.current.handleCloseAdminAuth());

      expect(result.current.adminAuthOpen).toBe(false);
      expect(result.current.appModal.isOpen).toBe(false);
      expect(updateCustomerStatus).not.toHaveBeenCalled();
    });

    it("activar solo pide confirmacion, sin revisar el rol", async () => {
      await act(async () => result.current.handleToggleStatus(INACTIVE));

      expect(checkUserIsAdmin).not.toHaveBeenCalled();
      expect(result.current.adminAuthOpen).toBe(false);
      expect(result.current.appModal.title).toBe("Activar cliente");

      await confirm();

      expect(updateCustomerStatus).toHaveBeenCalledWith({
        customerId: "c3",
        nextStatus: true,
      });
    });
  });

  describe("busqueda fiscal", () => {
    it("busca 300 ms despues del ultimo cambio de un telefono completo", async () => {
      searchFiscalCustomerByPhone.mockResolvedValue(FISCAL);
      const { result } = renderHook(() => useCustomersList());
      await flush();

      act(() => result.current.setSearchTerm("55-9999-999"));
      act(() => result.current.setSearchTerm("55-9999-9999"));
      await act(async () => {
        vi.advanceTimersByTime(299);
      });
      expect(searchFiscalCustomerByPhone).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(1);
      });

      expect(searchFiscalCustomerByPhone).toHaveBeenCalledTimes(1);
      expect(searchFiscalCustomerByPhone).toHaveBeenCalledWith("5599999999");
      expect(result.current.fiscalCustomerFound).toBe(FISCAL);
    });

    it("no busca si el telefono ya es de un cliente de puntos", async () => {
      const { result } = renderHook(() => useCustomersList());
      await flush();

      act(() => result.current.setSearchTerm(ANA.phone));
      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      expect(searchFiscalCustomerByPhone).not.toHaveBeenCalled();
      expect(result.current.fiscalCustomerFound).toBeNull();
    });

    it("no busca con un telefono incompleto", async () => {
      const { result } = renderHook(() => useCustomersList());
      await flush();

      act(() => result.current.setSearchTerm("551234"));
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(searchFiscalCustomerByPhone).not.toHaveBeenCalled();
    });
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
