import React, { useMemo, useRef, useState, useEffect } from "react";
import styles from "./NavbarCashCut.module.css";

const toDateInputValue = (date = new Date()) => {
  const d = new Date(date);
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
  const rawDate = cut?.created_at || cut?.cut_date;
  if (!rawDate) return "";

  return toDateInputValue(rawDate);
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
    if (selectedCut?.created_at || selectedCut?.cut_date) {
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

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.left}>
        <span className={styles.title}>🧾 CORTE DE CAJA</span>

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

            <span className={styles.datePickerArrow}>▾</span>
          </button>

          {isPickerOpen && (
            <div className={styles.calendarPanel}>
              <div className={styles.calendarHeader}>
                <span className={styles.calendarTitle}>Seleccionar corte</span>
                <button
                  type="button"
                  className={styles.closePickerBtn}
                  onClick={() => setIsPickerOpen(false)}
                >
                  ×
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
                <label className={styles.calendarLabel}>
                  Fecha del corte
                </label>

                <input
                  type="date"
                  className={styles.calendarInput}
                  value={selectedDate}
                  onChange={handleDateChange}
                />
              </div>

              <div className={styles.cutListHeader}>
                Cortes del día
              </div>

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
                      <span className={styles.optionTitle}>
                        {cut.label}
                      </span>

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
            className={styles.btn}
            onClick={onCorteCajero}
            disabled={disableCorteCajero}
            title={
              disableCorteCajero
                ? "Este corte ya fue realizado o no hay turno activo"
                : ""
            }
          >
            🧾 Corte Cajero
          </button>
        )}

        <button className={styles.btn} onClick={onImprimir}>
          🖨️ Imprimir
        </button>

        {!isHistoricalView && (
          <button
            className={`${styles.btn} ${styles.danger}`}
            onClick={onCerrarTurno}
            disabled={disableCerrarTurno}
            title={
              disableCerrarTurno
                ? "Debes realizar primero el corte de cajero"
                : ""
            }
          >
            🔒 Cerrar Turno
          </button>
        )}
      </div>
    </div>
  );
};

export default NavbarCashCut;