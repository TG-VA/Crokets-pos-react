import searchIcon from "../../../../../assets/icons/searchIcon.svg";
import styles from "../ProductsPromotions.module.css";
import {
  sanitizeDecimalInput,
  sanitizeIntegerInput,
} from "../services/kitInputSanitizers";

const KitFormSection = ({
  form,
  updateField,
  barcodeInputRef,
  selectedProductsTotal,
  kitPrice,
  kitDiscount,
  kitDiscountPercent,
  onOpenSearch,
}) => {
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
