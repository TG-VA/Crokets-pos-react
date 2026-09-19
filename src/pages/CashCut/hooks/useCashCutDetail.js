import { useState } from "react";

import {
  createCashCut,
  insertCashCutDetails,
  closeCashRegisterSession,
} from "../services/cashCutReportService";

import { fmt, getCancunDateValue } from "../utils/cashCutFormatters";

/**
 * Subflujos con modal del corte de cajero: confirmar corte y cerrar turno.
 * Recibe por parametro solo las dependencias que consume (ISP).
 */
export const useCashCutDetail = ({
  session,
  user,
  isHistoricalView,
  hasShiftCut,
  netPaymentMethodDetails,
  showAppAlert,
  showAppConfirm,
  setErrorMsg,
  onCutSaved,
  onShiftClosed,
}) => {
  const [isCutModalOpen, setIsCutModalOpen] = useState(false);
  const [closingShift, setClosingShift] = useState(false);

  const resetDetailState = () => {
    setIsCutModalOpen(false);
  };

  const openCorteModal = () => {
    setErrorMsg("");

    if (!session?.id || !session?.branch_id) {
      setErrorMsg("No hay turno activo. Abre caja antes de realizar un corte.");
      return;
    }

    if (hasShiftCut) {
      setErrorMsg("Ya existe un corte de cajero para este turno.");
      return;
    }

    setIsCutModalOpen(true);
  };

  const closeCorteModal = () => {
    setIsCutModalOpen(false);
  };

  const confirmCut = async ({ counted, notes, expected }) => {
    setErrorMsg("");

    if (!session?.id || !session?.branch_id) {
      setErrorMsg("No hay turno activo. Abre caja antes de realizar un corte.");
      return;
    }

    if (counted === "" || counted === null || counted === undefined) {
      setErrorMsg("Debes capturar el monto contado en caja.");
      return;
    }

    const diferencia = Number(counted || 0) - Number(expected || 0);

    try {
      const { data: cutData, error: cutError } = await createCashCut({
        branch_id: session.branch_id,
        user_id: user.id,
        cash_register_session_id: session.id,
        cut_type: "shift",
        expected_amount: Number(expected || 0),
        counted_amount: Number(counted || 0),
        difference: diferencia,
        notes: notes || null,
        cut_date: getCancunDateValue(),
      });

      if (cutError) {
        if (cutError.code === "23505") {
          setErrorMsg("Ya existe un corte de cajero para este turno.");
          return;
        }
        throw cutError;
      }

      if (cutData?.id) {
        const details = (netPaymentMethodDetails || []).map((detail) => ({
          cash_cut_id: cutData.id,
          payment_method_id: detail.payment_method_id,
          expected_amount: detail.expected_amount,
          counted_amount: detail.counted_amount,
          difference: detail.difference,
        }));

        if (details.length > 0) {
          const { error: detErr } = await insertCashCutDetails(details);

          if (detErr) throw detErr;
        }
      }

      setIsCutModalOpen(false);

      localStorage.setItem("shift_cut_done", "true");
      window.dispatchEvent(new Event("shift-cut-status-changed"));

      showAppAlert({
        type: "success",
        title: "Corte realizado correctamente",
        message: `Corte realizado exitosamente.\nDiferencia: ${fmt(diferencia)}`,
        confirmText: "Entendido",
      });

      if (onCutSaved) {
        await onCutSaved();
      }
    } catch (err) {
      console.error("Error guardando corte:", err);
      setErrorMsg(err?.message || "Ocurrió un error al guardar el corte.");
      showAppAlert({
        type: "danger",
        title: "No se pudo guardar el corte",
        message: err?.message || "Ocurrió un error al guardar el corte.",
        confirmText: "Entendido",
      });
    }
  };

  const executeCerrarTurno = async () => {
    try {
      setClosingShift(true);

      const { data, error } = await closeCashRegisterSession({
        sessionId: session.id,
      });

      if (error) throw error;

      if (!data?.ok) {
        setErrorMsg(data?.message || "No se puede cerrar turno.");
        return;
      }

      if (onShiftClosed) {
        await onShiftClosed();
      }
    } catch (err) {
      console.error("Error cerrando turno:", err);
      setErrorMsg(err?.message || "Ocurrió un error al cerrar el turno.");
      showAppAlert({
        type: "danger",
        title: "No se pudo cerrar el turno",
        message: err?.message || "Ocurrió un error al cerrar el turno.",
        confirmText: "Entendido",
      });
    } finally {
      setClosingShift(false);
    }
  };

  const confirmCerrarTurno = () => {
    setErrorMsg("");

    if (closingShift) return;

    if (!session?.id || isHistoricalView) {
      setErrorMsg("No hay turno activo para cerrar.");
      return;
    }

    showAppConfirm({
      type: "warning",
      title: "Cerrar turno",
      message: "¿Estás seguro de que deseas cerrar el turno actual?",
      confirmText: "Sí, cerrar turno",
      cancelText: "No, regresar",
      onConfirm: executeCerrarTurno,
    });
  };

  return {
    isCutModalOpen,
    closingShift,
    openCorteModal,
    closeCorteModal,
    confirmCut,
    confirmCerrarTurno,
    resetDetailState,
  };
};
