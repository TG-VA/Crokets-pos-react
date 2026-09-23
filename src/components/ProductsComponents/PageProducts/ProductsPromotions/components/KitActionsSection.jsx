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
          Remover seleccionado
        </button>
      </div>
    </div>
  );
};

export default KitActionsSection;
