import { useId } from "react";

import styles from "./ProductSearchDialog.module.css";

/**
 * Estructura compartida de los buscadores de productos: overlay, dialogo con
 * titulo, campo de busqueda, cabecera de resultados y pie con Seleccionar y
 * Cerrar. Cada modal aporta su hook de busqueda y su lista de resultados como
 * children.
 */
const ProductSearchDialog = ({
  searchTerm,
  onSearchChange,
  placeholder,
  resultsCount,
  selectLabel = "Seleccionar",
  selectDisabled,
  onSelect,
  onClose,
  children,
}) => {
  const titleId = useId();
  const inputId = useId();

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.searchModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h2 id={titleId}>Búsqueda de Productos</h2>
        </div>

        <div className={styles.searchModalBody}>
          <div className={styles.searchSection}>
            <label htmlFor={inputId}>Nombre / Código / Departamento:</label>

            <div className={styles.inputContainer}>
              <input
                id={inputId}
                type="text"
                className={styles.searchInput}
                value={searchTerm}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={placeholder}
                autoFocus
              />
            </div>

            <div className={styles.searchHelp}>
              <span>↑↓ Navegar • Enter - Seleccionar • ESC - Cerrar</span>
            </div>
          </div>

          <div className={styles.resultsSection}>
            <div className={styles.resultsHeader}>
              <span>Resultados:</span>

              {resultsCount > 0 && (
                <span className={styles.resultsCount}>
                  {resultsCount} producto(s)
                </span>
              )}
            </div>

            <div className={styles.resultsContainer}>{children}</div>
          </div>
        </div>

        <div className={styles.modalActions}>
          <div className={styles.actionButtons}>
            <button
              type="button"
              className={`${styles.actionButton} ${styles.selectButton}`}
              onClick={onSelect}
              disabled={selectDisabled}
            >
              {selectLabel}
            </button>

            <button
              type="button"
              className={`${styles.actionButton} ${styles.cancelButton}`}
              onClick={onClose}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductSearchDialog;
