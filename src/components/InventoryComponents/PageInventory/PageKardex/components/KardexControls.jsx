import React from "react";
import DatePicker from "react-datepicker";

import "react-datepicker/dist/react-datepicker.css";

import styles from "./KardexControls.module.css";

const parseDateValue = (value) => {
  if (!value) {
    return null;
  }

  const [
    year,
    month,
    day,
  ] = String(value)
    .split("-")
    .map(Number);

  if (
    !year ||
    !month ||
    !day
  ) {
    return null;
  }

  const date = new Date(
    year,
    month - 1,
    day
  );

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
};

const formatDateValue = (date) => {
  if (
    !(date instanceof Date) ||
    Number.isNaN(date.getTime())
  ) {
    return "";
  }

  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const KardexControls = ({
  barcode = "",
  draftDateFrom = "",
  draftDateTo = "",
  dateFilterError = "",
  isDateFilterActive = false,
  hasSelectedProducts = false,

  onBarcodeChange,
  onBarcodeSearch,

  onDateFromChange,
  onDateToChange,

  onApplyDateFilter,
  onClearDateFilter,
  onOpenProductSearch,
}) => {
  const startDateValue =
    parseDateValue(
      draftDateFrom
    );

  const endDateValue =
    parseDateValue(
      draftDateTo
    );

  const handleBarcodeKeyDown = (
    event
  ) => {
    if (
      event.key !== "Enter"
    ) {
      return;
    }

    event.preventDefault();
    onBarcodeSearch?.();
  };

  return (
    <div className={styles.searchSection}>
      <div className={styles.searchRow}>
        <div className={styles.searchGroup}>
          <label
            htmlFor="kardex-barcode"
            className={styles.searchLabel}
          >
            Código de barras
          </label>

          <input
            id="kardex-barcode"
            className={styles.searchInput}
            type="text"
            value={barcode}
            onChange={(event) => {
              onBarcodeChange?.(
                event.target.value
              );
            }}
            onKeyDown={
              handleBarcodeKeyDown
            }
            placeholder="Escanea o escribe el código y presiona Enter"
            autoComplete="off"
            autoFocus
          />
        </div>

        <div className={styles.dateGroup}>
          <label
            htmlFor="kardex-date-from"
            className={styles.searchLabel}
          >
            Desde
          </label>

          <DatePicker
            id="kardex-date-from"
            selected={
              startDateValue
            }
            onChange={(date) => {
              onDateFromChange?.(
                formatDateValue(
                  date
                )
              );
            }}
            selectsStart
            startDate={
              startDateValue
            }
            endDate={
              endDateValue
            }
            maxDate={
              endDateValue
            }
            dateFormat="dd/MM/yyyy"
            placeholderText="dd/mm/yyyy"
            className={
              styles.dateInput
            }
            calendarClassName={
              styles.datePickerCalendar
            }
            popperClassName={
              styles.datePickerPopper
            }
            wrapperClassName={
              styles.datePickerWrapper
            }
            showPopperArrow={false}
            isClearable={false}
          />
        </div>

        <div className={styles.dateGroup}>
          <label
            htmlFor="kardex-date-to"
            className={styles.searchLabel}
          >
            Hasta
          </label>

          <DatePicker
            id="kardex-date-to"
            selected={
              endDateValue
            }
            onChange={(date) => {
              onDateToChange?.(
                formatDateValue(
                  date
                )
              );
            }}
            selectsEnd
            startDate={
              startDateValue
            }
            endDate={
              endDateValue
            }
            minDate={
              startDateValue
            }
            dateFormat="dd/MM/yyyy"
            placeholderText="dd/mm/yyyy"
            className={
              styles.dateInput
            }
            calendarClassName={
              styles.datePickerCalendar
            }
            popperClassName={
              styles.datePickerPopper
            }
            wrapperClassName={
              styles.datePickerWrapper
            }
            showPopperArrow={false}
            isClearable={false}
          />
        </div>

        <button
          type="button"
          className={
            styles.filterButton
          }
          onClick={() => {
            onApplyDateFilter?.();
          }}
          disabled={
            !hasSelectedProducts
          }
        >
          Filtrar
        </button>

        <button
          type="button"
          className={
            styles.filterButton
          }
          onClick={() => {
            onClearDateFilter?.();
          }}
          disabled={
  !draftDateFrom &&
  !draftDateTo &&
  !isDateFilterActive
}
        >
          {isDateFilterActive
            ? "Limpiar rango"
            : "Limpiar"}
        </button>

        <button
          type="button"
          className={
            styles.searchButton
          }
          onClick={() => {
            onOpenProductSearch?.();
          }}
        >
          Buscar producto
        </button>
      </div>

      {dateFilterError ? (
        <div
          className={
            styles.controlError
          }
          role="alert"
        >
          {dateFilterError}
        </div>
      ) : null}
    </div>
  );
};

export default KardexControls;