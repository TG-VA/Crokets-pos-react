import React, { useEffect, useState } from "react";
import styles from "./CashCutModal.module.css";
import AppModal from "../../AppModal/AppModal";
import receiptIcon from "../../../assets/icons/receipt-solid-full.svg";
import { useDidChange } from "../../../hooks/useDidChange";
import { getCashOperationSettings } from "../../../services/cashOperationSettingsService";

const fmt = (n) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(Number(n) || 0);

const CorteModal = ({ isOpen, expectedAmount, onClose, onConfirm }) => {
  const [counted, setCounted] = useState("");
  const [notes, setNotes] = useState("");
  const [cashSettings, setCashSettings] = useState(() =>
    getCashOperationSettings()
  );
  const [appModal, setAppModal] = useState({
    isOpen: false,
    type: "warning",
    title: "",
    message: "",
    confirmText: "Entendido",
  });

  const closeAppModal = () => {
    setAppModal((prev) => ({
      ...prev,
      isOpen: false,
    }));
  };

  const showAppAlert = ({
    type = "warning",
    title = "Aviso",
    message = "",
    confirmText = "Entendido",
  }) => {
    setAppModal({
      isOpen: true,
      type,
      title,
      message,
      confirmText,
    });
  };

  const handleConfirm = () => {
    if (counted === "") {
      showAppAlert({
        type: "warning",
        title: "Monto contado requerido",
        message: "Debes capturar el monto contado en caja.",
        confirmText: "Entendido",
      });
      return;
    }

    const expected = Number(expectedAmount) || 0;
    const countedNumber = Number(counted) || 0;

    const hasDiff = Math.abs(countedNumber - expected) > 0.001;
    if (cashSettings.requireCutDifferenceNote && hasDiff && !notes.trim()) {
      showAppAlert({
        type: "warning",
        title: "Justificación requerida",
        message:
          "Existe una diferencia en el corte. Debes ingresar un motivo o justificación en las notas.",
        confirmText: "Entendido",
      });
      return;
    }

    onConfirm({
      counted: countedNumber,
      notes,
      expected,
    });
  };

  // El conteo arranca limpio cada vez que se abre el modal. El ajuste se
  // resuelve durante el render para no encadenar un re-render adicional.
  if (useDidChange(isOpen) && isOpen) {
    setCounted("");
    setNotes("");
    setCashSettings(getCashOperationSettings());
    closeAppModal();
  }

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();

        if (appModal.isOpen) {
          closeAppModal();
          return;
        }

        onClose();
        return;
      }

      if (e.key === "Enter") {
        const tag = document.activeElement?.tagName?.toLowerCase();

        if (tag === "textarea") return;

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();

        if (appModal.isOpen) {
          closeAppModal();
          return;
        }

        handleConfirm();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen, appModal.isOpen, counted, notes, expectedAmount, onClose]);

  if (!isOpen) return null;

  const expected = Number(expectedAmount) || 0;
  const countedNumber = Number(counted) || 0;
  const hasCounted = counted !== "";
  const diff = countedNumber - expected;

  const handleOverlayClick = (e) => {
    if (appModal.isOpen) return;

    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>
          <img src={receiptIcon} alt="" className={styles.modalTitleIcon} />
          Corte de Cajero
        </h2>

        <p className={styles.modalSubtitle}>
          {cashSettings.blindCountCut
            ? "Captura el conteo físico de efectivo en caja"
            : "Confirma el monto contado en caja"}
        </p>

        {!cashSettings.blindCountCut && (
          <div className={styles.modalField}>
            <label className={styles.modalLabel}>MONTO ESPERADO</label>
            <div className={styles.expectedAmount}>{fmt(expected)}</div>
          </div>
        )}

        <div className={styles.modalField}>
          <label className={styles.modalLabel}>MONTO CONTADO EN CAJA</label>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={counted}
            onChange={(e) => setCounted(e.target.value)}
            className={styles.modalInput}
            disabled={appModal.isOpen}
          />
        </div>

        {hasCounted && !cashSettings.blindCountCut && (
          <div
            className={`${styles.diffBadge} ${
              diff >= 0 ? styles.diffPositive : styles.diffNegative
            }`}
          >
            Diferencia: {fmt(diff)}
          </div>
        )}

        <div className={styles.modalField}>
          <label className={styles.modalLabel}>
            {cashSettings.requireCutDifferenceNote &&
            hasCounted &&
            Math.abs(diff) > 0.001
              ? "NOTAS (obligatorio por diferencia)"
              : "NOTAS (opcional)"}
          </label>
          <textarea
            placeholder="Observaciones del corte..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={styles.modalTextarea}
            rows={3}
            disabled={appModal.isOpen}
          />
        </div>

        <div className={styles.modalActions}>
          <button
            type="button"
            className={styles.btnCancel}
            onClick={onClose}
            disabled={appModal.isOpen}
          >
            Cancelar
          </button>

          <button
            type="button"
            className={styles.btnConfirm}
            onClick={handleConfirm}
            disabled={appModal.isOpen}
          >
            Enter - Confirmar Corte
          </button>
        </div>
      </div>

      <AppModal
        isOpen={appModal.isOpen}
        type={appModal.type}
        title={appModal.title}
        message={appModal.message}
        confirmText={appModal.confirmText}
        onClose={closeAppModal}
        onConfirm={closeAppModal}
      />
    </div>
  );
};

export default CorteModal;
