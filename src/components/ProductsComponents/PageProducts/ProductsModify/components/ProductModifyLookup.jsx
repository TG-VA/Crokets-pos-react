import styles from "../ProductsModify.module.css";

const ProductModifyLookup = ({ barcode, setBarcode, handleLookup }) => {
  return (
    <div className={styles.lookup}>
      <div className={styles.formRow}>
        <label className={styles.label}>Código de barras</label>

        <input
          className={styles.input}
          type="text"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleLookup();
            }
          }}
          autoFocus
          placeholder="Escanea el código o presiona F10 para buscar"
        />
      </div>
    </div>
  );
};

export default ProductModifyLookup;
