import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("../services/pointsAdjustmentService", () => ({
  fetchCurrentAuthUser: vi.fn(),
  fetchCustomerPointMovements: vi.fn(),
  fetchUserProfileWithRole: vi.fn(),
  insertPointsMovement: vi.fn(),
  searchPointsCustomers: vi.fn(),
}));

vi.mock("../../services/customersRealtimeService", () => ({
  subscribeToTableChanges: vi.fn(() => vi.fn()),
}));

vi.mock("../../../../../contexts/BranchContext", () => ({
  useBranch: () => ({ branch: { id: "b1", name: "SUCURSAL CENTRAL" } }),
}));

import {
  fetchCurrentAuthUser,
  fetchCustomerPointMovements,
  fetchUserProfileWithRole,
  insertPointsMovement,
  searchPointsCustomers,
} from "../services/pointsAdjustmentService";
import { subscribeToTableChanges } from "../../services/customersRealtimeService";
import { ADMIN_AUTH_STORAGE_KEY } from "../services/pointsAdjustmentCalculationService";
import { usePointsAdjustment } from "./usePointsAdjustment";

const ACTIVE_CUSTOMER = {
  id: "c1",
  name: "ANA",
  phone: "5512345678",
  email: "ana@correo.com",
  status: true,
};

const INACTIVE_CUSTOMER = { ...ACTIVE_CUSTOMER, id: "c2", status: false };

const renderPointsAdjustment = () => renderHook(() => usePointsAdjustment());

const flush = async () => {
  await act(async () => {});
};

const authorizeAdmin = async (result) => {
  await flush();
  await act(async () => {
    await result.current.handleSelectCustomer(ACTIVE_CUSTOMER);
  });
};

const fillValidAdjustment = async (
  result,
  { reason = "administrative_correction" } = {}
) => {
  await act(async () => {
    result.current.handlePointsChange("50");
  });

  await act(async () => {
    result.current.handleReasonChange(reason);
  });

  if (reason === "other") {
    await act(async () => {
      result.current.setNotes("ACLARACION AUTORIZADA POR DIFERENCIA");
    });
  }
};

const submitEvent = { preventDefault: vi.fn() };

describe("usePointsAdjustment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();

    fetchCurrentAuthUser.mockResolvedValue({ id: "u1" });
    fetchUserProfileWithRole.mockResolvedValue({
      id: "u1",
      status: true,
      roles: { name: "admin" },
    });
    fetchCustomerPointMovements.mockResolvedValue([
      { points: 100, movement_type: "earn" },
      { points: -30, movement_type: "redeem" },
    ]);
    insertPointsMovement.mockResolvedValue(undefined);
    searchPointsCustomers.mockResolvedValue([]);

    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("suscripcion realtime", () => {
    it("observa customer_points filtrado por el cliente seleccionado", async () => {
      const { result } = renderPointsAdjustment();
      await authorizeAdmin(result);

      const lastCall = subscribeToTableChanges.mock.calls.at(-1)[0];

      expect(lastCall.tables).toEqual(["customer_points"]);
      expect(lastCall.rowFilter).toBe("customer_id=eq.c1");
    });
  });

  describe("acceso administrativo", () => {
    it("arranca validando y permite continuar con perfil admin", async () => {
      const { result } = renderPointsAdjustment();

      expect(result.current.adminAccessStatus).toBe("checking");

      await flush();

      expect(result.current.adminAccessStatus).toBe("allowed");
    });

    it("deniega el acceso cuando el perfil no es admin", async () => {
      fetchUserProfileWithRole.mockResolvedValue({
        id: "u1",
        status: true,
        roles: { name: "cajero" },
      });

      const { result } = renderPointsAdjustment();
      await flush();

      expect(result.current.adminAccessStatus).toBe("denied");
      expect(result.current.adminAccessMessage).toBe(
        "Solo un administrador puede realizar ajustes manuales de puntos."
      );
    });

    it("reutiliza la autorizacion guardada en la pestana", async () => {
      sessionStorage.setItem(ADMIN_AUTH_STORAGE_KEY, "true");

      const { result } = renderPointsAdjustment();
      await flush();

      expect(result.current.adminAccessStatus).toBe("allowed");
      expect(fetchUserProfileWithRole).not.toHaveBeenCalled();
    });
  });

  describe("seleccion de cliente", () => {
    it("calcula el saldo sumando movimientos con signo", async () => {
      const { result } = renderPointsAdjustment();
      await authorizeAdmin(result);

      expect(result.current.selectedCustomer).toEqual(ACTIVE_CUSTOMER);
      expect(result.current.currentPoints).toBe(70);
    });

    it("no selecciona ni consulta saldo cuando el cliente esta inactivo", async () => {
      const { result } = renderPointsAdjustment();
      await flush();

      fetchCustomerPointMovements.mockClear();

      await act(async () => {
        await result.current.handleSelectCustomer(INACTIVE_CUSTOMER);
      });

      expect(result.current.selectedCustomer).toBeNull();
      expect(fetchCustomerPointMovements).not.toHaveBeenCalled();
    });
  });

  describe("reglas de habilitacion", () => {
    it("bloquea el envio sin cliente seleccionado", async () => {
      const { result } = renderPointsAdjustment();
      await flush();

      expect(result.current.canSubmit).toBe(false);
    });

    it("habilita el envio con cliente, puntos, motivo y saldo suficiente", async () => {
      const { result } = renderPointsAdjustment();
      await authorizeAdmin(result);
      await fillValidAdjustment(result);

      expect(result.current.canSubmit).toBe(true);
    });

    it("bloquea el descuento que dejaria el saldo en negativo", async () => {
      const { result } = renderPointsAdjustment();
      await authorizeAdmin(result);
      await fillValidAdjustment(result);

      await act(async () => {
        result.current.setAdjustmentType("subtract");
        result.current.handlePointsChange("500");
      });

      expect(result.current.newBalance).toBeLessThan(0);
      expect(result.current.canSubmit).toBe(false);
    });

    it("bloquea motivos genericos en el campo otro", async () => {
      const { result } = renderPointsAdjustment();
      await authorizeAdmin(result);
      await fillValidAdjustment(result, { reason: "other" });

      await act(async () => {
        result.current.setNotes("PRUEBA");
      });

      expect(result.current.isOtherReason).toBe(true);
      expect(result.current.canSubmit).toBe(false);
    });
  });

  describe("revision y guardado", () => {
    it("muestra el mensaje de la primera regla incumplida y no abre la confirmacion", async () => {
      const { result } = renderPointsAdjustment();
      await flush();

      await act(async () => {
        result.current.handleOpenConfirmModal(submitEvent);
      });

      expect(submitEvent.preventDefault).toHaveBeenCalled();
      expect(result.current.isConfirmModalOpen).toBe(false);
    });

    it("abre la confirmacion con un ajuste valido", async () => {
      const { result } = renderPointsAdjustment();
      await authorizeAdmin(result);
      await fillValidAdjustment(result);

      await act(async () => {
        result.current.handleOpenConfirmModal(submitEvent);
      });

      expect(result.current.isConfirmModalOpen).toBe(true);
    });

    it("registra el movimiento y reinicia el formulario", async () => {
      const { result } = renderPointsAdjustment();
      await authorizeAdmin(result);
      await fillValidAdjustment(result);

      await act(async () => {
        result.current.handleOpenConfirmModal(submitEvent);
      });

      await act(async () => {
        await result.current.handleConfirmAdjustment();
      });

      expect(insertPointsMovement).toHaveBeenCalledTimes(1);
      expect(result.current.isConfirmModalOpen).toBe(false);
      expect(result.current.pointsAmount).toBe("");
      expect(result.current.adjustmentReason).toBe("");
      expect(result.current.adjustmentType).toBe("add");
    });

    it("vuelve a validar la seleccion antes de guardar", async () => {
      const { result } = renderPointsAdjustment();
      await authorizeAdmin(result);
      await fillValidAdjustment(result);

      await act(async () => {
        result.current.handleOpenConfirmModal(submitEvent);
      });

      // El cliente se desactiva entre la revision y la confirmacion.
      await act(async () => {
        result.current.handleClearSearch();
      });

      await act(async () => {
        await result.current.handleConfirmAdjustment();
      });

      expect(insertPointsMovement).not.toHaveBeenCalled();
      expect(result.current.isConfirmModalOpen).toBe(false);
    });

    it("expone el error del servicio sin cerrar la pantalla", async () => {
      insertPointsMovement.mockRejectedValue(new Error("Fallo de red"));

      const { result } = renderPointsAdjustment();
      await authorizeAdmin(result);
      await fillValidAdjustment(result);

      await act(async () => {
        result.current.handleOpenConfirmModal(submitEvent);
      });

      await act(async () => {
        await result.current.handleConfirmAdjustment();
      });

      expect(result.current.saving).toBe(false);
    });
  });
});
