import saveIcon from "../../../../../assets/icons/circle-check-solid-full.svg";
import clearIcon from "../../../../../assets/icons/deleteIcon.svg";
import removeIcon from "../../../../../assets/icons/xmark-solid-full.svg";
import styles from "../ProductsPromotions.module.css";

const KitActionsSection = ({
  handleSaveKit,
  saving,
  editingKit,
  handleClearForm,
  removeSelectedProduct,
  selectedProductId,
}) => {
  return (
    <div className={styles.actionsSection}>
      <div className={styles.leftButtons}>
        <button
          type="button"
          className={[styles.btn, styles.btnSave].join(" ")}
          onClick={handleSaveKit}
          disabled={saving}
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
    </div>
  );
};

export default KitActionsSection;
