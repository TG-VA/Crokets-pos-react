import { useMemo, useState } from "react";

import InventorySearchModal from "../../../Modals/InventorySearchModal/InventorySearchModal";
import ProductInsightsModal from "./ProductInsightsModal";
import {
  isGlobalProduct,
  isKitProduct,
} from "../../../../../services/inventory/inventoryProductCalculationService";
import styles from "../PageOrders.module.css";
import { formatCurrency, formatQuantity } from "../utils/ordersFormatters";
import { useLocalProductsCatalog } from "../hooks/useLocalProductsCatalog";
import { usePagination } from "../../../../../hooks/usePagination";
import PaginationBar from "../../../../PaginationBar/PaginationBar";
import SearchIcon from "../../../../../assets/icons/searchIcon.svg";
import PlusIcon from "../../../../../assets/icons/plus-solid-full.svg";
import TrashIcon from "../../../../../assets/icons/deleteIcon.svg";
import SaveIcon from "../../../../../assets/icons/circle-check-solid-full.svg";
import BoxIcon from "../../../../../assets/icons/box-solid-full.svg";

const CreateOrderWorkspace = ({ form, products = [], onSave }) => {
  const [code, setCode] = useState("");
  const [insightsProduct, setInsightsProduct] = useState(null);

  const { localProducts, reload: reloadLocalProducts } =
    useLocalProductsCatalog();

  const destinationBranchName = form.destinationOptions.find(
    (branchOption) => branchOption.id === form.destinationBranchId
  )?.name;
  const hasDestination = Boolean(form.destinationBranchId);

  // El pedido solo mueve productos globales que no sean kits; los locales se
  // listan para que se vea a que sucursal pertenecen, pero no se pueden
  // seleccionar.
  const searchableProducts = useMemo(
    () => [
      ...products.filter(
        (product) => isGlobalProduct(product) && !isKitProduct(product)
      ),
      ...localProducts,
    ],
    [products, localProducts]
  );

  const handleCodeSubmit = (event) => {
    event.preventDefault();

    if (!hasDestination) return;

    if (form.handleCodeSubmit(code)) {
      setCode("");
    }
  };

  const handleSave = async () => {
    await onSave?.();
  };

  const {
    currentPage,
    totalPages,
    pageSize,
    startIndex,
    endIndex,
    pageItems,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination({
    totalItems: form.items.length,
    defaultPageSize: 10,
    pageSizeOptions: [5, 10, 25, 50],
    storageKey: "crokets_create_order_page_size",
  });

  const paginatedItems = pageItems(form.items);

  return (
    <section
      className={`${styles.workspace} ${styles.createWorkspace}`}
      role="tabpanel"
      id="panel-create"
      aria-labelledby="tab-create"
      tabIndex={0}
    >
      <header className={styles.workspaceHeader}>
        <div>
          <p className={styles.eyebrow}>Nuevo pedido</p>
          <h2 className={styles.workspaceTitle}>
            Crear pedido de abastecimiento
          </h2>
          <p className={styles.workspaceDescription}>
            Selecciona la sucursal destino y los productos. El folio se genera
            al guardar el pedido.
          </p>
        </div>
      </header>

      <div className={styles.createForm}>
        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span>Nombre del pedido</span>
            <input
              type="text"
              value={form.orderName}
              onChange={(event) => form.setOrderName(event.target.value)}
              placeholder="Ej. REPOSICIÓN SEMANAL"
              maxLength={160}
              disabled={form.isSaving}
            />
          </label>

          <label className={styles.field}>
            <span>Sucursal destino</span>
            <select
              value={form.destinationBranchId}
              onChange={(event) =>
                form.setDestinationBranchId(event.target.value)
              }
              disabled={form.isSaving}
            >
              <option value="">Selecciona una sucursal</option>
              {form.destinationOptions.map((branchOption) => (
                <option key={branchOption.id} value={branchOption.id}>
                  {branchOption.name}
                </option>
              ))}
            </select>
          </label>

          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span>Instrucciones de entrega y observaciones del pedido</span>
            <textarea
              value={form.notes}
              onChange={(event) => form.setNotes(event.target.value)}
              placeholder="Referencias de entrega, horarios o indicaciones."
              rows={3}
              disabled={form.isSaving}
            />
          </label>
        </div>

        <div className={styles.productPicker}>
          <form className={styles.codeForm} onSubmit={handleCodeSubmit}>
            <label className={styles.field}>
              <span className={styles.fieldLabelRow}>
                <span>Agregar por código de barras</span>
                {hasDestination ? null : (
                  <span className={styles.fieldHint}>
                    Selecciona la sucursal destino para buscar productos
                  </span>
                )}
              </span>
              <input
                type="text"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="Escanea o escribe el código"
                autoComplete="off"
                disabled={form.isSaving || !hasDestination}
              />
            </label>
            <button
              type="submit"
              className={styles.secondaryButton}
              disabled={!code.trim() || form.isSaving || !hasDestination}
            >
              <img src={PlusIcon} alt="" aria-hidden="true" />
              Agregar
            </button>
          </form>

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => form.setSearchOpen(true)}
            disabled={form.isSaving || !hasDestination}
            title={
              hasDestination
                ? undefined
                : "Selecciona primero la sucursal destino"
            }
          >
            <img src={SearchIcon} alt="" aria-hidden="true" />
            Buscar productos
          </button>
        </div>

        {form.items.length === 0 ? (
          <div className={styles.emptyState}>
            <img src={BoxIcon} alt="" aria-hidden="true" />
            <h3>Sin productos en el pedido</h3>
            <p>Busca productos o captura un código para agregarlos.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.itemsTable}>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Producto</th>
                  <th>Departamento</th>
                  <th className={styles.numeric}>Costo</th>
                  <th className={styles.numeric}>Cantidad</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((item) => (
                  <tr key={item.productId}>
                    <td>{item.barcode || "—"}</td>
                    <td className={styles.productNameCell}>
                      <button
                        type="button"
                        className={styles.productNameButton}
                        onClick={() => setInsightsProduct(item)}
                        aria-label={`Ver detalle de ${item.productName}`}
                      >
                        {item.productName}
                      </button>
                    </td>
                    <td>{item.departmentName}</td>
                    <td className={styles.numeric}>
                      {formatCurrency(item.costPrice)}
                    </td>
                    <td className={styles.numeric}>
                      <input
                        type="text"
                        inputMode="numeric"
                        className={styles.quantityInput}
                        value={item.expectedQty}
                        onChange={(event) =>
                          form.updateQuantity(
                            item.productId,
                            event.target.value
                          )
                        }
                        aria-label={`Cantidad esperada de ${item.productName}`}
                        disabled={form.isSaving}
                      />
                    </td>
                    <td className={styles.rowActions}>
                      <button
                        type="button"
                        className={`${styles.iconButton} ${styles.deleteIconButton}`}
                        onClick={() => form.removeProduct(item.productId)}
                        aria-label={`Quitar ${item.productName}`}
                        disabled={form.isSaving}
                      >
                        <img src={TrashIcon} alt="" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {form.items.length > 0 && (
          <div className={styles.paginationFooter}>
            <PaginationBar
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              pageSizeOptions={[5, 10, 25, 50]}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              totalItems={form.items.length}
              startIndex={startIndex}
              endIndex={endIndex}
              itemsNoun="productos"
              labelMode="range"
            />
          </div>
        )}

        <div className={styles.draftSummary}>
          <div className={styles.draftSummaryDepts}>
            <span className={styles.metaLabel}>Departamentos</span>
            <div className={styles.deptBadges}>
              {form.departmentSummary.length > 0 ? (
                form.departmentSummary.map((dept) => (
                  <span key={dept} className={styles.deptBadge}>
                    {dept}
                  </span>
                ))
              ) : (
                <span className={styles.metaEmpty}>Sin departamento</span>
              )}
            </div>
          </div>
          <div className={styles.draftSummaryStats}>
            <div className={styles.statBadge}>
              <span className={styles.metaLabel}>Productos</span>
              <strong className={styles.statValue}>{form.items.length}</strong>
            </div>
            <div className={styles.statBadge}>
              <span className={styles.metaLabel}>Unidades totales</span>
              <strong className={styles.statValue}>
                {formatQuantity(form.totalUnits)}
              </strong>
            </div>
            <div className={styles.statBadge}>
              <span className={styles.metaLabel}>Costo total</span>
              <strong className={styles.statValue}>
                {formatCurrency(form.totalCost || 0)}
              </strong>
            </div>
          </div>
        </div>

        {form.error ? (
          <p className={styles.inlineError} role="alert">
            {form.error}
          </p>
        ) : null}

        <footer className={styles.formActions}>
          <button
            type="button"
            className={styles.saveOrderButton}
            onClick={handleSave}
            disabled={!form.isValid || form.isSaving}
          >
            <img src={SaveIcon} alt="" aria-hidden="true" />
            {form.isSaving ? "Guardando pedido..." : "Guardar pedido"}
          </button>
        </footer>
      </div>

      <InventorySearchModal
        isOpen={form.searchOpen}
        onClose={() => form.setSearchOpen(false)}
        products={searchableProducts}
        selectedProductIds={form.selectedProductIds}
        onSelect={form.addProduct}
        restrictLocalProducts
        onProductPromoted={reloadLocalProducts}
      />

      <ProductInsightsModal
        product={insightsProduct}
        destinationBranchName={destinationBranchName}
        onClose={() => setInsightsProduct(null)}
      />
    </section>
  );
};

export default CreateOrderWorkspace;
