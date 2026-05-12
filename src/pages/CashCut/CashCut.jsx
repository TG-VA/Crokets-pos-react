import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import NavbarCashCut from "../../components/CashCutComponents/NavbarCashCut/NavbarCashCut";
import CorteModal from "../../components/CashCutComponents/CashCutModal/CashCutModal";

import { buildCashCutText } from "../../utils/cashCutBuilder";
import { printTicket } from "../../utils/ticketPrinter";

import styles from "./CashCut.module.css";

const fmt = (n) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(Number(n) || 0);

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const fmtShortDate = (d) =>
  new Date(d).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

const fmtTime = (d) =>
  new Date(d).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

const getFolio = (saleId) =>
  saleId ? `#${String(saleId).slice(0, 8).toUpperCase()}` : "—";

const SectionCard = ({ icon, title, children }) => (
  <div className={styles.card}>
    <div className={styles.cardHeader}>
      <span className={styles.cardIcon}>{icon}</span>
      <span className={styles.cardTitle}>{title}</span>
    </div>
    <div className={styles.cardBody}>{children}</div>
  </div>
);

const DataRow = ({ label, value, color, bold, borderTop }) => (
  <div className={`${styles.dataRow} ${borderTop ? styles.borderTop : ""}`}>
    <span className={`${styles.dataLabel} ${bold ? styles.bold : ""}`}>
      {label}
    </span>
    <span
      className={`${styles.dataValue} ${bold ? styles.bold : ""}`}
      style={{ color: color || undefined }}
    >
      {value}
    </span>
  </div>
);

const EmptyState = ({ msg }) => (
  <div className={styles.emptyState}>— {msg} —</div>
);

const CancellationItem = ({ item }) => (
  <div className={styles.cancellationItem}>
    <div className={styles.cancellationTop}>
      <div className={styles.cancellationLeft}>
        <div className={styles.cancellationFolio}>
          Folio {getFolio(item.sale_id)}
        </div>

        <div className={styles.cancellationDate}>
          {fmtShortDate(item.canceled_at)} · {fmtTime(item.canceled_at)}
        </div>

        <div className={styles.cancellationReason}>
          Motivo: {item.cancel_reason?.trim() || "Sin motivo registrado"}
        </div>
      </div>

      <div className={styles.cancellationRight}>
        <div className={styles.cancellationAmount}>
          - {fmt(item.refund_amount)}
        </div>

        <div className={styles.cancellationMethod}>
          {item.refund_method_name || "Sin método"}
        </div>
      </div>
    </div>
  </div>
);

const PartialReturnItem = ({ item }) => (
  <div className={styles.cancellationItem}>
    <div className={styles.cancellationTop}>
      <div className={styles.cancellationLeft}>
        <div className={styles.cancellationFolio}>
          Folio {getFolio(item.sale_id)}
        </div>

        <div className={styles.cancellationDate}>
          {fmtShortDate(item.created_at)} · {fmtTime(item.created_at)}
        </div>

        <div className={styles.cancellationReason}>
          Motivo: {item.return_reason?.trim() || "Sin motivo registrado"}
        </div>
      </div>

      <div className={styles.cancellationRight}>
        <div className={styles.cancellationAmount}>
          - {fmt(item.total_refund)}
        </div>

        <div className={styles.cancellationMethod}>
          {item.refund_method_name || "Sin método"}
        </div>
      </div>
    </div>
  </div>
);

