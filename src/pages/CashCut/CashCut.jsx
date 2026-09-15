import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import NavbarCashCut from "../../components/CashCutComponents/NavbarCashCut/NavbarCashCut";
import CorteModal from "../../components/CashCutComponents/CashCutModal/CashCutModal";
import AppModal from "../../components/AppModal/AppModal";

import { buildCashCutText } from "../../utils/cashCutBuilder";
import { printTicket } from "../../utils/ticketPrinter";

import { useCashCutReport } from "./hooks/useCashCutReport";
import { useCashCutDetail } from "./hooks/useCashCutDetail";

import {
  fmt,
  fmtDate,
  fmtShortDate,
  fmtTime,
  getFolio,
} from "./utils/cashCutFormatters";

import styles from "./CashCut.module.css";

import CircleCheckIcon from "../../assets/icons/circle-check-solid-full.svg";
import MoneyBillWaveIcon from "../../assets/icons/money-bill-wave-solid-full.svg";
import CreditCardIcon from "../../assets/icons/credit-card-solid-full.svg";
import BuildingColumnsIcon from "../../assets/icons/building-columns-solid-full.svg";
import CoinsIcon from "../../assets/icons/coins-solid-full.svg";
import MoneyCheckIcon from "../../assets/icons/money-check-dollar-solid-full.svg";
import ThumbtackIcon from "../../assets/icons/thumbtack-solid-full.svg";
import EntryIcon from "../../assets/icons/entryIcon.svg";
import ExitIcon from "../../assets/icons/exitIcon.svg";
import BoxIcon from "../../assets/icons/box-solid-full.svg";
import ReceiptIcon from "../../assets/icons/receipt-solid-full.svg";
import GiftsIcon from "../../assets/icons/gifts-solid-full.svg";
import RotateLeftIcon from "../../assets/icons/rotate-left-solid-full.svg";

const IconImg = ({ src, className = "", alt = "" }) => (
  <img
    src={src}
    alt={alt}
    className={className}
    aria-hidden={alt ? undefined : "true"}
    style={{
      width: "1em",
      height: "1em",
      display: "inline-block",
      objectFit: "contain",
      verticalAlign: "middle",
      filter: "brightness(0) invert(1)",
    }}
  />
);

const SectionCard = ({ icon, title, children }) => (
  <div className={styles.card}>
    <div className={styles.cardHeader}>
      <span className={styles.cardIcon}>
        <IconImg src={icon} />
      </span>
      <span className={styles.cardTitle}>{title}</span>
    </div>
    <div className={styles.cardBody}>{children}</div>
  </div>
);

