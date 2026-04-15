import React, { useState, useEffect } from "react";
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

// ─── Sub-componentes ──────────────────────────────────────────────────────────
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

const CancellationItem = ({ item }) => {
  return (
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
};

const PartialReturnItem = ({ item }) => {
  return (
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
};

// ─── Página Principal ─────────────────────────────────────────────────────────
const CashCut = () => {
  const navigate = useNavigate();
  const { user, setCashRegistered, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(null);

  // UX
  const [errorMsg, setErrorMsg] = useState("");
  const [closingShift, setClosingShift] = useState(false);
  const [hasShiftCut, setHasShiftCut] = useState(false);
  const [hasFinalCut, setHasFinalCut] = useState(false);

  // Sesión
  const [session, setSession] = useState(null);
  const [branchName, setBranchName] = useState("");
  const [username, setUsername] = useState("");

  // Ventas
  const [ventasTotales, setVentasTotales] = useState(0);
  const [ventasPorMetodo, setVentasPorMetodo] = useState([]);
  const [ventasPorDepartamento, setVentasPorDepartamento] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [tax, setTax] = useState(0);

  // Dólares
  const [ventasDolaresUsd, setVentasDolaresUsd] = useState(0);
  const [ventasDolaresMxn, setVentasDolaresMxn] = useState(0);

  // Cancelaciones
  const [devolucionesTotales, setDevolucionesTotales] = useState(0);
  const [devolucionesAfectanCaja, setDevolucionesAfectanCaja] = useState(0);
  const [cancelaciones, setCancelaciones] = useState([]);

  // Devoluciones parciales
  const [devolucionesParcialesTotales, setDevolucionesParcialesTotales] =
    useState(0);
  const [devolucionesParcialesAfectanCaja, setDevolucionesParcialesAfectanCaja] =
    useState(0);
  const [devolucionesParciales, setDevolucionesParciales] = useState([]);

  // Movimientos de efectivo
  const [entradasEfectivo, setEntradasEfectivo] = useState([]);
  const [salidasEfectivo, setSalidasEfectivo] = useState([]);
  const [totalEntradas, setTotalEntradas] = useState(0);
  const [totalSalidas, setTotalSalidas] = useState(0);

  useEffect(() => {
    if (user) fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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
    setActiveModal(null);
    setErrorMsg("");
    setSession(null);
    setBranchName("");
    setUsername("");
    setHasShiftCut(false);
    setHasFinalCut(false);
    resetSalesState();
  };

  const fetchAllData = async () => {
    setLoading(true);
    setErrorMsg("");

    try {
      const sessionData = await fetchSession();

      if (sessionData) {
        await fetchSalesData(sessionData);
        await fetchCashMovements(sessionData.id);
        await fetchExistingCuts(sessionData.id);
      } else {
        resetSalesState();
        setHasShiftCut(false);
        setHasFinalCut(false);
      }
    } catch (err) {
      console.error("Error cargando datos del corte:", err);
      setErrorMsg("No se pudieron cargar los datos del turno.");
    } finally {
      setLoading(false);
    }
  };

  // ── Sesión activa ──────────────────────────────────────────────────────────
  const fetchSession = async () => {
    setUsername(
      user?.user_metadata?.username
        ? user.user_metadata.username.toUpperCase()
        : user?.email?.split("@")[0].toUpperCase() || "USUARIO"
    );

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

      if (!branchErr && branchData?.name) {
        setBranchName(branchData.name);
      } else {
        setBranchName("");
      }
    } else {
      setBranchName("");
    }

    return sessionData;
  };

  const fetchExistingCuts = async (sessionId) => {
    if (!sessionId) {
      setHasShiftCut(false);
      setHasFinalCut(false);
      return;
    }

    const { data, error } = await supabase
      .from("cash_cuts")
      .select("cut_type")
      .eq("cash_register_session_id", sessionId);

    if (error) {
      console.error("Error obteniendo cortes existentes:", error.message);
      setHasShiftCut(false);
      setHasFinalCut(false);
      return;
    }

    const cutTypes = data?.map((c) => c.cut_type) || [];
    setHasShiftCut(cutTypes.includes("shift"));
    setHasFinalCut(cutTypes.includes("final"));
  };

  // ── Ventas del turno ──────────────────────────────────────────────────────
  const fetchSalesData = async (sessionData) => {
    const turnoStart = sessionData.opened_at;
    const branchId = sessionData.branch_id;

    if (!turnoStart || !branchId) {
      setErrorMsg("El turno activo no tiene sucursal o fecha de apertura válidas.");
      return;
    }

    const { data: salesData, error: salesError } = await supabase
      .from("sales")
      .select("id, subtotal, tax, total")
      .eq("branch_id", branchId)
      .eq("user_id", user.id)
      .eq("status", "completed")
      .gte("created_at", turnoStart);

    if (salesError) {
      console.error("Error obteniendo ventas:", salesError.message);
      setErrorMsg("Error obteniendo ventas del turno.");
      return;
    }

    if (salesData && salesData.length > 0) {
      const saleIds = salesData.map((s) => s.id);

      setVentasTotales(
        salesData.reduce((acc, s) => acc + parseFloat(s.total || 0), 0)
      );
      setSubtotal(
        salesData.reduce((acc, s) => acc + parseFloat(s.subtotal || 0), 0)
      );
      setTax(salesData.reduce((acc, s) => acc + parseFloat(s.tax || 0), 0));

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

    const { data: refundRows, error: refundErr } = await supabase
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
      .eq("user_id", user.id)
      .gte("canceled_at", turnoStart)
      .order("canceled_at", { ascending: false });

    if (refundErr) {
      console.error("Error obteniendo devoluciones:", refundErr.message);
      setDevolucionesTotales(0);
      setDevolucionesAfectanCaja(0);
      setCancelaciones([]);
    } else {
      const totalRefunds = (refundRows || []).reduce(
        (acc, row) => acc + parseFloat(row.refund_amount || 0),
        0
      );

      const totalRefundsCashImpact = (refundRows || []).reduce((acc, row) => {
        const affectsCash = row.payment_methods?.affects_cash ?? false;
        if (affectsCash) {
          return acc + parseFloat(row.refund_amount || 0);
        }
        return acc;
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
          refund_method_name: row.payment_methods?.name || "Sin método",
          affects_cash: row.payment_methods?.affects_cash ?? false,
        }))
      );
    }

    const { data: partialReturnRows, error: partialReturnErr } = await supabase
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
      .eq("user_id", user.id)
      .gte("created_at", turnoStart)
      .order("created_at", { ascending: false });

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
      (acc, row) => acc + parseFloat(row.total_refund || 0),
      0
    );

    const totalPartialReturnsCashImpact = (partialReturnRows || []).reduce(
      (acc, row) => {
        const affectsCash = row.payment_methods?.affects_cash ?? false;
        if (affectsCash) {
          return acc + parseFloat(row.total_refund || 0);
        }
        return acc;
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
        refund_method_name: row.payment_methods?.name || "Sin método",
        affects_cash: row.payment_methods?.affects_cash ?? false,
      }))
    );
  };

  // ── Ventas por método ─────────────────────────────────────────────────────
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

      grouped[name].total += parseFloat(p.amount || 0);
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

  // ── Ventas en dólares ─────────────────────────────────────────────────────
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

  // ── Ventas por departamento ───────────────────────────────────────────────
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
      grouped[deptName] += parseFloat(item.total_price || 0);
    });

    setVentasPorDepartamento(
      Object.entries(grouped)
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total)
    );
  };

  // ── Movimientos de caja ───────────────────────────────────────────────────
  const fetchCashMovements = async (sessionId) => {
    if (!sessionId) {
      setEntradasEfectivo([]);
      setSalidasEfectivo([]);
      setTotalEntradas(0);
      setTotalSalidas(0);
      return;
    }

    const { data, error } = await supabase
      .from("cash_movements")
      .select("id, movement_type, amount, description, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false });

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
      entradas.reduce((acc, mov) => acc + parseFloat(mov.amount || 0), 0)
    );

    setTotalSalidas(
      salidas.reduce((acc, mov) => acc + parseFloat(mov.amount || 0), 0)
    );
  };

  // ── Guardar corte ─────────────────────────────────────────────────────────
  const handleConfirmCorte = async ({ counted, notes, expected }) => {
    setErrorMsg("");

    if (!session?.id || !session?.branch_id) {
      setErrorMsg("No hay turno activo. Abre caja antes de realizar un corte.");
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
          cut_type: activeModal === "cajero" ? "shift" : "final",
          expected_amount: expected,
          counted_amount: counted,
          difference: diferencia,
          notes: notes || null,
          cut_date: new Date().toISOString().split("T")[0],
        })
        .select()
        .single();

      if (cutError) {
        if (cutError.code === "23505") {
          const tipoTexto = activeModal === "cajero" ? "de cajero" : "del día";
          setErrorMsg(`Ya existe un corte ${tipoTexto} para este turno.`);
          return;
        }
        throw cutError;
      }

      if (ventasPorMetodo.length > 0 && cutData?.id) {
        const details = ventasPorMetodo
          .filter((m) => !!m.id)
          .map((m) => ({
            cash_cut_id: cutData.id,
            payment_method_id: m.id,
            expected_amount: m.total,
            counted_amount: m.total,
            difference: 0,
          }));

        if (details.length > 0) {
          const { error: detErr } = await supabase
            .from("cash_cut_details")
            .insert(details);

          if (detErr) throw detErr;
        }
      }

      setActiveModal(null);
      alert(`Corte realizado exitosamente.\nDiferencia: ${fmt(diferencia)}`);
      await fetchAllData();
    } catch (err) {
      console.error("Error guardando corte:", err);
      setErrorMsg(err?.message || "Ocurrió un error al guardar el corte.");
      alert("Ocurrió un error al guardar el corte.");
    }
  };

  // ── Cerrar turno ──────────────────────────────────────────────────────────
  const handleCerrarTurno = async () => {
    setErrorMsg("");

    if (closingShift) return;

    if (!session?.id) {
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

  // ── Cálculos ──────────────────────────────────────────────────────────────
  const openingAmount = parseFloat(session?.opening_amount || 0);

  const ventasEfectivo = ventasPorMetodo
    .filter((m) => m.name?.toLowerCase() === "efectivo")
    .reduce((acc, m) => acc + m.total, 0);

  const ventasTerminal = ventasPorMetodo
    .filter((m) => {
      const name = m.name?.toLowerCase() || "";
      return name.includes("terminal") || name.includes("tarjeta");
    })
    .reduce((acc, m) => acc + m.total, 0);

  const ventasTransferencia = ventasPorMetodo
    .filter((m) => {
      const name = m.name?.toLowerCase() || "";
      return name.includes("transferencia");
    })
    .reduce((acc, m) => acc + m.total, 0);

  const descuentoTotal = subtotal + tax - ventasTotales;

  const dineroCaja =
    openingAmount +
    totalEntradas +
    ventasEfectivo +
    ventasDolaresMxn -
    totalSalidas -
    devolucionesAfectanCaja -
    devolucionesParcialesAfectanCaja;

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

        ventasTotales,
        dineroCaja,
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
          setActiveModal("cajero");
        }}
        onCorteDelDia={() => {
          setErrorMsg("");
          if (!session?.id || !session?.branch_id) {
            setErrorMsg("No hay turno activo. Abre caja antes de realizar un corte.");
            return;
          }
          if (hasFinalCut) {
            setErrorMsg("Ya existe un corte del día para este turno.");
            return;
          }
          setActiveModal("dia");
        }}
        onImprimir={handlePrint}
        onCerrarTurno={handleCerrarTurno}
        disableCorteCajero={!session?.id || hasShiftCut}
        disableCorteDelDia={!session?.id || hasFinalCut}
        disableCerrarTurno={!session?.id || !hasShiftCut || closingShift}
      />

      <div className={styles.pageContent}>
        {errorMsg && <div className={styles.errorMsg}>{errorMsg}</div>}

        {loading ? (
          <div className={styles.fullLoading}>
            <div className={styles.loadingSpinner} />
            Cargando datos del turno...
          </div>
        ) : (
          <>
            <div className={styles.heroCard}>
              <div className={styles.heroLeft}>
                <span className={styles.heroLabel}>VENTAS TOTALES DEL TURNO</span>
                <span className={styles.heroAmount}>{fmt(ventasTotales)}</span>
                <span className={styles.heroDate}>
                  {fmtDate(now)} ·{" "}
                  {session?.opened_at ? fmtTime(session.opened_at) : "--:--"} -{" "}
                  {fmtTime(now)}
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
                      {session?.id ? `#${session.id.slice(0, 8).toUpperCase()}` : "—"}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.heroStats}>
                <div className={styles.heroStat}>
                  <span className={styles.heroStatLabel}>💰 Total en caja</span>
                  <span className={styles.heroStatValue}>{fmt(dineroCaja)}</span>
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
                <DataRow label="Total en caja" value={fmt(dineroCaja)} bold borderTop />
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
        isOpen={activeModal === "cajero" || activeModal === "dia"}
        onClose={() => setActiveModal(null)}
        onConfirm={handleConfirmCorte}
        cutType={activeModal}
        expectedAmount={dineroCaja}
      />

      <Footer />
    </div>
  );
};

export default CashCut;