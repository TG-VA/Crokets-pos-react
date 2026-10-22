import React, { useState } from "react";

import InventorySearchModal from "../../../Modals/InventorySearchModal/InventorySearchModal";
import styles from "../PageOrders.module.css";
import { formatCurrency, formatQuantity } from "../utils/ordersFormatters";
import SearchIcon from "../../../../../assets/icons/searchIcon.svg";
import PlusIcon from "../../../../../assets/icons/plus-solid-full.svg";
import TrashIcon from "../../../../../assets/icons/deleteIcon.svg";
import PrintIcon from "../../../../../assets/icons/print-solid-full.svg";
import SaveIcon from "../../../../../assets/icons/circle-check-solid-full.svg";
import BoxIcon from "../../../../../assets/icons/box-solid-full.svg";

const CreateOrderWorkspace = ({ form, products = [], onSave, onCancel }) => {
  const [code, setCode] = useState("");

  const handleCodeSubmit = (event) => {
    event.preventDefault();

    if (form.handleCodeSubmit(code)) {
      setCode("");
    }
  };

  const handleSave = async () => {
    await onSave?.();
  };

  return (
    <section
      className={styles.workspace}
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
            Selecciona la sucursal destino y las partidas. El folio se genera al
            guardar el pedido.
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
              placeholder="Ej. Reposicion semanal"
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
              <span>Agregar por codigo de barras</span>
              <input
                type="text"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="Escanea o escribe el codigo"
                disabled={form.isSaving}
              />
            </label>
            <button
              type="submit"
              className={styles.secondaryButton}
              disabled={!code.trim() || form.isSaving}
            >
              <img src={PlusIcon} alt="" aria-hidden="true" />
              Agregar
            </button>
          </form>

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => form.setSearchOpen(true)}
            disabled={form.isSaving}
          >
            <img src={SearchIcon} alt="" aria-hidden="true" />
            Buscar productos
          </button>
        </div>

        {form.items.length === 0 ? (
          <div className={styles.emptyState}>
            <img src={BoxIcon} alt="" aria-hidden="true" />
            <h3>Sin partidas en el pedido</h3>
            <p>Busca productos o captura un codigo para agregarlos.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.itemsTable}>
              <thead>
                <tr>
                  <th>Codigo</th>
                  <th>Producto</th>
                  <th>Departamento</th>
                  <th className={styles.numeric}>Costo</th>
                  <th className={styles.numeric}>Cantidad</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {form.items.map((item) => (
                  <tr key={item.productId}>
                    <td>{item.barcode || "—"}</td>
                    <td className={styles.productNameCell}>
                      {item.productName}
                    </td>
                    <td>{item.departmentName}</td>
                    <td className={styles.numeric}>
                      {formatCurrency(item.costPrice)}
                    </td>
                    <td className={styles.numeric}>
                      <input
                        type="text"
                        inputMode="decimal"
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
                        className={styles.iconButton}
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

        <div className={styles.draftSummary}>
          <div>
            <span className={styles.metaLabel}>Departamentos</span>
            <strong>
              {form.departmentSummary.join(", ") || "Sin departamento"}
            </strong>
          </div>
          <div>
            <span className={styles.metaLabel}>Partidas</span>
            <strong>{form.items.length}</strong>
          </div>
          <div>
            <span className={styles.metaLabel}>Unidades</span>
            <strong>{formatQuantity(form.totalUnits)}</strong>
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
            className={styles.ghostButton}
            onClick={form.resetForm}
            disabled={form.isSaving}
          >
            Limpiar
          </button>

          <div className={styles.formActionsRight}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={form.printDraft}
              disabled={form.items.length === 0 || form.isSaving}
            >
              <img src={PrintIcon} alt="" aria-hidden="true" />
              Imprimir borrador
            </button>

            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleSave}
              disabled={!form.isValid || form.isSaving}
            >
              <img src={SaveIcon} alt="" aria-hidden="true" />
              {form.isSaving ? "Guardando..." : "Guardar pedido"}
            </button>
          </div>
        </footer>
      </div>

      <InventorySearchModal
        isOpen={form.searchOpen}
        onClose={() => form.setSearchOpen(false)}
        products={products}
        selectedProductIds={form.selectedProductIds}
        onSelect={form.addProduct}
      />
    </section>
  );
};

export default CreateOrderWorkspace;
