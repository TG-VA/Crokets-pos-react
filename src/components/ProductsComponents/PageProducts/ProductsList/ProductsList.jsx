import React from "react";
import styles from "./ProductsList.module.css";
import { useProductsList } from "./hooks/useProductsList";

const ProductsList = () => {
  const {
    products,
    loadingProducts,
    productsError,
    searchTerm,
    setSearchTerm,
    selectedDepartment,
    showDepartmentFilter,
    setShowDepartmentFilter,
    selectedRowIndex,
    tableContainerRef,
    filterRef,
    selectedRowRef,
    departments,
    filteredProducts,
    formatDept,
    handleDepartmentSelect,
    handleRowClick,
    clearFilters,
    formatMoney,
  } = useProductsList();

  if (loadingProducts) {
    return (
      <div className={styles.content}>
        <div className={styles.toolbar}>
          <h1>LISTA DE PRODUCTOS</h1>
        </div>
        <div className={styles.resultsInfo}>
          <span className={styles.resultsCount}>Cargando productos...</span>
        </div>
      </div>
    );
  }

  if (productsError) {
    return (
      <div className={styles.content}>
        <div className={styles.toolbar}>
          <h1>LISTA DE PRODUCTOS</h1>
        </div>
        <div className={styles.noResults}>
          Error al cargar productos: {productsError}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.content}>
      <div className={styles.toolbar}>
        <h1>LISTA DE PRODUCTOS</h1>

        <div className={styles.toolbarActions}>
          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder="Buscar por nombre o código..."
              className={styles.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setShowDepartmentFilter(false)}
            />
            {searchTerm && (
              <button
                className={styles.clearSearchButton}
                onClick={() => setSearchTerm("")}
                title="Limpiar búsqueda"
                type="button"
              >
                ✕
              </button>
            )}
          </div>

          <div className={styles.filterContainer} ref={filterRef}>
            <button
              className={[
                styles.filterButton,
                selectedDepartment ? styles.filterButtonActive : "",
                showDepartmentFilter ? styles.filterButtonOpen : ""
              ].filter(Boolean).join(" ")}
              onClick={() => setShowDepartmentFilter((prev) => !prev)}
              type="button"
            >
              <span className={styles.filterButtonLabel}>
                {selectedDepartment
                  ? formatDept(selectedDepartment)
                  : "Departamentos"}
              </span>
              <span className={styles.filterArrow}>▾</span>
            </button>

            {showDepartmentFilter && (
              <div className={styles.filterDropdown}>
                <div
                  className={[
                    styles.filterOption,
                    !selectedDepartment ? styles.filterOptionSelected : ""
                  ].filter(Boolean).join(" ")}
                  onClick={() => handleDepartmentSelect("")}
                >
                  Todo
                </div>
                {departments.map((dept) => (
                  <div
                    key={dept}
                    className={[
                      styles.filterOption,
                      selectedDepartment === dept ? styles.filterOptionSelected : ""
                    ].filter(Boolean).join(" ")}
                    onClick={() => handleDepartmentSelect(dept)}
                  >
                    {formatDept(dept)}
                  </div>
                ))}
              </div>
            )}
          </div>

          {(searchTerm || selectedDepartment) && (
            <button
              className={styles.clearFiltersButton}
              onClick={clearFilters}
              type="button"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      <div className={styles.resultsInfo}>
        {filteredProducts.length === 0 ? (
          <span className={styles.noResultsText}>
            No se encontraron productos
          </span>
        ) : (
          <span className={styles.resultsCount}>
            Mostrando {filteredProducts.length} de {products.length} productos
            {selectedDepartment &&
              ` en ${formatDept(selectedDepartment).toUpperCase()}`}
          </span>
        )}
      </div>

      <div className={styles.productsContainer} ref={tableContainerRef}>
        <table className={styles.productsTable}>
          <thead>
            <tr>
              <th>Código</th>
              <th>Descripción producto</th>
              <th>Departamento</th>
              <th>Costo</th>
              <th>Precio</th>
            </tr>
          </thead>

          <tbody>
            {filteredProducts.map((product, index) => (
              <tr
                key={`${product.product_id || product.id || product.codigo}-${index}`}
                ref={index === selectedRowIndex ? selectedRowRef : null}
                className={[
                  styles.productRow,
                  index === selectedRowIndex ? styles.selectedRow : ""
                ].filter(Boolean).join(" ")}
                onClick={() => handleRowClick(index)}
              >
                <td>{product.codigo}</td>
                <td className={styles.descriptionCell}>
                  <span className={styles.scrollText}>
                    {product.descripcion}
                  </span>
                </td>
                <td className={styles.departmentCell}>
                  {product.departamento}
                </td>
                <td className={styles.priceCell}>
                  {formatMoney(product.costo)}
                </td>
                <td className={styles.priceCell}>
                  {formatMoney(product.precio)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredProducts.length === 0 && (
          <div className={styles.noResults}>
            No se encontraron productos que coincidan con los criterios de
            búsqueda.
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductsList;