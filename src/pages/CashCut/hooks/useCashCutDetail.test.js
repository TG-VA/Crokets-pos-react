import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("../services/cashCutReportService", () => ({
  createCashCut: vi.fn(),
  insertCashCutDetails: vi.fn(),
  closeCashRegisterSession: vi.fn(),
}));

import {
  createCashCut,
  insertCashCutDetails,
  closeCashRegisterSession,
} from "../services/cashCutReportService";
import { useCashCutDetail } from "./useCashCutDetail";

const baseProps = {
  session: { id: "s1", branch_id: "b1" },
  user: { id: "u1" },
  isHistoricalView: false,
  hasShiftCut: false,
  netPaymentMethodDetails: [],
  showAppAlert: vi.fn(),
  showAppConfirm: vi.fn(),
  setErrorMsg: vi.fn(),
  onCutSaved: vi.fn(),
  onShiftClosed: vi.fn(),
};

const renderDetail = (overrides = {}) => {
  const props = { ...baseProps, ...overrides };
  const utils = renderHook(() => useCashCutDetail(props));
  return { ...utils, props };
};

describe("useCashCutDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("openCorteModal", () => {
    it("bloquea si no hay turno activo", () => {
      const { result, props } = renderDetail({ session: null });

      act(() => {
        result.current.openCorteModal();
      });

      expect(props.setErrorMsg).toHaveBeenCalledWith(
        "No hay turno activo. Abre caja antes de realizar un corte."
      );
      expect(result.current.isCutModalOpen).toBe(false);
    });

    it("bloquea si ya existe un corte de turno", () => {
      const { result, props } = renderDetail({ hasShiftCut: true });

      act(() => {
        result.current.openCorteModal();
      });

      expect(props.setErrorMsg).toHaveBeenCalledWith(
        "Ya existe un corte de cajero para este turno."
      );
      expect(result.current.isCutModalOpen).toBe(false);
    });

    it("abre el modal con turno valido", () => {
      const { result, props } = renderDetail();

      act(() => {
        result.current.openCorteModal();
      });

      expect(props.setErrorMsg).toHaveBeenCalledWith("");
      expect(result.current.isCutModalOpen).toBe(true);
    });
  });

  describe("confirmCut", () => {
    it("exige el monto contado", async () => {
      const { result, props } = renderDetail();

      await act(async () => {
        await result.current.confirmCut({ counted: "", notes: "", expected: 0 });
      });

      expect(props.setErrorMsg).toHaveBeenCalledWith(
        "Debes capturar el monto contado en caja."
      );
      expect(createCashCut).not.toHaveBeenCalled();
    });

    it("avisa si el corte ya existe (23505)", async () => {
      createCashCut.mockResolvedValue({
        data: null,
        error: { code: "23505" },
      });
      const { result, props } = renderDetail();

      await act(async () => {
        await result.current.confirmCut({
          counted: 100,
          notes: "",
          expected: 100,
        });
      });

      expect(props.setErrorMsg).toHaveBeenCalledWith(
        "Ya existe un corte de cajero para este turno."
      );
      expect(insertCashCutDetails).not.toHaveBeenCalled();
    });

    it("guarda el corte y su detalle por metodo", async () => {
      createCashCut.mockResolvedValue({ data: { id: "cut1" }, error: null });
      insertCashCutDetails.mockResolvedValue({ data: null, error: null });

      const { result, props } = renderDetail({
        netPaymentMethodDetails: [
          {
            payment_method_id: "pm1",
            expected_amount: 10,
            counted_amount: 10,
            difference: 0,
          },
        ],
      });

      await act(async () => {
        await result.current.confirmCut({
          counted: 100,
          notes: "ok",
          expected: 100,
        });
      });

      expect(createCashCut).toHaveBeenCalledWith({
        branch_id: "b1",
        user_id: "u1",
        cash_register_session_id: "s1",
        cut_type: "shift",
        expected_amount: 100,
        counted_amount: 100,
        difference: 0,
        notes: "ok",
        cut_date: expect.any(String),
      });
      expect(insertCashCutDetails).toHaveBeenCalledWith([
        {
          cash_cut_id: "cut1",
          payment_method_id: "pm1",
          expected_amount: 10,
          counted_amount: 10,
          difference: 0,
        },
      ]);
      expect(props.showAppAlert).toHaveBeenCalledWith(
        expect.objectContaining({ type: "success" })
      );
      expect(props.onCutSaved).toHaveBeenCalled();
      expect(result.current.isCutModalOpen).toBe(false);
    });

    it("no inserta detalle cuando no hay metodos", async () => {
      createCashCut.mockResolvedValue({ data: { id: "cut1" }, error: null });

      const { result } = renderDetail();

      await act(async () => {
        await result.current.confirmCut({
          counted: 100,
          notes: "",
          expected: 100,
        });
      });

      expect(insertCashCutDetails).not.toHaveBeenCalled();
    });
  });

  describe("confirmCerrarTurno", () => {
    it("bloquea si no hay turno activo", async () => {
      const { result, props } = renderDetail({ session: null });

      await act(async () => {
        await result.current.confirmCerrarTurno();
      });

      expect(props.setErrorMsg).toHaveBeenCalledWith(
        "No hay turno activo para cerrar."
      );
      expect(props.showAppConfirm).not.toHaveBeenCalled();
    });

    it("pide confirmacion y cierra el turno", async () => {
      closeCashRegisterSession.mockResolvedValue({
        data: { ok: true },
        error: null,
      });
      const { result, props } = renderDetail();

      await act(async () => {
        await result.current.confirmCerrarTurno();
      });

      const confirmArg = props.showAppConfirm.mock.calls[0][0];
      expect(confirmArg.title).toBe("Cerrar turno");

      await act(async () => {
        await confirmArg.onConfirm();
      });

      expect(closeCashRegisterSession).toHaveBeenCalledWith({
        sessionId: "s1",
      });
      expect(props.onShiftClosed).toHaveBeenCalled();
    });

    it("reporta error al cerrar el turno", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      closeCashRegisterSession.mockResolvedValue({
        data: null,
        error: { message: "boom" },
      });
      const { result, props } = renderDetail();

      await act(async () => {
        await result.current.confirmCerrarTurno();
      });

      const confirmArg = props.showAppConfirm.mock.calls[0][0];

      await act(async () => {
        await confirmArg.onConfirm();
      });

      expect(props.onShiftClosed).not.toHaveBeenCalled();
      expect(props.setErrorMsg).toHaveBeenCalledWith("boom");
      expect(props.showAppAlert).toHaveBeenCalledWith(
        expect.objectContaining({ type: "danger" })
      );
      errorSpy.mockRestore();
    });
  });
});
