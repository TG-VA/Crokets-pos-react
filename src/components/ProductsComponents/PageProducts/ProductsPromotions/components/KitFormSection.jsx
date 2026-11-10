import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import searchIcon from "../../../../../assets/icons/searchIcon.svg";
import { KIT_MARGIN_WARNING } from "../services/kitMarginCalculationService";
import styles from "../ProductsPromotions.module.css";
import {
  sanitizeDecimalInput,
  sanitizeIntegerInput,
} from "../services/kitInputSanitizers";
import { formatDateOnly, parseDateOnly } from "../services/kitDateFormatters";
import {
  getMinKitEndDate,
  getTodayInTimezone,
} from "../services/kitValidityCalculationService";

const VALIDITY_FIELDS = [
  {
    field: "starts_on",
    flag: "no_starts_on",
    label: "Vigente desde",
    range: "selectsStart",
  },
  {
    field: "ends_on",
    flag: "no_ends_on",
    label: "Vigente hasta",
    range: "selectsEnd",
  },
];

const MARGIN_WARNING_MESSAGES = {
  [KIT_MARGIN_WARNING.NO_DISCOUNT]:
    "El precio del kit no ofrece ahorro frente a la suma de sus productos.",
  [KIT_MARGIN_WARNING.BELOW_COST]:
    "El precio del kit es menor que el costo de sus productos (venta a pérdida).",
};

const KitFormSection = ({
  form,
  updateField,
  barcodeInputRef,
  selectedProductsTotal,
  kitPrice,
  kitDiscount,
  kitDiscountPercent,
  kitMarginWarning,
  onOpenSearch,
}) => {
  // La fecha de fin no se puede elegir en el pasado ni antes del inicio.
  const minEndDate = parseDateOnly(
    getMinKitEndDate(form.starts_on, getTodayInTimezone())
  );

  return (
    <div className={styles.formColumn}>
      <div className={styles.formRow}>
        <label className={styles.label}>Código de Barras</label>
        <input
          ref={barcodeInputRef}
          className={styles.input}
          type="text"
          placeholder="Código de barras del kit"
          value={form.barcode}
          onChange={(e) => updateField("barcode", e.target.value)}
        />
      </div>

      <div className={styles.formRow}>
        <label className={styles.label}>Descripción</label>
        <input
          className={styles.input}
          type="text"
          placeholder="Descripción del kit"
          value={form.description}
          onChange={(e) =>
            updateField("description", e.target.value.toUpperCase())
          }
        />
      </div>

      <div className={styles.formRow}>
        <label className={styles.label}>Precio kit</label>
        <input
          className={styles.input}
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={form.price}
          onChange={(e) =>
            updateField("price", sanitizeDecimalInput(e.target.value))
          }
        />
      </div>

      <div className={styles.formRow}>
        <label className={styles.label}>Límite por venta</label>
        <div className={styles.limitInputContainer}>
          <input
            className={styles.input}
            type="text"
            inputMode="numeric"
            placeholder="1"
            value={form.max_kits_per_sale}
            onChange={(e) =>
              updateField(
                "max_kits_per_sale",
                sanitizeIntegerInput(e.target.value)
              )
            }
          />
          <span className={styles.limitHelperText}>
            * El límite se aplica de forma individual para cada sucursal.
          </span>
        </div>
      </div>

      {VALIDITY_FIELDS.map(({ field, flag, label, range }, index) => (
        <div key={field} className={styles.formRow}>
          <label className={styles.label}>{label}</label>
          <div className={styles.limitInputContainer}>
            <DatePicker
              {...{ [range]: true }}
              selected={parseDateOnly(form[field])}
              onChange={(date) => updateField(field, formatDateOnly(date))}
              startDate={parseDateOnly(form.starts_on)}
              endDate={parseDateOnly(form.ends_on)}
              minDate={field === "ends_on" ? minEndDate : null}
              maxDate={
                field === "starts_on" ? parseDateOnly(form.ends_on) : null
              }
              dateFormat="dd/MM/yyyy"
              placeholderText="Sin límite"
              disabled={Boolean(form[flag])}
              isClearable
              className={styles.input}
              wrapperClassName={styles.datePickerWrapper}
              showPopperArrow={false}
            />
            <label className={styles.unlimitedCheck}>
              <input
                type="checkbox"
                className={styles.unlimitedInput}
                checked={Boolean(form[flag])}
                onChange={(e) => {
                  updateField(flag, e.target.checked);
                  if (e.target.checked) updateField(field, "");
                }}
              />
              <span className={styles.unlimitedBadge}>Sin fecha límite</span>
            </label>
            {index === VALIDITY_FIELDS.length - 1 && (
              <span className={styles.limitHelperText}>
                * Captura la fecha o marca Sin fecha límite. Ambas fechas son
                inclusivas y se evalúan con la zona horaria de la sucursal.
              </span>
            )}
          </div>
        </div>
      ))}

      <div className={styles.formRow}>
        <label className={styles.label}>Precio real</label>
        <div className={styles.summaryBox}>
          <strong>${selectedProductsTotal.toFixed(2)}</strong>

          {selectedProductsTotal > 0 && kitPrice > 0 && (
            <span>
              Ahorro: ${Math.max(kitDiscount, 0).toFixed(2)} /{" "}
              {Math.max(kitDiscountPercent, 0).toFixed(2)}%
            </span>
          )}

          {MARGIN_WARNING_MESSAGES[kitMarginWarning] && (
            <p className={styles.marginWarning} role="status">
              {MARGIN_WARNING_MESSAGES[kitMarginWarning]}
            </p>
          )}
        </div>
      </div>

      <div className={styles.searchProductRow}>
        <button
          type="button"
          className={[styles.btn, styles.btnSearch].join(" ")}
          onClick={onOpenSearch}
        >
          <img src={searchIcon} alt="" className={styles.btnIcon} />
          Buscar producto
        </button>
      </div>
    </div>
  );
};

export default KitFormSection;
