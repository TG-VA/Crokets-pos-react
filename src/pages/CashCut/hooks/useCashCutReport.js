import { useEffect, useMemo, useRef, useState } from "react";

import { supabase } from "../../../lib/supabaseClient";

import {
  calculateSalesTotals,
  calculateCancellations,
  calculatePartialReturns,
  calculateRewardSummary,
  calculateMethodTotals,
  calculateRefundsByMethod,
  calculateMethodNetTotals,
  calculateDiscountTotal,
  calculateNetSales,
  calculateDepartmentsTotal,
  calculateCashInRegister,
  resolveCutDisplay,
  buildNetPaymentMethodDetails,
  groupPaymentsByMethod,
  calculateDollarTotals,
  groupSalesByDepartment,
  splitCashMovements,
  fetchActiveSession,
  fetchBranchName,
  fetchCutsHistory as fetchCutsHistoryService,
  fetchExistingShiftCut,
  fetchSalesByShift,
  fetchCancellationsByShift,
  fetchPartialReturnsByShift,
  fetchRewardRedemptions,
  fetchPaymentsByMethod,
  fetchUsdPayments,
  fetchDepartmentSales,
  fetchCashMovementsBySession,
  fetchHistoricalCutDetail,
} from "../services/cashCutReportService";

import { fmtShortDate, fmtTime } from "../utils/cashCutFormatters";

const createEmptyRewardSummary = () => ({
  canjesAplicados: 0,
  puntosUsados: 0,
  canjesRevertidos: 0,
  puntosDevueltos: 0,
});

/**
 * Ciclo de vida y datos de la pagina principal del corte de cajero.
 */
