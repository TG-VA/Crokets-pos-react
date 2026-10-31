import DatePicker from "react-datepicker";

import "react-datepicker/dist/react-datepicker.css";

import AppModal from "../../../../AppModal/AppModal";
import { useProductInsightsDetail } from "../hooks/useProductInsightsDetail";
import {
  formatCurrency,
  formatQuantity,
  toUpperLabel,
} from "../utils/ordersFormatters";
import { STOCK_LEVEL } from "../utils/productInsightsCalculationService";
import styles from "./ProductInsightsModal.module.css";

const DATE_FORMAT = "dd/MM/yyyy";

const CALENDAR_PORTAL_ID = "product-insights-calendar-portal";

const DATE_PRESETS = [
  { id: "week", label: "Semana" },
  { id: "fortnight", label: "Quincena" },
  { id: "month", label: "Mes" },
];

const STOCK_LEVEL_META = {
  [STOCK_LEVEL.LOW]: {
    rowClassName: styles.rowLow,
    badgeClassName: styles.legendLow,
    label: "Bajo mínimo",
    description:
      "El stock de la sucursal es igual o menor al mínimo configurado. Conviene reabastecerla.",
  },
  [STOCK_LEVEL.HIGH]: {
    rowClassName: styles.rowHigh,
    badgeClassName: styles.legendHigh,
    label: "Sobre máximo",
    description:
      "El stock de la sucursal supera el máximo configurado. No necesita más producto.",
  },
};

const LEGEND_LEVELS = [STOCK_LEVEL.LOW, STOCK_LEVEL.HIGH];

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
              <th className={styles.numeric}>Máximo</th>
              <th className={styles.numeric}>Ventas</th>
              <th className={styles.numeric}>Canjes</th>
              <th className={styles.numeric}>Importe</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const levelMeta = STOCK_LEVEL_META[row.stockLevel];

              return (
                <tr
                  key={row.branchId}
                  className={levelMeta?.rowClassName}
                  title={levelMeta?.label}
                >
                  <td>
                    <span className={styles.branchBadge}>
                      {toUpperLabel(row.branchName)}
                    </span>
                  </td>
                  <td className={joinClasses(styles.numeric, styles.stockCell)}>
                    {formatQuantity(row.stock)}
                  </td>
                  <td className={styles.numeric}>
                    {formatQuantity(row.minStock)}
                  </td>
                  <td className={styles.numeric}>
                    {formatQuantity(row.maxStock)}
                  </td>
                  <td className={styles.numeric}>
                    {formatQuantity(row.unitsSold)}
                  </td>
                  <td className={styles.numeric}>
                    {formatQuantity(row.redeemedUnits)}
                  </td>
                  <td className={styles.numeric}>
                    {formatCurrency(row.revenue)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              <td className={styles.numeric}>{formatQuantity(totals.stock)}</td>
              <td />
              <td />
              <td className={styles.numeric}>
                {formatQuantity(totals.unitsSold)}
              </td>
              <td className={styles.numeric}>
                {formatQuantity(totals.redeemedUnits)}
              </td>
              <td className={styles.numeric}>
                {formatCurrency(totals.revenue)}
              </td>
            </tr>
          </tfoot>
        </table>
        <ul className={styles.legend} aria-label="Significado de los colores">
          {LEGEND_LEVELS.map((level) => {
            const meta = STOCK_LEVEL_META[level];

            return (
              <li key={level} className={styles.legendItem}>
                <span
                  className={joinClasses(
                    styles.legendBadge,
                    meta.badgeClassName
                  )}
                >
                  {meta.label}
                </span>
                <span className={styles.legendText}>{meta.description}</span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <AppModal
      isOpen={Boolean(product)}
      title="Detalle del producto"
      confirmText="Cerrar"
      onConfirm={onClose}
      onClose={onClose}
      size="large"
    >
      {product ? (
        <div className={styles.content}>
          <header className={styles.productHeader}>
            <span className={styles.productLabel}>Producto</span>
            <h3 className={styles.productName}>{product.productName}</h3>
            <span className={styles.productCodeChip}>
              <span className={styles.productCodeLabel}>Código</span>
              <span className={styles.productCodeValue}>
                {product.barcode || "—"}
              </span>
            </span>
          </header>

          <div className={styles.filters}>
            <div
              className={styles.quickActions}
              role="group"
              aria-label="Periodo rápido"
            >
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

            <div
              className={styles.dateRange}
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
                  portalId={CALENDAR_PORTAL_ID}
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
                  portalId={CALENDAR_PORTAL_ID}
                  showPopperArrow={false}
                  placeholderText="dd/mm/aaaa"
                  aria-label="Hasta"
                />
              </label>
            </div>
          </div>

          {renderBody()}
        </div>
      ) : null}
    </AppModal>
  );
};

export default ProductInsightsModal;
