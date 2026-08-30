import React, { useMemo, useRef, useState, useEffect } from "react";
import styles from "./NavbarCashCut.module.css";

import ReceiptIcon from "../../../assets/icons/receipt-solid-full.svg";
import PrintIcon from "../../../assets/icons/print-solid-full.svg";
import LockIcon from "../../../assets/icons/lock-solid-full.svg";
import ChevronDownIcon from "../../../assets/icons/chevron-down-solid-full.svg";
import XmarkIcon from "../../../assets/icons/xmark-solid-full.svg";

const toDateInputValue = (date = new Date()) => {
  if (!date) return "";

  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) return "";

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
};

const formatDateLabel = (dateValue) => {
  if (!dateValue) return "Seleccionar fecha";

  const [yyyy, mm, dd] = dateValue.split("-");
  const safeDate = new Date(Number(yyyy), Number(mm) - 1, Number(dd));

  return safeDate.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const getCutDateValue = (cut) => {
  if (!cut) return "";

  if (cut.cut_date) {
    return toDateInputValue(cut.cut_date);
  }

  return toDateInputValue(cut.created_at);
};

const NavbarCashCut = ({
  cutsHistory = [],
  selectedCutId = "current",
  onChangeCut,

  onCorteCajero,
  onImprimir,
  onCerrarTurno,

  disableCorteCajero = false,
  disableCerrarTurno = false,
  isHistoricalView = false,
}) => {
  const today = useMemo(() => toDateInputValue(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const pickerRef = useRef(null);

  const selectedCut = useMemo(() => {
    if (selectedCutId === "current") return null;
    return cutsHistory.find((cut) => cut.id === selectedCutId) || null;
  }, [cutsHistory, selectedCutId]);

  const filteredCuts = useMemo(() => {
    return cutsHistory.filter((cut) => getCutDateValue(cut) === selectedDate);
  }, [cutsHistory, selectedDate]);

  useEffect(() => {
    if (selectedCut?.cut_date || selectedCut?.created_at) {
      setSelectedDate(getCutDateValue(selectedCut));
    }
  }, [selectedCut]);

  useEffect(() => {
    if (selectedCutId === "current") {
      setSelectedDate(today);
    }
  }, [selectedCutId, today]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!pickerRef.current) return;

      if (!pickerRef.current.contains(event.target)) {
        setIsPickerOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelectCurrent = () => {
    setSelectedDate(today);
    onChangeCut?.("current");
    setIsPickerOpen(false);
  };

  const handleSelectCut = (cutId) => {
    onChangeCut?.(cutId);
    setIsPickerOpen(false);
  };

  const handleDateChange = (event) => {
    setSelectedDate(event.target.value);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.left}>
        <span className={styles.title}>
          <img
            src={ReceiptIcon}
            alt=""
            className={styles.titleIcon}
            aria-hidden="true"
          />
          CORTE DE CAJA
        </span>

        <div className={styles.datePickerWrapper} ref={pickerRef}>
          <button
            type="button"
            className={`${styles.datePickerButton} ${
              isPickerOpen ? styles.datePickerButtonActive : ""
            }`}
            onClick={() => setIsPickerOpen((prev) => !prev)}
          >
            <span className={styles.datePickerMain}>
              {selectedCutId === "current"
                ? "Turno actual"
                : formatDateLabel(selectedDate)}
            </span>

            <span className={styles.datePickerSub}>
              {selectedCutId === "current"
                ? "Ver corte activo"
                : selectedCut?.label || "Corte histórico"}
            </span>

            <span className={styles.datePickerArrow}>
              <img
                src={ChevronDownIcon}
                alt=""
                className={styles.arrowIcon}
                aria-hidden="true"
              />
            </span>
          </button>

          {isPickerOpen && (
            <div className={styles.calendarPanel}>
              <div className={styles.calendarHeader}>
                <span className={styles.calendarTitle}>Seleccionar corte</span>

                <button
                  type="button"
                  className={styles.closePickerBtn}
                  onClick={() => setIsPickerOpen(false)}
                  aria-label="Cerrar selector"
                >
                  <img
                    src={XmarkIcon}
                    alt=""
                    className={styles.closePickerIcon}
                    aria-hidden="true"
                  />
                </button>
              </div>

              <button
                type="button"
                className={`${styles.currentOption} ${
                  selectedCutId === "current" ? styles.optionActive : ""
                }`}
                onClick={handleSelectCurrent}
              >
                <span className={styles.optionTitle}>Turno actual</span>
                <span className={styles.optionMeta}>Corte en curso</span>
              </button>

              <div className={styles.calendarBox}>
                <label className={styles.calendarLabel}>Fecha del corte</label>

                <input
                  type="date"
                  className={styles.calendarInput}
                  value={selectedDate}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={handleDateChange}
                />
              </div>

              <div className={styles.cutListHeader}>Cortes del día</div>

              <div className={styles.cutList}>
                {filteredCuts.length === 0 ? (
                  <div className={styles.noCuts}>
                    No hay cortes registrados en esta fecha.
                  </div>
                ) : (
                  filteredCuts.map((cut) => (
                    <button
                      type="button"
                      key={cut.id}
                      className={`${styles.cutOption} ${
                        selectedCutId === cut.id ? styles.optionActive : ""
                      }`}
                      onClick={() => handleSelectCut(cut.id)}
                    >
                      <span className={styles.optionTitle}>{cut.label}</span>

                      <span className={styles.optionMeta}>
                        Monto contado:{" "}
                        {new Intl.NumberFormat("es-MX", {
                          style: "currency",
                          currency: "MXN",
                        }).format(Number(cut.counted_amount || 0))}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {isHistoricalView && (
          <span className={styles.historyBadge}>Histórico</span>
        )}
      </div>

      <div className={styles.right}>
        {!isHistoricalView && (
          <button
            type="button"
            className={styles.btn}
            onClick={onCorteCajero}
            disabled={disableCorteCajero}
            title={
              disableCorteCajero
                ? "Este corte ya fue realizado o no hay turno activo"
                : ""
            }
          >
            <img
              src={ReceiptIcon}
              alt=""
              className={styles.btnIcon}
              aria-hidden="true"
            />
            Corte Cajero
          </button>
        )}

        <button type="button" className={styles.btn} onClick={onImprimir}>
          <img
            src={PrintIcon}
            alt=""
            className={styles.btnIcon}
            aria-hidden="true"
          />
          Imprimir
        </button>

        {!isHistoricalView && (
          <button
            type="button"
            className={`${styles.btn} ${styles.danger}`}
            onClick={onCerrarTurno}
            disabled={disableCerrarTurno}
            title={
              disableCerrarTurno
                ? "Debes realizar primero el corte de cajero"
                : ""
            }
          >
            <img
              src={LockIcon}
              alt=""
              className={styles.btnIcon}
              aria-hidden="true"
            />
            Cerrar Turno
          </button>
        )}
      </div>
    </div>
  );
};

export default NavbarCashCut;