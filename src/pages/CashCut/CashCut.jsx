import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

import { useAppModal } from "../../hooks/useAppModal";

import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import NavbarCashCut from "../../components/CashCutComponents/NavbarCashCut/NavbarCashCut";
import CorteModal from "../../components/CashCutComponents/CashCutModal/CashCutModal";
import AppModal from "../../components/AppModal/AppModal";

import { buildCashCutText } from "../../utils/cashCutBuilder";
import { printTicket } from "../../utils/ticketPrinter";

import { useCashCutReport } from "./hooks/useCashCutReport";
import { useCashCutDetail } from "./hooks/useCashCutDetail";

import { fmtDate, fmtTime } from "./utils/cashCutFormatters";

import { IconImg } from "./components/primitives";
import CutHero from "./components/CutHero";
import CutInfoSection from "./components/CutInfoSection";
import CutCashSummarySection from "./components/CutCashSummarySection";
import PaymentMethodsSection from "./components/PaymentMethodsSection";
import CashInflowsSection from "./components/CashInflowsSection";
import CashOutflowsSection from "./components/CashOutflowsSection";
import DepartmentsSection from "./components/DepartmentsSection";
import SalesSummarySection from "./components/SalesSummarySection";
import RewardsSection from "./components/RewardsSection";
import CancellationsSection from "./components/CancellationsSection";
import PartialReturnsSection from "./components/PartialReturnsSection";

import styles from "./CashCut.module.css";

import CircleCheckIcon from "../../assets/icons/circle-check-solid-full.svg";

const CashCut = () => {
  const navigate = useNavigate();
  const { user, setCashRegistered, logout } = useAuth();

  const { appModal, closeAppModal, showAppAlert, showAppConfirm } =
    useAppModal();

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

            <CutHero
              isHistoricalView={isHistoricalView}
              ventasNetas={ventasNetas}
              now={now}
              cutCreatedAt={historicalCut?.created_at || null}
              session={session}
              branchName={branchName}
              username={username}
              ventasEfectivoNeto={ventasEfectivoNeto}
              ventasTerminalNeto={ventasTerminalNeto}
              ventasTransferenciaNeto={ventasTransferenciaNeto}
              expectedDisplay={expectedDisplay}
            />

            <div className={styles.grid}>
              {(isHistoricalView || currentShiftCut) && (
                <CutInfoSection
                  cut={historicalCut || currentShiftCut}
                  expectedDisplay={expectedDisplay}
                  countedDisplay={countedDisplay}
                  differenceDisplay={differenceDisplay}
                />
              )}

              <CutCashSummarySection
                openingAmount={openingAmount}
                totalEntradas={totalEntradas}
                ventasEfectivoNeto={ventasEfectivoNeto}
                ventasDolaresUsd={ventasDolaresUsd}
                ventasDolaresMxn={ventasDolaresMxn}
                totalSalidas={totalSalidas}
                devolucionesAfectanCaja={devolucionesAfectanCaja}
                devolucionesParcialesAfectanCaja={
                  devolucionesParcialesAfectanCaja
                }
                isHistoricalView={isHistoricalView}
                hasShiftCut={hasShiftCut}
                expectedDisplay={expectedDisplay}
              />

              <PaymentMethodsSection
                ventasPorMetodo={ventasPorMetodo}
                ventasDolaresUsd={ventasDolaresUsd}
                ventasDolaresMxn={ventasDolaresMxn}
                devolucionesTotales={devolucionesTotales}
                devolucionesParcialesTotales={devolucionesParcialesTotales}
                ventasTotales={ventasTotales}
                ventasNetas={ventasNetas}
              />

              <CashInflowsSection
                entradas={entradasEfectivo}
                total={totalEntradas}
              />

              <CashOutflowsSection
                salidas={salidasEfectivo}
                total={totalSalidas}
              />

              <DepartmentsSection
                ventasPorDepartamento={ventasPorDepartamento}
                departamentosTotal={departamentosTotal}
              />

              <SalesSummarySection
                subtotal={subtotal}
                descuentoTotal={descuentoTotal}
                tax={tax}
                ventasTotales={ventasTotales}
                ventasNetas={ventasNetas}
              />

              {(rewardSummary.canjesAplicados > 0 ||
                rewardSummary.canjesRevertidos > 0) && (
                <RewardsSection rewardSummary={rewardSummary} />
              )}

              <CancellationsSection
                cancelaciones={cancelaciones}
                total={devolucionesTotales}
              />

              <PartialReturnsSection
                devolucionesParciales={devolucionesParciales}
                total={devolucionesParcialesTotales}
              />
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
