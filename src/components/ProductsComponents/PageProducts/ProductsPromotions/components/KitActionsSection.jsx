import saveIcon from "../../../../../assets/icons/circle-check-solid-full.svg";
import clearIcon from "../../../../../assets/icons/deleteIcon.svg";
import removeIcon from "../../../../../assets/icons/xmark-solid-full.svg";
import styles from "../ProductsPromotions.module.css";

const KitActionsSection = ({
  handleSaveKit,
  saving,
  isFormComplete,
  missingFields,
  editingKit,
  handleClearForm,
  handleCancelEdit,
  removeSelectedProduct,
  selectedProductId,
}) => {
  return (
    <div className={styles.actionsSection}>
      <div className={styles.leftButtons}>
        <button
          type="button"
          className={[styles.btn, styles.btnSave, styles.btnSaveWide].join(" ")}
          onClick={handleSaveKit}
          disabled={saving || !isFormComplete}
        >
          <img src={saveIcon} alt="" className={styles.btnIcon} />
          {saving
            ? "Guardando..."
            : editingKit
              ? "Actualizar kit"
              : "Guardar kit"}
        </button>

        <button
          type="button"
          className={[styles.btn, styles.btnDelete].join(" ")}
          onClick={handleClearForm}
          disabled={saving}
        >
          <img src={clearIcon} alt="" className={styles.btnIcon} />
          Limpiar
        </button>

        {editingKit && (
          <button
            type="button"
            className={[styles.btn, styles.btnCancel].join(" ")}
            onClick={handleCancelEdit}
            disabled={saving}
          >
            <img src={removeIcon} alt="" className={styles.btnIcon} />
            Cancelar
          </button>
        )}
      </div>

      <div className={styles.rightButtons}>
        <button
          type="button"
          className={[styles.btn, styles.btnRemove].join(" ")}
          onClick={removeSelectedProduct}
          disabled={!selectedProductId}
        >
          <img src={removeIcon} alt="" className={styles.btnIcon} />
          Remover seleccionado
        </button>
      </div>

      {!isFormComplete && missingFields.length > 0 && (
        <div className={styles.missingFieldsHint} role="status">
          <span>Falta:</span>
          <ul className={styles.missingFieldsList}>
            {missingFields.map((field) => (
              <li key={field} className={styles.missingFieldBadge}>
                {field}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default KitActionsSection;