const HeroStatLabel = ({ icon, label }) => (
  <span className={styles.heroStatLabel}>
    <IconImg src={icon} />
    <span>{label}</span>
  </span>
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

const EmptyState = ({ msg }) => <div className={styles.emptyState}>{msg}</div>;

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

  const [appModal, setAppModal] = useState({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
    confirmText: "Aceptar",
    cancelText: "Cancelar",
    showCancel: false,
    loading: false,
    onConfirm: null,
    onCancel: null,
  });

  const closeAppModal = () => {
    setAppModal((prev) => ({
      ...prev,
      isOpen: false,
      loading: false,
      onConfirm: null,
      onCancel: null,
    }));
  };

  const showAppAlert = ({
    type = "info",
    title = "Aviso",
    message = "",
    confirmText = "Aceptar",
  }) => {
    setAppModal({
      isOpen: true,
      type,
      title,
      message,
      confirmText,
      cancelText: "Cancelar",
      showCancel: false,
      loading: false,
      onConfirm: closeAppModal,
      onCancel: closeAppModal,
    });
  };

  const showAppConfirm = ({
    type = "warning",
    title = "Confirmar acción",
    message = "",
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    onConfirm,
  }) => {
    setAppModal({
      isOpen: true,
      type,
      title,
      message,
      confirmText,
      cancelText,
      showCancel: true,
      loading: false,
      onConfirm: async () => {
        closeAppModal();

        if (onConfirm) {
          await onConfirm();
        }
      },
      onCancel: closeAppModal,
    });
  };

  const report = useCashCutReport({ user });

  const handleShiftClosed = async () => {
    localStorage.removeItem("shift_cut_done");
    window.dispatchEvent(new Event("shift-cut-status-changed"));

    if (typeof setCashRegistered === "function") {
      setCashRegistered(false);
    }

    await logout();
    report.resetLocalState();
    closeAppModal();
    navigate("/login", { replace: true });
  };

  const detail = useCashCutDetail({
    session: report.session,
    user,
    isHistoricalView: report.isHistoricalView,
    hasShiftCut: report.hasShiftCut,
    netPaymentMethodDetails: report.netPaymentMethodDetails,
    showAppAlert,
    showAppConfirm,
    setErrorMsg: report.setErrorMsg,
    onCutSaved: report.refreshAfterCut,
    onShiftClosed: handleShiftClosed,
  });

  const {
    loading,
    errorMsg,
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
    changeSelectedCut,
  } = report;

  const {
    isCutModalOpen,
    closingShift,
    openCorteModal,
    closeCorteModal,
    confirmCut,
    confirmCerrarTurno,
  } = detail;

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

        rewardCanjesAplicados: rewardSummary.canjesAplicados,
        rewardPuntosUsados: rewardSummary.puntosUsados,
        rewardCanjesRevertidos: rewardSummary.canjesRevertidos,
        rewardPuntosDevueltos: rewardSummary.puntosDevueltos,
      });

      const result = await printTicket(text);

      if (!result?.success) {
        throw new Error(result?.message || "No se pudo imprimir el corte.");
      }

      showAppAlert({
        type: "success",
        title: "Corte impreso",
        message: "Corte impreso correctamente.",
        confirmText: "Entendido",
      });
    } catch (error) {
      console.error("Error imprimiendo corte:", error);

      showAppAlert({
        type: "danger",
        title: "No se pudo imprimir el corte",
        message: error.message || "No se pudo imprimir el corte.",
        confirmText: "Entendido",
      });
    }
  };

  return (
    <div className={styles.container}>
      <Navbar />

      <NavbarCashCut
        cutsHistory={cutsHistory}
        selectedCutId={selectedCutId}
        onChangeCut={changeSelectedCut}
        isHistoricalView={isHistoricalView}
        onCorteCajero={openCorteModal}
        onImprimir={handlePrint}
        onCerrarTurno={confirmCerrarTurno}
        disableCorteCajero={!session?.id || hasShiftCut || isHistoricalView}
        disableCerrarTurno={
          !session?.id || !hasShiftCut || closingShift || isHistoricalView
        }
      />

      <div className={styles.pageContent}>
        {errorMsg && <div className={styles.errorMsg}>{errorMsg}</div>}

        {!isHistoricalView && hasShiftCut && currentShiftCut && (
          <div className={styles.cutDoneAlert}>
            <strong>
              <IconImg src={CircleCheckIcon} /> Corte de cajero realizado.
            </strong>
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
                    ? "VENTAS NETAS DEL CORTE"
                    : "VENTAS NETAS DEL TURNO"}
                </span>

                <span className={styles.heroAmount}>{fmt(ventasNetas)}</span>

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
                  <HeroStatLabel icon={MoneyBillWaveIcon} label="Efectivo neto" />
                  <span className={styles.heroStatValue}>
                    {fmt(ventasEfectivoNeto)}
                  </span>
                </div>

                <div className={styles.heroStat}>
                  <HeroStatLabel icon={CreditCardIcon} label="Terminal neta" />
                  <span className={styles.heroStatValue}>
                    {fmt(ventasTerminalNeto)}
                  </span>
                </div>

                <div className={styles.heroStat}>
                  <HeroStatLabel
                    icon={BuildingColumnsIcon}
                    label="Transferencia neta"
                  />
                  <span className={styles.heroStatValue}>
                    {fmt(ventasTransferenciaNeto)}
                  </span>
                </div>

                <div className={styles.heroStat}>
                  <HeroStatLabel icon={CoinsIcon} label="Total en caja" />
                  <span className={styles.heroStatValue}>
                    {fmt(expectedDisplay)}
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.grid}>
              {(isHistoricalView || currentShiftCut) && (
                <SectionCard icon={ThumbtackIcon} title="INFORMACIÓN DEL CORTE">
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

              <SectionCard icon={MoneyCheckIcon} title="DINERO EN CAJA">
                <DataRow label="Fondo de caja inicial" value={fmt(openingAmount)} />
                <DataRow
                  label="Entradas de efectivo"
                  value={`+ ${fmt(totalEntradas)}`}
                  color="#2e7d32"
                />
                <DataRow
                  label="Ventas en efectivo netas"
                  value={`+ ${fmt(ventasEfectivoNeto)}`}
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
                  label={
                    isHistoricalView || hasShiftCut ? "Total esperado" : "Total en caja"
                  }
                  value={fmt(expectedDisplay)}
                  bold
                  borderTop
                />
              </SectionCard>

              <SectionCard icon={CreditCardIcon} title="VENTAS POR MÉTODO DE PAGO">
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

                    <DataRow
                      label="Total bruto"
                      value={fmt(ventasTotales)}
                      bold
                      borderTop
                    />

                    <DataRow
                      label="Total neto"
                      value={fmt(ventasNetas)}
                      bold
                      color={ventasNetas < 0 ? "#c62828" : "#111827"}
                    />
                  </>
                )}
              </SectionCard>

              <SectionCard icon={EntryIcon} title="ENTRADAS DE EFECTIVO">
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

              <SectionCard icon={ExitIcon} title="SALIDAS DE EFECTIVO">
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

              <SectionCard icon={BoxIcon} title="VENTAS POR DEPARTAMENTO">
                {ventasPorDepartamento.length === 0 ? (
                  <EmptyState msg="No hay datos de departamentos" />
                ) : (
                  <>
                    {ventasPorDepartamento.map((dep) => (
                      <DataRow key={dep.name} label={dep.name} value={fmt(dep.total)} />
                    ))}
                    <DataRow
                      label="Total"
                      value={fmt(departamentosTotal)}
                      bold
                      borderTop
                    />
                  </>
                )}
              </SectionCard>

              <SectionCard icon={ReceiptIcon} title="RESUMEN DE VENTAS">
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
                <DataRow
                  label="Total bruto"
                  value={fmt(ventasTotales)}
                  bold
                  borderTop
                />

                <DataRow
                  label="Total neto"
                  value={fmt(ventasNetas)}
                  bold
                  color={ventasNetas < 0 ? "#c62828" : "#111827"}
                />
              </SectionCard>

              {(rewardSummary.canjesAplicados > 0 ||
                rewardSummary.canjesRevertidos > 0) && (
                <SectionCard icon={GiftsIcon} title="RECOMPENSAS">
                  {rewardSummary.canjesAplicados > 0 && (
                    <>
                      <DataRow
                        label="Canjes aplicados"
                        value={rewardSummary.canjesAplicados}
                        color="#2e7d32"
                      />
                      <DataRow
                        label="Puntos usados"
                        value={`- ${rewardSummary.puntosUsados} pts`}
                        color="#c62828"
                      />
                    </>
                  )}

                  {rewardSummary.canjesRevertidos > 0 && (
                    <>
                      <DataRow
                        label="Canjes revertidos"
                        value={rewardSummary.canjesRevertidos}
                        color="#00695c"
                        borderTop={rewardSummary.canjesAplicados > 0}
                      />
                      <DataRow
                        label="Puntos devueltos"
                        value={`+ ${rewardSummary.puntosDevueltos} pts`}
                        color="#00695c"
                      />
                    </>
                  )}
                </SectionCard>
              )}

              <SectionCard icon={RotateLeftIcon} title="CANCELACIONES">
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

              <SectionCard icon={RotateLeftIcon} title="DEVOLUCIONES PARCIALES">
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
              CROKETS · Sistema POS · Generado el {fmtDate(now)} a las{" "}
              {fmtTime(now)}
            </div>
          </>
        )}
      </div>

      <CorteModal
        isOpen={isCutModalOpen}
        onClose={closeCorteModal}
        onConfirm={confirmCut}
        expectedAmount={dineroCaja}
      />

      <AppModal
        isOpen={appModal.isOpen}
        type={appModal.type}
        title={appModal.title}
        message={appModal.message}
        confirmText={appModal.confirmText}
        cancelText={appModal.cancelText}
        showCancel={appModal.showCancel}
        loading={appModal.loading}
        onConfirm={appModal.onConfirm || closeAppModal}
        onCancel={appModal.onCancel || closeAppModal}
        onClose={closeAppModal}
      />

      <Footer />
    </div>
  );
};

export default CashCut;
