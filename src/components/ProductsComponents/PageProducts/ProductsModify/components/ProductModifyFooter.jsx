import styles from "../ProductsModify.module.css";

const ProductModifyFooter = ({
  saving,
  isFormValid,
  loadingDiscount,
  appModalIsOpen,
  handleSave,
  handleClearAndReset,
}) => {
  return (
    <div className={styles.bodyFooter}>
      <button
        className={styles.cancelButton}
        type="button"
        onClick={handleClearAndReset}
        disabled={saving || appModalIsOpen}
      >
        Cancelar
      </button>

      <button
        className={styles.saveButton}
        type="button"
        onClick={handleSave}
        disabled={!isFormValid || saving || loadingDiscount || appModalIsOpen}
      >
        {saving ? "Guardando..." : "Guardar"}
      </button>
    </div>
  );
};

export default ProductModifyFooter;
