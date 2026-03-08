import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import NavbarCashCut from "../../components/CashCutComponents/NavbarCashCut/NavbarCashCut";
import CorteModal from "../../components/CashCutComponents/CashCutModal/CashCutModal";

import styles from "./CashCut.module.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n || 0);

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const fmtTime = (d) =>
  new Date(d).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

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
    <span className={`${styles.dataLabel} ${bold ? styles.bold : ""}`}>{label}</span>
    <span
      className={`${styles.dataValue} ${bold ? styles.bold : ""}`}
      style={{ color: color || undefined }}
    >
      {value}
    </span>
  </div>
);

const EmptyState = ({ msg }) => <div className={styles.emptyState}>— {msg} —</div>;

// ─── Página Principal ─────────────────────────────────────────────────────────
const CashCut = () => {
  const navigate = useNavigate();

  // ✅ IMPORTANTE: usa también setCashRegistered para “cerrar caja” en el estado global
  const { user, setCashRegistered, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(null);

  // UX
  const [errorMsg, setErrorMsg] = useState("");
  const [closingShift, setClosingShift] = useState(false);
  const [hasShiftCut, setHasShiftCut] = useState(false);
  const [hasFinalCut, setHasFinalCut] = useState(false);

  // Sesión (turno)
  const [session, setSession] = useState(null);
  const [branchName, setBranchName] = useState("");
  const [username, setUsername] = useState("");

  // Ventas
  const [ventasTotales, setVentasTotales] = useState(0);
  const [ventasPorMetodo, setVentasPorMetodo] = useState([]);
  const [ventasPorDepartamento, setVentasPorDepartamento] = useState([]);
  const [devoluciones, setDevoluciones] = useState(0);
  const [subtotal, setSubtotal] = useState(0);
  const [tax, setTax] = useState(0);

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
    setDevoluciones(0);
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

  // ── Sesión activa (turno open) ─────────────────────────────────────────────
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

      if (!branchErr && branchData?.name) setBranchName(branchData.name);
      else setBranchName("");
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

      setVentasTotales(salesData.reduce((acc, s) => acc + parseFloat(s.total || 0), 0));
      setSubtotal(salesData.reduce((acc, s) => acc + parseFloat(s.subtotal || 0), 0));
      setTax(salesData.reduce((acc, s) => acc + parseFloat(s.tax || 0), 0));

      await fetchVentasPorMetodo(saleIds, branchId);
      await fetchVentasPorDepartamento(saleIds);
    } else {
      setVentasTotales(0);
      setSubtotal(0);
      setTax(0);
      setVentasPorMetodo([]);
      setVentasPorDepartamento([]);
    }

    const { data: devData, error: devErr } = await supabase
      .from("canceled_sales")
      .select("refund_amount")
      .eq("user_id", user.id)
      .gte("canceled_at", turnoStart);

    if (devErr) {
      console.error("Error obteniendo devoluciones:", devErr.message);
      return;
    }

    setDevoluciones(
      devData ? devData.reduce((acc, d) => acc + parseFloat(d.refund_amount || 0), 0) : 0
    );
  };

  // ── Ventas por método de pago ─────────────────────────────────────────────
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
      if (!grouped[name]) grouped[name] = { id, total: 0, affects_cash: affectsCash };
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

  // ── Guardar corte en Supabase ─────────────────────────────────────────────
  const handleConfirmCorte = async ({ counted, notes, expected }) => {
    setErrorMsg("");

    if (!session?.id || !session?.branch_id) {
      setErrorMsg("No hay turno activo. Abre caja antes de realizar un corte.");
      return;
    }

    const diferencia = counted - expected;

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
          const { error: detErr } = await supabase.from("cash_cut_details").insert(details);
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

  // ── Cerrar turno (RPC + signOut + redirect login) ──────────────────────────
  const handleCerrarTurno = async () => {
    setErrorMsg("");
    if (closingShift) return;

    if (!session?.id) {
      setErrorMsg("No hay turno activo para cerrar.");
      return;
    }

    if (!window.confirm("¿Estás seguro de que deseas cerrar el turno actual?")) return;

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

      // ✅ MUY IMPORTANTE: marca que ya NO hay caja abierta
if (typeof setCashRegistered === "function") {
  setCashRegistered(false);
}

await logout();

      // 3) limpiar estado local
      resetLocalState();

      // 4) ir al login (replace para que no regrese con back)
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
  const efectivoVentas = ventasPorMetodo
    .filter((m) => m.affects_cash)
    .reduce((acc, m) => acc + m.total, 0);
  const dineroCaja = openingAmount + efectivoVentas - devoluciones;
  const now = new Date();

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
  onImprimir={() => window.print()}
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
                <span className={styles.heroLabel}>Ventas Totales del Turno</span>
                <span className={styles.heroAmount}>{fmt(ventasTotales)}</span>
                <span className={styles.heroDate}>
                  {fmtDate(now)} ·{" "}
                  {session?.opened_at ? fmtTime(session.opened_at) : "--:--"} – {fmtTime(now)}
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
                {ventasPorMetodo.map((m) => (
                  <div key={m.name} className={styles.heroStat}>
                    <span className={styles.heroStatLabel}>
                      {m.affects_cash ? "💵" : "💳"} {m.name}
                    </span>
                    <span className={styles.heroStatValue}>{fmt(m.total)}</span>
                  </div>
                ))}

                {devoluciones > 0 && (
                  <div className={styles.heroStat}>
                    <span className={styles.heroStatLabel}>↩️ Devoluciones</span>
                    <span className={`${styles.heroStatValue} ${styles.negative}`}>
                      -{fmt(devoluciones)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.grid}>
              <SectionCard icon="💰" title="Dinero en Caja">
                <DataRow label="Fondo de caja inicial" value={fmt(openingAmount)} />
                <DataRow label="Ventas en efectivo" value={`+ ${fmt(efectivoVentas)}`} color="#2e7d32" />
                <DataRow label="Devoluciones en efectivo" value={`- ${fmt(devoluciones)}`} color="#c62828" />
                <DataRow label="Total en caja" value={fmt(dineroCaja)} bold borderTop />
              </SectionCard>

              <SectionCard icon="💳" title="Ventas por Método de Pago">
                {ventasPorMetodo.length === 0 ? (
                  <EmptyState msg="No hubo ventas en este turno" />
                ) : (
                  <>
                    {ventasPorMetodo.map((m) => (
                      <DataRow key={m.name} label={m.name} value={`+ ${fmt(m.total)}`} color="#2e7d32" />
                    ))}
                    {devoluciones > 0 && (
                      <DataRow label="Devoluciones" value={`- ${fmt(devoluciones)}`} color="#c62828" />
                    )}
                    <DataRow label="Total" value={fmt(ventasTotales)} bold borderTop />
                  </>
                )}
              </SectionCard>

              <SectionCard icon="⬇️" title="Entradas de Efectivo">
                <EmptyState msg="No hubo entradas de efectivo" />
              </SectionCard>

              <SectionCard icon="⬆️" title="Salidas de Efectivo">
                <EmptyState msg="No hubo salidas de efectivo" />
              </SectionCard>

              <SectionCard icon="📦" title="Ventas por Departamento">
                {ventasPorDepartamento.length === 0 ? (
                  <EmptyState msg="No hay datos de departamentos" />
                ) : (
                  <>
                    {ventasPorDepartamento.map((dep) => (
                      <DataRow key={dep.name} label={dep.name} value={fmt(dep.total)} />
                    ))}
                    <DataRow
                      label="Total"
                      value={fmt(ventasPorDepartamento.reduce((a, d) => a + d.total, 0))}
                      bold
                      borderTop
                    />
                  </>
                )}
              </SectionCard>

              <SectionCard icon="🧾" title="Impuestos">
                <DataRow label="Subtotal (sin IVA)" value={fmt(subtotal)} />
                <DataRow label="IVA (16%) — Cobrado" value={fmt(tax)} color="#1976d2" />
                <DataRow label="IVA (16%) — Ventas Gravadas" value={fmt(ventasTotales)} />
                <DataRow label="Total con IVA" value={fmt(ventasTotales)} bold borderTop />
              </SectionCard>
            </div>

            <div className={styles.footer}>
              CROKETS · Sistema POS · Generado el {fmtDate(now)} a las {fmtTime(now)}
            </div>
          </>
        )}

        {activeModal && (
          <CorteModal
            tipo={activeModal}
            expected={activeModal === "cajero" ? openingAmount + efectivoVentas : ventasTotales}
            onClose={() => setActiveModal(null)}
            onConfirm={handleConfirmCorte}
          />
        )}

        <style>{`@media print { button { display: none !important; } }`}</style>
      </div>

      <Footer />
    </div>
  );
};

export default CashCut;