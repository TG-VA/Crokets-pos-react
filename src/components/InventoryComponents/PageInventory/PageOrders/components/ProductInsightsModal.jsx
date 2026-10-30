import DatePicker from "react-datepicker";

import "react-datepicker/dist/react-datepicker.css";

import AppModal from "../../../../AppModal/AppModal";
import { useProductInsightsDetail } from "../hooks/useProductInsightsDetail";
import { formatCurrency, formatQuantity } from "../utils/ordersFormatters";
import styles from "./ProductInsightsModal.module.css";

const DATE_FORMAT = "dd/MM/yyyy";

const DATE_PRESETS = [
  { id: "week", label: "Semana" },
  { id: "fortnight", label: "Quincena" },
];

const joinClasses = (...classes) => classes.filter(Boolean).join(" ");

const ProductInsightsModal = ({ product, onClose }) => {
  const {
    preset,
    dateFrom,
    dateTo,
    rows,
    totals,
    isLoading,
    isRangeValid,
    error,
    selectPreset,
    changeDate,
  } = useProductInsightsDetail({ productId: product?.productId });

  const renderBody = () => {
    if (!isRangeValid) {
      return (
        <p className={styles.message}>
          Selecciona un rango de fechas válido para consultar las ventas.
        </p>
      );
    }

    if (isLoading) {
      return <p className={styles.message}>Cargando detalle...</p>;
    }

    if (error) {
      return (
        <p className={styles.errorMessage} role="alert">
          {error}
        </p>
      );
    }

    if (rows.length === 0) {
      return <p className={styles.message}>No hay sucursales para mostrar.</p>;
    }

    return (
      <div className={styles.tableWrapper}>
        <table className={styles.branchesTable}>
          <thead>
            <tr>
              <th>Sucursal</th>
              <th className={styles.numeric}>Stock</th>
              <th className={styles.numeric}>Mínimo</th>
              <th className={styles.numeric}>Unidades vendidas</th>
              <th className={styles.numeric}>Importe vendido</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.branchId}>
                <td>{row.branchName}</td>
                <td
                  className={joinClasses(
                    styles.numeric,
                    row.belowMinimum ? styles.lowStock : ""
                  )}
                >
                  {formatQuantity(row.stock)}
                </td>
                <td className={styles.numeric}>
                  {formatQuantity(row.minStock)}
                </td>
                <td className={styles.numeric}>
                  {formatQuantity(row.unitsSold)}
                </td>
                <td className={styles.numeric}>
                  {formatCurrency(row.revenue)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              <td className={styles.numeric}>{formatQuantity(totals.stock)}</td>
              <td />
              <td className={styles.numeric}>
                {formatQuantity(totals.unitsSold)}
              </td>
              <td className={styles.numeric}>
                {formatCurrency(totals.revenue)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  return (
    <AppModal
      isOpen={Boolean(product)}
      title={product?.productName ?? "Detalle del producto"}
      confirmText="Cerrar"
      onConfirm={onClose}
      onClose={onClose}
      size="large"
    >
      {product ? (
        <div className={styles.content}>
          <p className={styles.productCode}>Código: {product.barcode || "—"}</p>

          <div
            className={styles.filterBar}
            role="group"
            aria-label="Rango de ventas"
          >
            <label className={styles.dateField}>
              <span>Desde</span>
              <DatePicker
                selected={dateFrom}
                onChange={(date) => changeDate("dateFrom", date)}
                selectsStart
                startDate={dateFrom}
                endDate={dateTo}
                dateFormat={DATE_FORMAT}
                className={styles.dateInput}
                calendarClassName={styles.datePickerCalendar}
                popperClassName={styles.datePickerPopper}
                wrapperClassName={styles.datePickerWrapper}
                showPopperArrow={false}
                placeholderText="dd/mm/aaaa"
                aria-label="Desde"
              />
            </label>

            <label className={styles.dateField}>
              <span>Hasta</span>
              <DatePicker
                selected={dateTo}
                onChange={(date) => changeDate("dateTo", date)}
                selectsEnd
                startDate={dateFrom}
                endDate={dateTo}
                minDate={dateFrom}
                dateFormat={DATE_FORMAT}
                className={styles.dateInput}
                calendarClassName={styles.datePickerCalendar}
                popperClassName={styles.datePickerPopper}
                wrapperClassName={styles.datePickerWrapper}
                showPopperArrow={false}
                placeholderText="dd/mm/aaaa"
                aria-label="Hasta"
              />
            </label>

            <div className={styles.quickActions}>
              {DATE_PRESETS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={joinClasses(
                    styles.quickButton,
                    preset === option.id ? styles.quickButtonActive : ""
                  )}
                  onClick={() => selectPreset(option.id)}
                  aria-pressed={preset === option.id}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {renderBody()}
        </div>
      ) : null}
    </AppModal>
  );
};

export default ProductInsightsModal;
