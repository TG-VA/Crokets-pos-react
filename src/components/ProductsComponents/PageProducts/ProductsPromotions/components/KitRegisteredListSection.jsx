import styles from "../ProductsPromotions.module.css";

const KitRegisteredListSection = ({
  kits,
  editingKit,
  handleEditKit,
  handleToggleKitStatus,
  handleSoftDeleteKit,
}) => {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>Kits registrados</div>

      <div className={styles.cardContent}>
        {kits.length === 0 ? (
          <div className={styles.emptyState}>No hay kits registrados</div>
        ) : (
          <div className={styles.kitsList}>
            {kits.map((kit) => (
              <div
                key={kit.id}
                className={[
                  styles.kitRow,
                  editingKit?.id === kit.id ? styles.selectedProductItem : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div>
                  <strong>{kit.products?.name || "KIT"}</strong>
                  <div className={styles.productMeta}>
                    Código: {kit.products?.barcode || "Sin código"} · Precio: $
                    {Number(kit.products?.sale_price || 0).toFixed(2)}
                  </div>
                </div>

                <span
                  className={[
                    styles.kitStatus,
                    kit.is_active
                      ? styles.kitStatusActive
                      : styles.kitStatusInactive,
                  ].join(" ")}
                >
                  {kit.is_active ? "Activo" : "Inactivo"}
                </span>

                <div className={styles.kitActions}>
                  <button
                    type="button"
                    className={[styles.btn, styles.btnSave].join(" ")}
                    onClick={() => handleEditKit(kit)}
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    className={[
                      styles.btn,
                      kit.is_active ? styles.btnDelete : styles.btnSave,
                    ].join(" ")}
                    onClick={() => handleToggleKitStatus(kit)}
                  >
                    {kit.is_active ? "Desactivar" : "Activar"}
                  </button>

                  <button
                    type="button"
                    className={[styles.btn, styles.btnRemove].join(" ")}
                    onClick={() => handleSoftDeleteKit(kit)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default KitRegisteredListSection;