export const useCashCutReport = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [hasShiftCut, setHasShiftCut] = useState(false);
  const [currentShiftCut, setCurrentShiftCut] = useState(null);

  const [selectedCutId, setSelectedCutId] = useState("current");
  const [cutsHistory, setCutsHistory] = useState([]);
  const [historicalCut, setHistoricalCut] = useState(null);

  const [session, setSession] = useState(null);
  const [branchName, setBranchName] = useState("");
  const [username, setUsername] = useState("");

  const [ventasTotales, setVentasTotales] = useState(0);
  const [ventasPorMetodo, setVentasPorMetodo] = useState([]);
  const [ventasPorDepartamento, setVentasPorDepartamento] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [tax, setTax] = useState(0);

  const [ventasDolaresUsd, setVentasDolaresUsd] = useState(0);
  const [ventasDolaresMxn, setVentasDolaresMxn] = useState(0);

  const [devolucionesTotales, setDevolucionesTotales] = useState(0);
  const [devolucionesAfectanCaja, setDevolucionesAfectanCaja] = useState(0);
  const [cancelaciones, setCancelaciones] = useState([]);

  const [devolucionesParcialesTotales, setDevolucionesParcialesTotales] =
    useState(0);
  const [devolucionesParcialesAfectanCaja, setDevolucionesParcialesAfectanCaja] =
    useState(0);
  const [devolucionesParciales, setDevolucionesParciales] = useState([]);

  const [rewardSummary, setRewardSummary] = useState(createEmptyRewardSummary);

  const [entradasEfectivo, setEntradasEfectivo] = useState([]);
  const [salidasEfectivo, setSalidasEfectivo] = useState([]);
  const [totalEntradas, setTotalEntradas] = useState(0);
  const [totalSalidas, setTotalSalidas] = useState(0);

  const realtimeTimerRef = useRef(null);

  const isHistoricalView = selectedCutId !== "current";

  const getDisplayUsername = (authUser = user) => {
    return authUser?.user_metadata?.username
      ? authUser.user_metadata.username.toUpperCase()
      : authUser?.email?.split("@")[0].toUpperCase() || "USUARIO";
  };

  const getCutLabel = (cut) => {
    const cutDate = cut.created_at ? fmtShortDate(cut.created_at) : "Sin fecha";
    const cutTime = cut.created_at ? fmtTime(cut.created_at) : "--:--";
    const cashier =
      cut.users?.username ||
      cut.username ||
      (cut.user_id ? String(cut.user_id).slice(0, 8).toUpperCase() : "USUARIO");

    const sessionFolio = cut.cash_register_session_id
      ? `#${String(cut.cash_register_session_id).slice(0, 8).toUpperCase()}`
      : "#SIN-TURNO";

    return `Corte ${sessionFolio} · ${cutDate} · ${cutTime} · ${String(
      cashier
    ).toUpperCase()}`;
  };

  const resetSalesState = () => {
    setVentasTotales(0);
    setSubtotal(0);
    setTax(0);
    setVentasPorMetodo([]);
    setVentasPorDepartamento([]);
    setVentasDolaresUsd(0);
    setVentasDolaresMxn(0);

    setDevolucionesTotales(0);
    setDevolucionesAfectanCaja(0);
    setCancelaciones([]);

    setDevolucionesParcialesTotales(0);
    setDevolucionesParcialesAfectanCaja(0);
    setDevolucionesParciales([]);

    setRewardSummary(createEmptyRewardSummary());

    setEntradasEfectivo([]);
    setSalidasEfectivo([]);
    setTotalEntradas(0);
    setTotalSalidas(0);
  };

  const resetLocalState = () => {
    setErrorMsg("");
    setSession(null);
    setBranchName("");
    setUsername("");
    setHasShiftCut(false);
    setCurrentShiftCut(null);
    setSelectedCutId("current");
    setHistoricalCut(null);
    resetSalesState();
  };

  const fetchAllData = async () => {
    setLoading(true);
    setErrorMsg("");

    try {
      const sessionData = await fetchSession();

      if (sessionData) {
        await fetchCutsHistory(sessionData.branch_id);
        await loadCurrentSession(sessionData);
      } else {
        resetSalesState();
        setHasShiftCut(false);
        setCurrentShiftCut(null);
      }
    } catch (err) {
      console.error("Error cargando datos del corte:", err);
      setErrorMsg("No se pudieron cargar los datos del turno.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSession = async () => {
    setUsername(getDisplayUsername());

    const { data: sessionData, error } = await fetchActiveSession({
      userId: user.id,
    });

    if (error) {
      console.error("Error obteniendo sesión activa:", error.message);
      setSession(null);
      setBranchName("");
      return null;
    }

    if (!sessionData) {
      setSession(null);
      setBranchName("");
      return null;
    }

    setSession(sessionData);

    if (sessionData.branch_id) {
      const { data: branchData, error: branchErr } = await fetchBranchName({
        branchId: sessionData.branch_id,
      });

      setBranchName(!branchErr && branchData?.name ? branchData.name : "");
    } else {
      setBranchName("");
    }

    return sessionData;
  };

  const fetchCutsHistory = async (branchId) => {
    const { data, error } = await fetchCutsHistoryService({ branchId });

    if (error) {
      console.error("Error obteniendo historial de cortes:", error.message);
      setCutsHistory([]);
      return;
    }

    setCutsHistory(
      (data || []).map((cut) => ({
        ...cut,
        label: getCutLabel(cut),
      }))
    );
  };

  const loadCurrentSession = async (sessionData) => {
    setSelectedCutId("current");
    setHistoricalCut(null);
    setUsername(getDisplayUsername());
    setSession(sessionData);
    resetSalesState();

    await fetchSalesData({
      sessionData,
      userId: user.id,
      endAt: null,
    });

    await fetchCashMovements(sessionData.id);
    await fetchExistingCuts(sessionData.id);
  };

  const changeSelectedCut = async (cutId) => {
    setErrorMsg("");
    setSelectedCutId(cutId);

    if (cutId === "current") {
      const activeSession = await fetchSession();
      if (activeSession) {
        await loadCurrentSession(activeSession);
      }
      return;
    }

    await loadHistoricalCut(cutId);
  };

  const loadHistoricalCut = async (cutId) => {
    setLoading(true);

    try {
      const found = cutsHistory.find((cut) => cut.id === cutId);

      let cutData = found;

      if (!cutData) {
        const { data, error } = await fetchHistoricalCutDetail({ cutId });

        if (error) throw error;
        cutData = data;
      }

      if (!cutData) {
        setErrorMsg("No se encontró el corte seleccionado.");
        return;
      }

      const historicalSession = cutData.cash_register_sessions;

      if (!historicalSession?.id) {
        setErrorMsg("El corte seleccionado no tiene turno relacionado.");
        return;
      }

      resetSalesState();

      setHistoricalCut(cutData);
      setCurrentShiftCut(null);
      setSession(historicalSession);
      setUsername(
        cutData.users?.username
          ? String(cutData.users.username).toUpperCase()
          : cutData.user_id
          ? String(cutData.user_id).slice(0, 8).toUpperCase()
          : "USUARIO"
      );

      if (cutData.branch_id) {
        const { data: branchData } = await fetchBranchName({
          branchId: cutData.branch_id,
        });

        setBranchName(branchData?.name || branchName || "");
      }

      await fetchSalesData({
        sessionData: historicalSession,
        userId: cutData.user_id,
        endAt: cutData.created_at,
      });

      await fetchCashMovements(historicalSession.id, cutData.created_at);
      setHasShiftCut(true);
    } catch (err) {
      console.error("Error cargando corte histórico:", err);
      setErrorMsg("No se pudo cargar el corte histórico.");
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingCuts = async (sessionId) => {
    if (!sessionId) {
      setHasShiftCut(false);
      setCurrentShiftCut(null);
      return;
    }

    const { data, error } = await fetchExistingShiftCut({ sessionId });

    if (error) {
      console.error("Error obteniendo corte existente:", error.message);
      setHasShiftCut(false);
      setCurrentShiftCut(null);
      return;
    }

    setHasShiftCut(!!data);
    setCurrentShiftCut(data || null);

    if (data) {
      localStorage.setItem("shift_cut_done", "true");
      window.dispatchEvent(new Event("shift-cut-status-changed"));
    }
  };

  const fetchSalesData = async ({ sessionData, userId, endAt = null }) => {
    const turnoStart = sessionData.opened_at;
    const branchId = sessionData.branch_id;

    if (!turnoStart || !branchId) {
      setErrorMsg("El turno no tiene sucursal o fecha de apertura válidas.");
      return;
    }

    let saleIdsForTotals = [];

    const { data: salesData, error: salesError } = await fetchSalesByShift({
      branchId,
      userId,
      startAt: turnoStart,
      endAt,
    });

    if (salesError) {
      console.error("Error obteniendo ventas:", salesError.message);
      setErrorMsg("Error obteniendo ventas del turno.");
      return;
    }

    if (salesData && salesData.length > 0) {
      const saleIds = salesData.map((s) => s.id);
      saleIdsForTotals = saleIds;

      const totals = calculateSalesTotals(salesData);

      setVentasTotales(totals.ventasTotales);
      setSubtotal(totals.subtotal);
      setTax(totals.tax);

      await fetchVentasPorMetodo(saleIds, branchId);
      await fetchVentasPorDepartamento(saleIds);
      await fetchVentasDolares(saleIds, branchId);
    } else {
      setVentasTotales(0);
      setSubtotal(0);
      setTax(0);
      setVentasPorMetodo([]);
      setVentasPorDepartamento([]);
      setVentasDolaresUsd(0);
      setVentasDolaresMxn(0);
    }

    const { data: refundRows, error: refundErr } =
      await fetchCancellationsByShift({
        branchId,
        userId,
        startAt: turnoStart,
        endAt,
      });

    if (refundErr) {
      console.error("Error obteniendo cancelaciones:", refundErr.message);
      setDevolucionesTotales(0);
      setDevolucionesAfectanCaja(0);
      setCancelaciones([]);
    } else {
      const {
        devolucionesTotales,
        devolucionesAfectanCaja,
        cancelaciones: cancelacionesRows,
      } = calculateCancellations(refundRows || []);

      setDevolucionesTotales(devolucionesTotales);
      setDevolucionesAfectanCaja(devolucionesAfectanCaja);
      setCancelaciones(cancelacionesRows);
    }

    const { data: partialReturnRows, error: partialReturnErr } =
      await fetchPartialReturnsByShift({
        branchId,
        userId,
        startAt: turnoStart,
        endAt,
      });

    if (partialReturnErr) {
      console.error(
        "Error obteniendo devoluciones parciales:",
        partialReturnErr.message
      );
      setDevolucionesParcialesTotales(0);
      setDevolucionesParcialesAfectanCaja(0);
      setDevolucionesParciales([]);
      return;
    }

    const {
      devolucionesParcialesTotales,
      devolucionesParcialesAfectanCaja,
      devolucionesParciales: devolucionesParcialesRows,
    } = calculatePartialReturns(partialReturnRows || []);

    setDevolucionesParcialesTotales(devolucionesParcialesTotales);
    setDevolucionesParcialesAfectanCaja(devolucionesParcialesAfectanCaja);
    setDevolucionesParciales(devolucionesParcialesRows);

    const rewardSaleIds = [
      ...saleIdsForTotals,
      ...(refundRows || []).map((row) => row.sale_id),
      ...(partialReturnRows || []).map((row) => row.sale_id),
    ];

    await fetchRewardSummary(rewardSaleIds);
  };

  const fetchRewardSummary = async (saleIds = []) => {
    const { data, error } = await fetchRewardRedemptions({ saleIds });

    if (error) {
      console.error("Error obteniendo recompensas del corte:", error.message);
      setRewardSummary(calculateRewardSummary([]));
      return;
    }

    setRewardSummary(calculateRewardSummary(data || []));
  };

  const fetchVentasPorMetodo = async (saleIds, branchId) => {
    const { data, error } = await fetchPaymentsByMethod({ saleIds, branchId });

    if (error) {
      console.error("Error obteniendo pagos:", error.message);
      return;
    }

    setVentasPorMetodo(groupPaymentsByMethod(data || []));
  };

  const fetchVentasDolares = async (saleIds, branchId) => {
    const { data, error } = await fetchUsdPayments({ saleIds, branchId });

    if (error) {
      console.error("Error obteniendo ventas en dólares:", error.message);
      setVentasDolaresUsd(0);
      setVentasDolaresMxn(0);
      return;
    }

    const dollarTotals = calculateDollarTotals(data || []);

    setVentasDolaresUsd(dollarTotals.ventasDolaresUsd);
    setVentasDolaresMxn(dollarTotals.ventasDolaresMxn);
  };

  const fetchVentasPorDepartamento = async (saleIds) => {
    const { data, error } = await fetchDepartmentSales({ saleIds });

    if (error) {
      console.error("Error obteniendo departamentos:", error.message);
      return;
    }

    setVentasPorDepartamento(groupSalesByDepartment(data || []));
  };

  const fetchCashMovements = async (sessionId, endAt = null) => {
    if (!sessionId) {
      setEntradasEfectivo([]);
      setSalidasEfectivo([]);
      setTotalEntradas(0);
      setTotalSalidas(0);
      return;
    }

    const { data, error } = await fetchCashMovementsBySession({
      sessionId,
      endAt,
    });

    if (error) {
      console.error("Error obteniendo movimientos de caja:", error.message);
      setEntradasEfectivo([]);
      setSalidasEfectivo([]);
      setTotalEntradas(0);
      setTotalSalidas(0);
      return;
    }

    const movements = splitCashMovements(data || []);

    setEntradasEfectivo(movements.entradas);
    setSalidasEfectivo(movements.salidas);
    setTotalEntradas(movements.totalEntradas);
    setTotalSalidas(movements.totalSalidas);
  };

  const refreshAfterCut = async () => {
    const activeSession = await fetchSession();

    if (activeSession) {
      await fetchCutsHistory(activeSession.branch_id);
      await loadCurrentSession(activeSession);
    }
  };

  useEffect(() => {
    if (user?.id) fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !session?.id || !session?.branch_id || isHistoricalView) {
      return;
    }

    const refreshRealtimeData = () => {
      if (realtimeTimerRef.current) {
        clearTimeout(realtimeTimerRef.current);
      }

      realtimeTimerRef.current = setTimeout(async () => {
        try {
          const activeSession = await fetchSession();

          if (!activeSession?.id) {
            resetSalesState();
            setHasShiftCut(false);
            setCurrentShiftCut(null);
            return;
          }

          if (activeSession.id !== session.id) {
            await loadCurrentSession(activeSession);
            await fetchCutsHistory(activeSession.branch_id);
            return;
          }

          await fetchCutsHistory(activeSession.branch_id);

          await fetchSalesData({
            sessionData: activeSession,
            userId: user.id,
            endAt: null,
          });

          await fetchCashMovements(activeSession.id);
          await fetchExistingCuts(activeSession.id);
        } catch (err) {
          console.error("Error actualizando corte en tiempo real:", err);
        }
      }, 700);
    };

    const channel = supabase
      .channel(`cashcut-realtime-${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sales",
          filter: `branch_id=eq.${session.branch_id}`,
        },
        refreshRealtimeData
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sale_payments",
          filter: `branch_id=eq.${session.branch_id}`,
        },
        refreshRealtimeData
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sale_details",
          filter: `branch_id=eq.${session.branch_id}`,
        },
        refreshRealtimeData
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cash_movements",
          filter: `session_id=eq.${session.id}`,
        },
        refreshRealtimeData
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "canceled_sales",
          filter: `branch_id=eq.${session.branch_id}`,
        },
        refreshRealtimeData
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sale_returns",
          filter: `branch_id=eq.${session.branch_id}`,
        },
        refreshRealtimeData
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cash_cuts",
          filter: `branch_id=eq.${session.branch_id}`,
        },
        refreshRealtimeData
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cash_register_sessions",
          filter: `id=eq.${session.id}`,
        },
        refreshRealtimeData
      )
      .subscribe();

    return () => {
      if (realtimeTimerRef.current) {
        clearTimeout(realtimeTimerRef.current);
      }

      supabase.removeChannel(channel);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, session?.id, session?.branch_id, isHistoricalView]);

  const openingAmount = Number(session?.opening_amount || 0);

  const { ventasEfectivo, ventasTerminal, ventasTransferencia } = useMemo(
    () => calculateMethodTotals(ventasPorMetodo),
    [ventasPorMetodo]
  );

  const {
    devolucionesEfectivoMetodo,
    devolucionesTerminalMetodo,
    devolucionesTransferenciaMetodo,
  } = useMemo(
    () => calculateRefundsByMethod(cancelaciones, devolucionesParciales),
    [cancelaciones, devolucionesParciales]
  );

  const { ventasEfectivoNeto, ventasTerminalNeto, ventasTransferenciaNeto } =
    useMemo(
      () =>
        calculateMethodNetTotals({
          ventasEfectivo,
          ventasTerminal,
          ventasTransferencia,
          devolucionesEfectivoMetodo,
          devolucionesTerminalMetodo,
          devolucionesTransferenciaMetodo,
        }),
      [
        ventasEfectivo,
        ventasTerminal,
        ventasTransferencia,
        devolucionesEfectivoMetodo,
        devolucionesTerminalMetodo,
        devolucionesTransferenciaMetodo,
      ]
    );

  const descuentoTotal = useMemo(
    () => calculateDiscountTotal({ subtotal, tax, ventasTotales }),
    [subtotal, tax, ventasTotales]
  );

  const ventasNetas = useMemo(
    () =>
      calculateNetSales({
        ventasTotales,
        devolucionesTotales,
        devolucionesParcialesTotales,
      }),
    [ventasTotales, devolucionesTotales, devolucionesParcialesTotales]
  );

  const departamentosTotal = useMemo(
    () => calculateDepartmentsTotal(ventasPorDepartamento),
    [ventasPorDepartamento]
  );

  const dineroCaja = useMemo(
    () =>
      calculateCashInRegister({
        openingAmount,
        totalEntradas,
        ventasEfectivo,
        ventasDolaresMxn,
        totalSalidas,
        devolucionesAfectanCaja,
        devolucionesParcialesAfectanCaja,
      }),
    [
      openingAmount,
      totalEntradas,
      ventasEfectivo,
      ventasDolaresMxn,
      totalSalidas,
      devolucionesAfectanCaja,
      devolucionesParcialesAfectanCaja,
    ]
  );

  const netPaymentMethodDetails = useMemo(
    () =>
      buildNetPaymentMethodDetails({
        ventasPorMetodo,
        cancelaciones,
        devolucionesParciales,
      }),
    [ventasPorMetodo, cancelaciones, devolucionesParciales]
  );

  const { expectedDisplay, countedDisplay, differenceDisplay } = useMemo(
    () =>
      resolveCutDisplay({
        isHistoricalView,
        historicalCut,
        currentShiftCut,
        dineroCaja,
      }),
    [isHistoricalView, historicalCut, currentShiftCut, dineroCaja]
  );

  return {
    loading,
    errorMsg,
    setErrorMsg,
    session,
    branchName,
    username,
    cutsHistory,
    selectedCutId,
    isHistoricalView,
    historicalCut,
    currentShiftCut,
    hasShiftCut,
    ventasTotales,
    ventasPorMetodo,
    ventasPorDepartamento,
    subtotal,
    tax,
    ventasDolaresUsd,
    ventasDolaresMxn,
    devolucionesTotales,
    devolucionesAfectanCaja,
    cancelaciones,
    devolucionesParcialesTotales,
    devolucionesParcialesAfectanCaja,
    devolucionesParciales,
    rewardSummary,
    entradasEfectivo,
    salidasEfectivo,
    totalEntradas,
    totalSalidas,
    openingAmount,
    ventasEfectivo,
    ventasTerminal,
    ventasTransferencia,
    ventasEfectivoNeto,
    ventasTerminalNeto,
    ventasTransferenciaNeto,
    descuentoTotal,
    ventasNetas,
    departamentosTotal,
    dineroCaja,
    expectedDisplay,
    countedDisplay,
    differenceDisplay,
    netPaymentMethodDetails,
    changeSelectedCut,
    refreshAfterCut,
    resetLocalState,
  };
};