const CashCut = () => {
  const navigate = useNavigate();
  const { user, setCashRegistered, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [isCutModalOpen, setIsCutModalOpen] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [closingShift, setClosingShift] = useState(false);
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

  const [entradasEfectivo, setEntradasEfectivo] = useState([]);
  const [salidasEfectivo, setSalidasEfectivo] = useState([]);
  const [totalEntradas, setTotalEntradas] = useState(0);
  const [totalSalidas, setTotalSalidas] = useState(0);
  const realtimeTimerRef = useRef(null);

  const isHistoricalView = selectedCutId !== "current";

  useEffect(() => {
    if (user) fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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

    setEntradasEfectivo([]);
    setSalidasEfectivo([]);
    setTotalEntradas(0);
    setTotalSalidas(0);
  };

  const resetLocalState = () => {
    setIsCutModalOpen(false);
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

    const { data: sessionData, error } = await supabase
      .from("cash_register_sessions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "open")
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("Error obteniendo sesión activa:", error.message);
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
      const { data: branchData, error: branchErr } = await supabase
        .from("branches")
        .select("name")
        .eq("id", sessionData.branch_id)
        .maybeSingle();

      setBranchName(!branchErr && branchData?.name ? branchData.name : "");
    } else {
      setBranchName("");
    }

    return sessionData;
  };

  const fetchCutsHistory = async (branchId) => {
    if (!branchId) {
      setCutsHistory([]);
      return;
    }

    const { data, error } = await supabase
      .from("cash_cuts")
      .select(`
        id,
        branch_id,
        user_id,
        cash_register_session_id,
        cut_type,
        expected_amount,
        counted_amount,
        difference,
        notes,
        cut_date,
        created_at,
        users (
          username
        ),
        cash_register_sessions (
          id,
          branch_id,
          user_id,
          opened_at,
          closed_at,
          opening_amount,
          closing_amount,
          difference,
          status
        )
      `)
      .eq("branch_id", branchId)
      .eq("cut_type", "shift")
      .order("created_at", { ascending: false })
      .limit(300);

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

  const handleChangeCut = async (cutId) => {
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
        const { data, error } = await supabase
          .from("cash_cuts")
          .select(`
            id,
            branch_id,
            user_id,
            cash_register_session_id,
            cut_type,
            expected_amount,
            counted_amount,
            difference,
            notes,
            cut_date,
            created_at,
            users (
              username
            ),
            cash_register_sessions (
              id,
              branch_id,
              user_id,
              opened_at,
              closed_at,
              opening_amount,
              closing_amount,
              difference,
              status
            )
          `)
          .eq("id", cutId)
          .maybeSingle();

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
        const { data: branchData } = await supabase
          .from("branches")
          .select("name")
          .eq("id", cutData.branch_id)
          .maybeSingle();

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

    const { data, error } = await supabase
      .from("cash_cuts")
      .select("*")
      .eq("cash_register_session_id", sessionId)
      .eq("cut_type", "shift")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

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

    let salesQuery = supabase
      .from("sales")
      .select("id, subtotal, tax, total, created_at")
      .eq("branch_id", branchId)
      .eq("user_id", userId)
      .eq("status", "completed")
      .gte("created_at", turnoStart);

    if (endAt) {
      salesQuery = salesQuery.lte("created_at", endAt);
    }

    const { data: salesData, error: salesError } = await salesQuery;

    if (salesError) {
      console.error("Error obteniendo ventas:", salesError.message);
      setErrorMsg("Error obteniendo ventas del turno.");
      return;
    }

    if (salesData && salesData.length > 0) {
      const saleIds = salesData.map((s) => s.id);

      setVentasTotales(
        salesData.reduce((acc, s) => acc + Number(s.total || 0), 0)
      );
      setSubtotal(
        salesData.reduce((acc, s) => acc + Number(s.subtotal || 0), 0)
      );
      setTax(salesData.reduce((acc, s) => acc + Number(s.tax || 0), 0));

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

    let refundQuery = supabase
      .from("canceled_sales")
      .select(`
        id,
        sale_id,
        cancel_reason,
        refund_amount,
        refund_method_id,
        canceled_at,
        user_id,
        branch_id,
        payment_methods (
          id,
          name,
          affects_cash
        )
      `)
      .eq("branch_id", branchId)
      .eq("user_id", userId)
      .gte("canceled_at", turnoStart)
      .order("canceled_at", { ascending: false });

    if (endAt) {
      refundQuery = refundQuery.lte("canceled_at", endAt);
    }

    const { data: refundRows, error: refundErr } = await refundQuery;

    if (refundErr) {
      console.error("Error obteniendo cancelaciones:", refundErr.message);
      setDevolucionesTotales(0);
      setDevolucionesAfectanCaja(0);
      setCancelaciones([]);
    } else {
      const totalRefunds = (refundRows || []).reduce(
        (acc, row) => acc + Number(row.refund_amount || 0),
        0
      );

      const totalRefundsCashImpact = (refundRows || []).reduce((acc, row) => {
        const affectsCash = row.payment_methods?.affects_cash ?? false;
        return affectsCash ? acc + Number(row.refund_amount || 0) : acc;
      }, 0);

      setDevolucionesTotales(totalRefunds);
      setDevolucionesAfectanCaja(totalRefundsCashImpact);

      setCancelaciones(
        (refundRows || []).map((row) => ({
          id: row.id,
          sale_id: row.sale_id,
          cancel_reason: row.cancel_reason,
          refund_amount: Number(row.refund_amount || 0),
          canceled_at: row.canceled_at,
          refund_method_id: row.refund_method_id,
          refund_method_name: row.payment_methods?.name || "Sin método",
          affects_cash: row.payment_methods?.affects_cash ?? false,
        }))
      );
    }

    let partialReturnQuery = supabase
      .from("sale_returns")
      .select(`
        id,
        sale_id,
        return_reason,
        total_refund,
        refund_method_id,
        created_at,
        user_id,
        branch_id,
        payment_methods (
          id,
          name,
          affects_cash
        )
      `)
      .eq("branch_id", branchId)
      .eq("user_id", userId)
      .gte("created_at", turnoStart)
      .order("created_at", { ascending: false });

    if (endAt) {
      partialReturnQuery = partialReturnQuery.lte("created_at", endAt);
    }

    const { data: partialReturnRows, error: partialReturnErr } =
      await partialReturnQuery;

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

    const totalPartialReturns = (partialReturnRows || []).reduce(
      (acc, row) => acc + Number(row.total_refund || 0),
      0
    );

    const totalPartialReturnsCashImpact = (partialReturnRows || []).reduce(
      (acc, row) => {
        const affectsCash = row.payment_methods?.affects_cash ?? false;
        return affectsCash ? acc + Number(row.total_refund || 0) : acc;
      },
      0
    );

    setDevolucionesParcialesTotales(totalPartialReturns);
    setDevolucionesParcialesAfectanCaja(totalPartialReturnsCashImpact);

    setDevolucionesParciales(
      (partialReturnRows || []).map((row) => ({
        id: row.id,
        sale_id: row.sale_id,
        return_reason: row.return_reason,
        total_refund: Number(row.total_refund || 0),
        created_at: row.created_at,
        refund_method_id: row.refund_method_id,
        refund_method_name: row.payment_methods?.name || "Sin método",
        affects_cash: row.payment_methods?.affects_cash ?? false,
      }))
    );
  };

  const fetchVentasPorMetodo = async (saleIds, branchId) => {
    const { data, error } = await supabase
      .from("sale_payments")
      .select("amount, payment_method_id, payment_methods(id, name, affects_cash)")
      .in("sale_id", saleIds)
      .eq("branch_id", branchId);

    if (error) {
      console.error("Error obteniendo pagos:", error.message);
      return;
    }

    const grouped = {};

    data?.forEach((p) => {
      const name = p.payment_methods?.name || "Otro";
      const id = p.payment_methods?.id || null;
      const affectsCash = p.payment_methods?.affects_cash ?? false;

      if (!grouped[name]) {
        grouped[name] = {
          id,
          total: 0,
          affects_cash: affectsCash,
        };
      }

      grouped[name].total += Number(p.amount || 0);
    });

    setVentasPorMetodo(
      Object.entries(grouped).map(([name, val]) => ({
        id: val.id,
        name,
        total: val.total,
        affects_cash: val.affects_cash,
      }))
    );
  };

  const fetchVentasDolares = async (saleIds, branchId) => {
    const { data, error } = await supabase
      .from("sale_payments")
      .select("amount, currency, exchange_rate")
      .in("sale_id", saleIds)
      .eq("branch_id", branchId)
      .eq("currency", "USD");

    if (error) {
      console.error("Error obteniendo ventas en dólares:", error.message);
      setVentasDolaresUsd(0);
      setVentasDolaresMxn(0);
      return;
    }

    const totalUsd = (data || []).reduce(
      (acc, row) => acc + Number(row.amount || 0),
      0
    );

    const totalMxn = (data || []).reduce((acc, row) => {
      const amount = Number(row.amount || 0);
      const exchangeRate = Number(row.exchange_rate || 0);
      return acc + amount * exchangeRate;
    }, 0);

    setVentasDolaresUsd(totalUsd);
    setVentasDolaresMxn(totalMxn);
  };

  const fetchVentasPorDepartamento = async (saleIds) => {
    const { data, error } = await supabase
      .from("sale_details")
      .select("total_price, products(department_id, departments(name))")
      .in("sale_id", saleIds);

    if (error) {
      console.error("Error obteniendo departamentos:", error.message);
      return;
    }

    const grouped = {};

    data?.forEach((item) => {
      const deptName = item.products?.departments?.name || "Sin departamento";
      if (!grouped[deptName]) grouped[deptName] = 0;
      grouped[deptName] += Number(item.total_price || 0);
    });

    setVentasPorDepartamento(
      Object.entries(grouped)
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total)
    );
  };

  const fetchCashMovements = async (sessionId, endAt = null) => {
    if (!sessionId) {
      setEntradasEfectivo([]);
      setSalidasEfectivo([]);
      setTotalEntradas(0);
      setTotalSalidas(0);
      return;
    }

    let query = supabase
      .from("cash_movements")
      .select("id, movement_type, amount, description, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false });

    if (endAt) {
      query = query.lte("created_at", endAt);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error obteniendo movimientos de caja:", error.message);
      setEntradasEfectivo([]);
      setSalidasEfectivo([]);
      setTotalEntradas(0);
      setTotalSalidas(0);
      return;
    }

    const entradas = (data || []).filter((m) => m.movement_type === "entrada");
    const salidas = (data || []).filter((m) => m.movement_type === "salida");

    setEntradasEfectivo(entradas);
    setSalidasEfectivo(salidas);

    setTotalEntradas(
      entradas.reduce((acc, mov) => acc + Number(mov.amount || 0), 0)
    );

    setTotalSalidas(
      salidas.reduce((acc, mov) => acc + Number(mov.amount || 0), 0)
    );
  };

  const getNetPaymentMethodDetails = () => {
    return ventasPorMetodo
      .filter((method) => !!method.id)
      .map((method) => {
        const cancelacionesMetodo = cancelaciones
          .filter((item) => item.refund_method_id === method.id)
          .reduce((acc, item) => acc + Number(item.refund_amount || 0), 0);

        const devolucionesMetodo = devolucionesParciales
          .filter((item) => item.refund_method_id === method.id)
          .reduce((acc, item) => acc + Number(item.total_refund || 0), 0);

        const expectedNetAmount =
          Number(method.total || 0) - cancelacionesMetodo - devolucionesMetodo;

        return {
          payment_method_id: method.id,
          expected_amount: Math.max(expectedNetAmount, 0),
          counted_amount: Math.max(expectedNetAmount, 0),
          difference: 0,
        };
      });
  };

  const handleConfirmCorte = async ({ counted, notes, expected }) => {
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
      const { data: cutData, error: cutError } = await supabase
        .from("cash_cuts")
        .insert({
          branch_id: session.branch_id,
          user_id: user.id,
          cash_register_session_id: session.id,
          cut_type: "shift",
          expected_amount: Number(expected || 0),
          counted_amount: Number(counted || 0),
          difference: diferencia,
          notes: notes || null,
          cut_date: new Date().toISOString().split("T")[0],
        })
        .select()
        .single();

      if (cutError) {
        if (cutError.code === "23505") {
          setErrorMsg("Ya existe un corte de cajero para este turno.");
          return;
        }
        throw cutError;
      }

      if (cutData?.id) {
        const details = getNetPaymentMethodDetails().map((detail) => ({
          cash_cut_id: cutData.id,
          payment_method_id: detail.payment_method_id,
          expected_amount: detail.expected_amount,
          counted_amount: detail.counted_amount,
          difference: detail.difference,
        }));

        if (details.length > 0) {
          const { error: detErr } = await supabase
            .from("cash_cut_details")
            .insert(details);

          if (detErr) throw detErr;
        }
      }

      setCurrentShiftCut(cutData || null);
      setHasShiftCut(true);
      setIsCutModalOpen(false);

      localStorage.setItem("shift_cut_done", "true");
      window.dispatchEvent(new Event("shift-cut-status-changed"));

      alert(`Corte realizado exitosamente.\nDiferencia: ${fmt(diferencia)}`);

      const activeSession = await fetchSession();
      if (activeSession) {
        await fetchCutsHistory(activeSession.branch_id);
        await loadCurrentSession(activeSession);
      }
    } catch (err) {
      console.error("Error guardando corte:", err);
      setErrorMsg(err?.message || "Ocurrió un error al guardar el corte.");
      alert("Ocurrió un error al guardar el corte.");
    }
  };

  const handleCerrarTurno = async () => {
    setErrorMsg("");

    if (closingShift) return;

    if (!session?.id || isHistoricalView) {
      setErrorMsg("No hay turno activo para cerrar.");
      return;
    }

    if (!window.confirm("¿Estás seguro de que deseas cerrar el turno actual?")) {
      return;
    }

    try {
      setClosingShift(true);

      const { data, error } = await supabase.rpc("close_cash_register_session", {
        p_session_id: session.id,
      });

      if (error) throw error;

      if (!data?.ok) {
        setErrorMsg(data?.message || "No se puede cerrar turno.");
        return;
      }

      localStorage.removeItem("shift_cut_done");
      window.dispatchEvent(new Event("shift-cut-status-changed"));

      if (typeof setCashRegistered === "function") {
        setCashRegistered(false);
      }

      await logout();
      resetLocalState();
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Error cerrando turno:", err);
      setErrorMsg(err?.message || "Ocurrió un error al cerrar el turno.");
      alert("Ocurrió un error al cerrar el turno.");
    } finally {
      setClosingShift(false);
    }
  };

  const openingAmount = Number(session?.opening_amount || 0);

  const ventasEfectivo = ventasPorMetodo
    .filter((m) => m.name?.toLowerCase() === "efectivo")
    .reduce((acc, m) => acc + Number(m.total || 0), 0);

  const ventasTerminal = ventasPorMetodo
    .filter((m) => {
      const name = m.name?.toLowerCase() || "";
      return name.includes("terminal") || name.includes("tarjeta");
    })
    .reduce((acc, m) => acc + Number(m.total || 0), 0);

  const ventasTransferencia = ventasPorMetodo
    .filter((m) => {
      const name = m.name?.toLowerCase() || "";
      return name.includes("transferencia");
    })
    .reduce((acc, m) => acc + Number(m.total || 0), 0);

  const descuentoTotal = subtotal + tax - ventasTotales;

  const dineroCaja =
    openingAmount +
    totalEntradas +
    ventasEfectivo +
    ventasDolaresMxn -
    totalSalidas -
    devolucionesAfectanCaja -
    devolucionesParcialesAfectanCaja;

  const expectedDisplay = isHistoricalView
    ? Number(historicalCut?.expected_amount || 0)
    : dineroCaja;

  const countedDisplay = isHistoricalView
    ? Number(historicalCut?.counted_amount || 0)
    : currentShiftCut
    ? Number(currentShiftCut.counted_amount || 0)
    : null;

  const differenceDisplay = isHistoricalView
    ? Number(historicalCut?.difference || 0)
    : currentShiftCut
    ? Number(currentShiftCut.difference || 0)
    : null;

  const now = new Date();

  const handlePrint = async () => {
    try {
      const text = buildCashCutText({
        branchName: branchName || "SUCURSAL",
        username: username || "USUARIO",
        sessionId: session?.id
          ? `#${session.id.slice(0, 8).toUpperCase()}`
          : "—",
        openedAt: session?.opened_at || new Date(),
        closedAt: session?.closed_at || null,

        cutCreatedAt:
          historicalCut?.created_at || currentShiftCut?.created_at || null,
        expectedAmount: expectedDisplay,
        countedAmount: countedDisplay,
        difference: differenceDisplay,
        notes: historicalCut?.notes || currentShiftCut?.notes || null,
        isHistorical: isHistoricalView,

        ventasTotales,
        dineroCaja: expectedDisplay,
        ventasTerminal,
        ventasTransferencia,

        openingAmount,
        totalEntradas,
        ventasEfectivo,
        ventasDolaresUsd,
        ventasDolaresMxn,
        totalSalidas,
        devolucionesCaja: devolucionesAfectanCaja,
        devolucionesParcialesCaja: devolucionesParcialesAfectanCaja,

        ventasPorMetodo,

        entradas: entradasEfectivo,
        salidas: salidasEfectivo,

        subtotal,
        discount: descuentoTotal,
        tax,

        cancelaciones,
        devolucionesParciales,
      });

      const result = await printTicket(text);

      if (!result?.success) {
        throw new Error(result?.message || "No se pudo generar el corte.");
      }

      alert("Corte generado correctamente.");
    } catch (error) {
      console.error("Error imprimiendo corte:", error);
      alert(error.message || "No se pudo generar el corte.");
    }
  };

  return (
    <div className={styles.container}>
      <Navbar />

      <NavbarCashCut
        cutsHistory={cutsHistory}
        selectedCutId={selectedCutId}
        onChangeCut={handleChangeCut}
        isHistoricalView={isHistoricalView}
        onCorteCajero={() => {
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
        }}
        onImprimir={handlePrint}
        onCerrarTurno={handleCerrarTurno}
        disableCorteCajero={!session?.id || hasShiftCut || isHistoricalView}
        disableCerrarTurno={
          !session?.id || !hasShiftCut || closingShift || isHistoricalView
        }
      />

      <div className={styles.pageContent}>
        {errorMsg && <div className={styles.errorMsg}>{errorMsg}</div>}

        {!isHistoricalView && hasShiftCut && currentShiftCut && (
          <div className={styles.cutDoneAlert}>
            <strong>✅ Corte de cajero realizado.</strong>
            <span> Pendiente cerrar turno.</span>
          </div>
        )}

        {loading ? (
          <div className={styles.fullLoading}>
            <div className={styles.loadingSpinner} />
            Cargando datos del turno...
          </div>
        ) : (
          <>
            {isHistoricalView && historicalCut && (
              <div className={styles.errorMsg}>
                Estás viendo un corte histórico. Esta vista es solo lectura.
              </div>
            )}

            <div className={styles.heroCard}>
              <div className={styles.heroLeft}>
                <span className={styles.heroLabel}>
                  {isHistoricalView
                    ? "CORTE HISTÓRICO"
                    : hasShiftCut
                    ? "TURNO CORTADO"
                    : "VENTAS TOTALES DEL TURNO"}
                </span>

                <span className={styles.heroAmount}>{fmt(ventasTotales)}</span>

                <span className={styles.heroDate}>
                  {isHistoricalView
                    ? `${fmtDate(historicalCut?.created_at || now)} · ${fmtTime(
                        historicalCut?.created_at || now
                      )}`
                    : `${fmtDate(now)} · ${
                        session?.opened_at ? fmtTime(session.opened_at) : "--:--"
                      } - ${fmtTime(now)}`}
                </span>

                <div className={styles.sessionInfoHero}>
                  <div className={styles.sessionRow}>
                    <span className={styles.sessionLabel}>Sucursal:</span>
                    <span className={styles.sessionValue}>
                      {branchName ? branchName.toUpperCase() : "—"}
                    </span>
                  </div>

                  <div className={styles.sessionRow}>
                    <span className={styles.sessionLabel}>Cajero:</span>
                    <span className={styles.sessionValue}>{username || "—"}</span>
                  </div>

                  <div className={styles.sessionRow}>
                    <span className={styles.sessionLabel}>Turno:</span>
                    <span className={styles.sessionValue}>
                      {session?.id
                        ? `#${session.id.slice(0, 8).toUpperCase()}`
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.heroStats}>
                <div className={styles.heroStat}>
                  <span className={styles.heroStatLabel}>💵 Ventas en efectivo</span>
                  <span className={styles.heroStatValue}>{fmt(ventasEfectivo)}</span>
                </div>

                <div className={styles.heroStat}>
                  <span className={styles.heroStatLabel}>💳 Terminal</span>
                  <span className={styles.heroStatValue}>{fmt(ventasTerminal)}</span>
                </div>

                <div className={styles.heroStat}>
                  <span className={styles.heroStatLabel}>🏦 Transferencia</span>
                  <span className={styles.heroStatValue}>
                    {fmt(ventasTransferencia)}
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.grid}>
              {(isHistoricalView || currentShiftCut) && (
                <SectionCard icon="📌" title="INFORMACIÓN DEL CORTE">
                  <DataRow
                    label="Fecha del corte"
                    value={`${fmtShortDate(
                      historicalCut?.created_at || currentShiftCut?.created_at
                    )} · ${fmtTime(
                      historicalCut?.created_at || currentShiftCut?.created_at
                    )}`}
                  />
                  <DataRow label="Monto esperado" value={fmt(expectedDisplay)} bold />
                  <DataRow label="Monto contado" value={fmt(countedDisplay)} bold />
                  <DataRow
                    label="Diferencia"
                    value={fmt(differenceDisplay)}
                    color={differenceDisplay < 0 ? "#c62828" : "#2e7d32"}
                    bold
                    borderTop
                  />
                  <DataRow
                    label="Notas"
                    value={
                      historicalCut?.notes || currentShiftCut?.notes || "Sin notas"
                    }
                  />
                </SectionCard>
              )}

              <SectionCard icon="💰" title="DINERO EN CAJA">
                <DataRow label="Fondo de caja inicial" value={fmt(openingAmount)} />
                <DataRow
                  label="Entradas de efectivo"
                  value={`+ ${fmt(totalEntradas)}`}
                  color="#2e7d32"
                />
                <DataRow
                  label="Ventas en efectivo"
                  value={`+ ${fmt(ventasEfectivo)}`}
                  color="#2e7d32"
                />
                <DataRow
                  label="Ventas en dólares"
                  value={`+ USD ${ventasDolaresUsd.toFixed(2)}`}
                  color="#2e7d32"
                />
                <DataRow
                  label="Equivalente en MXN"
                  value={`+ ${fmt(ventasDolaresMxn)}`}
                  color="#2e7d32"
                />
                <DataRow
                  label="Salidas de efectivo"
                  value={`- ${fmt(totalSalidas)}`}
                  color="#c62828"
                />
                <DataRow
                  label="Devoluciones que afectan caja"
                  value={`- ${fmt(devolucionesAfectanCaja)}`}
                  color="#c62828"
                />
                <DataRow
                  label="Dev. parciales que afectan caja"
                  value={`- ${fmt(devolucionesParcialesAfectanCaja)}`}
                  color="#c62828"
                />
                <DataRow
                  label={isHistoricalView || hasShiftCut ? "Total esperado" : "Total en caja"}
                  value={fmt(expectedDisplay)}
                  bold
                  borderTop
                />
              </SectionCard>

              <SectionCard icon="💳" title="VENTAS POR MÉTODO DE PAGO">
                {ventasPorMetodo.length === 0 ? (
                  <EmptyState msg="No hubo ventas en este turno" />
                ) : (
                  <>
                    {ventasPorMetodo.map((m) => {
                      const isDollars =
                        m.name === "Dólares" || m.name === "Dolares";

                      return (
                        <React.Fragment key={m.name}>
                          <DataRow
                            label={m.name}
                            value={
                              isDollars
                                ? `+ USD ${ventasDolaresUsd.toFixed(2)}`
                                : `+ ${fmt(m.total)}`
                            }
                            color="#2e7d32"
                          />
                          {isDollars && ventasDolaresUsd > 0 && (
                            <DataRow
                              label="Equivalente en MXN"
                              value={`+ ${fmt(ventasDolaresMxn)}`}
                              color="#2e7d32"
                            />
                          )}
                        </React.Fragment>
                      );
                    })}

                    {devolucionesTotales > 0 && (
                      <DataRow
                        label="Devoluciones totales"
                        value={`- ${fmt(devolucionesTotales)}`}
                        color="#c62828"
                      />
                    )}

                    {devolucionesParcialesTotales > 0 && (
                      <DataRow
                        label="Devoluciones parciales"
                        value={`- ${fmt(devolucionesParcialesTotales)}`}
                        color="#c62828"
                      />
                    )}

                    <DataRow label="Total" value={fmt(ventasTotales)} bold borderTop />
                  </>
                )}
              </SectionCard>

              <SectionCard icon="⬇️" title="ENTRADAS DE EFECTIVO">
                {entradasEfectivo.length === 0 ? (
                  <EmptyState msg="No hubo entradas de efectivo" />
                ) : (
                  <>
                    {entradasEfectivo.map((mov) => (
                      <DataRow
                        key={mov.id}
                        label={`${
                          mov.description || "Entrada"
                        } · ${fmtTime(mov.created_at)}`}
                        value={`+ ${fmt(mov.amount)}`}
                        color="#2e7d32"
                      />
                    ))}
                    <DataRow
                      label="Total entradas"
                      value={fmt(totalEntradas)}
                      bold
                      borderTop
                    />
                  </>
                )}
              </SectionCard>

              <SectionCard icon="⬆️" title="SALIDAS DE EFECTIVO">
                {salidasEfectivo.length === 0 ? (
                  <EmptyState msg="No hubo salidas de efectivo" />
                ) : (
                  <>
                    {salidasEfectivo.map((mov) => (
                      <DataRow
                        key={mov.id}
                        label={`${
                          mov.description || "Salida"
                        } · ${fmtTime(mov.created_at)}`}
                        value={`- ${fmt(mov.amount)}`}
                        color="#c62828"
                      />
                    ))}
                    <DataRow
                      label="Total salidas"
                      value={fmt(totalSalidas)}
                      bold
                      borderTop
                    />
                  </>
                )}
              </SectionCard>

              <SectionCard icon="📦" title="VENTAS POR DEPARTAMENTO">
                {ventasPorDepartamento.length === 0 ? (
                  <EmptyState msg="No hay datos de departamentos" />
                ) : (
                  <>
                    {ventasPorDepartamento.map((dep) => (
                      <DataRow key={dep.name} label={dep.name} value={fmt(dep.total)} />
                    ))}
                    <DataRow
                      label="Total"
                      value={fmt(
                        ventasPorDepartamento.reduce((a, d) => a + d.total, 0)
                      )}
                      bold
                      borderTop
                    />
                  </>
                )}
              </SectionCard>

              <SectionCard icon="🧾" title="RESUMEN DE VENTAS">
                <DataRow label="Subtotal registrado" value={fmt(subtotal)} />
                <DataRow
                  label="Descuento aplicado"
                  value={`- ${fmt(descuentoTotal)}`}
                  color="#c62828"
                />
                <DataRow
                  label="Impuestos registrados"
                  value={fmt(tax)}
                  color="#1976d2"
                />
                <DataRow label="Total vendido" value={fmt(ventasTotales)} bold borderTop />
              </SectionCard>

              <SectionCard icon="↩️" title="CANCELACIONES">
                {cancelaciones.length === 0 ? (
                  <EmptyState msg="No hubo cancelaciones en este turno" />
                ) : (
                  <>
                    {cancelaciones.map((c) => (
                      <CancellationItem key={c.id} item={c} />
                    ))}

                    <DataRow
                      label="Total cancelado"
                      value={fmt(devolucionesTotales)}
                      bold
                      borderTop
                    />
                  </>
                )}
              </SectionCard>

              <SectionCard icon="↩️" title="DEVOLUCIONES PARCIALES">
                {devolucionesParciales.length === 0 ? (
                  <EmptyState msg="No hubo devoluciones parciales en este turno" />
                ) : (
                  <>
                    {devolucionesParciales.map((item) => (
                      <PartialReturnItem key={item.id} item={item} />
                    ))}

                    <DataRow
                      label="Total devoluciones parciales"
                      value={fmt(devolucionesParcialesTotales)}
                      bold
                      borderTop
                    />
                  </>
                )}
              </SectionCard>
            </div>

            <div className={styles.footer}>
              CROKETS · Sistema POS · Generado el {fmtDate(now)} a las {fmtTime(now)}
            </div>
          </>
        )}
      </div>

      <CorteModal
        isOpen={isCutModalOpen}
        onClose={() => setIsCutModalOpen(false)}
        onConfirm={handleConfirmCorte}
        expectedAmount={dineroCaja}
      />

      <Footer />
    </div>
  );
};

export default CashCut;